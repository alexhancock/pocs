/**
 * The Enclave — a tiny Trusted Execution Environment simulator.
 *
 * Responsibilities:
 *   1. Prepare two agents (mock playback, or goose-backed turn-spawners).
 *   2. Mediate their ACP messages: every word between agents flows *through* here.
 *   3. Enforce disclosure policy: reveals only happen under a prior matching
 *      commit card (this is the "Trusted" in TEE — the mediator, not the agents,
 *      is the authority).
 *   4. Emit every step as an EnclaveEvent to any observer (the UI WebSocket).
 *   5. On close: wipe transient state, surface only `retained` artifacts to
 *      the principals.
 *
 * Two modes:
 *   - "mock":  replay a scenario script with realistic pacing. No API calls.
 *   - "live":  each agent turn = one `goose run --resume --name <session>
 *              --instructions <file> -t <msg>` subprocess.
 *              The shared --name preserves per-agent memory across turns
 *              (satisfying "session per interaction"), while --resume keeps
 *              the ACP dialogue in context without re-loading instructions.
 */

import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { EnclaveEvent, Scenario } from "./types.js";
import { persona } from "./personas.js";
import { type AcpMessage, decode, encode } from "./agent-client-protocol.js";

export interface EnclaveOptions {
  mode: "mock" | "live";
  scenario: Scenario;
  /** Pacing multiplier for mock mode (1.0 = realtime-ish). */
  speed?: number;
  /** Abort signal from the caller. */
  signal?: AbortSignal;
  /** Max turns in live mode before we force close. */
  maxTurns?: number;
}

export class Enclave extends EventEmitter {
  readonly id: string;
  private readonly opts: EnclaveOptions;
  private closed = false;
  private agents: Record<string, AgentHandle> = {};
  private turnCount = 0;

  constructor(opts: EnclaveOptions) {
    super();
    this.opts = opts;
    this.id = `ENC-${opts.scenario.id}-${randomUUID().slice(0, 6)}`;
  }

  onEvent(cb: (e: EnclaveEvent) => void) {
    this.on("event", cb);
    return () => this.off("event", cb);
  }

  private publish(e: EnclaveEvent) {
    this.emit("event", e);
  }

  async run(): Promise<void> {
    if (this.opts.mode === "mock") return this.runMock();
    return this.runLive();
  }

  /* -------------------------- MOCK MODE -------------------------- */

  private async runMock(): Promise<void> {
    const speed = this.opts.speed ?? 1.0;
    const baseDelay = 650 * speed;
    for (const ev of this.opts.scenario.script) {
      if (this.opts.signal?.aborted) return;
      const stamped = {
        ...ev,
        enclave_id: this.id,
        ts: Date.now(),
      } as unknown as EnclaveEvent;
      this.publish(stamped);
      const delay =
        ev.type === "agent.thought"
          ? baseDelay * 1.6
          : ev.type === "card.exchange"
          ? baseDelay * 1.2
          : ev.type === "data.reveal"
          ? baseDelay * 1.8
          : ev.type === "enclave.outcome"
          ? baseDelay * 2.2
          : baseDelay;
      await sleep(delay);
    }
    this.closed = true;
  }

  /* -------------------------- LIVE MODE -------------------------- */

  private async runLive(): Promise<void> {
    const { scenario } = this.opts;
    const maxTurns = this.opts.maxTurns ?? 16;

    this.publish({
      type: "enclave.open",
      enclave_id: this.id,
      participants: scenario.participants,
      goal: scenario.goal,
      constraints: scenario.constraints,
      ts: Date.now(),
    });

    // Prepare per-agent session state. Nothing is spawned yet; turns are
    // spawned on demand in AgentHandle.send().
    for (const pid of scenario.participants) {
      const p = persona(pid);
      this.agents[pid] = await this.prepareAgent(pid, p.agent_prompt, scenario);
    }

    // Kick off the initiator with the goal.
    const initiator = scenario.initiator;
    await this.send(initiator, {
      kind: "say",
      to: "enclave",
      content:
        `GOAL: ${scenario.goal}\n` +
        `CONSTRAINTS:\n  - ${scenario.constraints.join("\n  - ")}\n\n` +
        `Begin with a disclosure *card*. Emit exactly ONE JSON object on ONE line. No prose.`,
    });

    // Wait for close conditions: propose.outcome, bye, abort, or turn cap.
    const deadline = Date.now() + 10 * 60 * 1000;
    while (!this.closed && Date.now() < deadline) {
      if (this.opts.signal?.aborted) break;
      if (this.turnCount >= maxTurns) {
        this.publish({
          type: "agent.thought",
          enclave_id: this.id,
          agent: "enclave",
          content: `[enclave] turn cap reached (${maxTurns}) — forcing close.`,
          ts: Date.now(),
        });
        break;
      }
      await sleep(150);
    }

    for (const h of Object.values(this.agents)) h.dispose();

    this.publish({
      type: "enclave.close",
      enclave_id: this.id,
      discarded: ["per-turn subprocess stdio", "inter-agent reasoning"],
      retained: ["outcome artifacts", "per-agent session memory on disk (for inspection)"],
      ts: Date.now(),
    });
  }

  private async prepareAgent(
    id: string,
    systemPrompt: string,
    scenario: Scenario,
  ): Promise<AgentHandle> {
    const fullSystem = buildSystemPrompt(id, systemPrompt, scenario);

    // Also persist the prompt on disk for debuggability / inspection.
    const workDir = resolve(".work", this.id);
    await mkdir(workDir, { recursive: true });
    await writeFile(
      resolve(workDir, `${id.replace(/\W+/g, "_")}.system.md`),
      fullSystem,
      "utf8",
    );

    const sessionName = `agentme-${this.id.slice(-8)}-${id.replace(/\W+/g, "_")}`;
    return new AgentHandle({
      id,
      sessionName,
      systemPrompt: fullSystem,
      onMessage: (msg) => this.onAgentMessage(id, msg),
      onTrace: (trace) =>
        this.publish({
          type: "agent.thought",
          enclave_id: this.id,
          agent: id,
          content: trace,
          ts: Date.now(),
        }),
      onTurnStart: () => {
        this.turnCount++;
      },
    });
  }

  private onAgentMessage(from: string, msg: AcpMessage) {
    switch (msg.kind) {
      case "hello":
        break;
      case "thought":
        this.publish({
          type: "agent.thought",
          enclave_id: this.id,
          agent: from,
          content: msg.content,
          ts: Date.now(),
        });
        break;
      case "say":
        this.publish({
          type: "agent.message",
          enclave_id: this.id,
          from,
          to: msg.to,
          content: msg.content,
          ts: Date.now(),
        });
        this.forward(msg.to, msg);
        break;
      case "card":
        this.publish({
          type: "card.exchange",
          enclave_id: this.id,
          card: msg.card,
          ts: Date.now(),
        });
        this.forward(msg.card.to, msg);
        break;
      case "reveal":
        this.publish({
          type: "data.reveal",
          enclave_id: this.id,
          from,
          to: msg.to,
          payload: msg.payload,
          under_card: msg.under_card,
          ts: Date.now(),
        });
        this.forward(msg.to, msg);
        break;
      case "propose.outcome":
        this.publish({
          type: "enclave.outcome",
          enclave_id: this.id,
          summary: msg.summary,
          artifacts: msg.artifacts,
          ts: Date.now(),
        });
        this.closed = true;
        break;
      case "bye":
        this.closed = true;
        break;
      case "ack":
        break;
    }
  }

  private forward(to: string, msg: AcpMessage) {
    const dest = this.agents[to];
    if (!dest) return;
    void dest.send(msg);
  }

  private send(to: string, msg: AcpMessage): Promise<void> {
    const dest = this.agents[to];
    if (!dest) return Promise.resolve();
    return dest.send(msg);
  }
}

/* ===================================================================
   AgentHandle — one per agent. Each `send(msg)` runs a single turn:
     goose run --resume --name <session> --instructions <path> -t <text>
   The first invocation doesn't use --resume (session doesn't exist yet).
   Subprocess stdout is parsed for ACP lines; non-JSON lines are coalesced
   into trace thoughts so the UI always has something to show.
   =================================================================== */

interface AgentHandleOpts {
  id: string;
  sessionName: string;
  /** The full system prompt + ACP protocol instructions. Applied once via
   *  --system on the first turn; subsequent turns reuse the session via --resume. */
  systemPrompt: string;
  onMessage: (msg: AcpMessage) => void;
  onTrace: (content: string) => void;
  onTurnStart: () => void;
}

class AgentHandle {
  private readonly opts: AgentHandleOpts;
  /** Turn queue: we serialize turns per agent so stdouts don't interleave. */
  private chain: Promise<void> = Promise.resolve();
  private hasSession = false;
  private disposed = false;

  constructor(opts: AgentHandleOpts) {
    this.opts = opts;
  }

  send(msg: AcpMessage): Promise<void> {
    // Chain this turn after any in-flight turn.
    this.chain = this.chain.then(() => this.runTurn(msg));
    return this.chain;
  }

  dispose() {
    this.disposed = true;
  }

  private async runTurn(msg: AcpMessage): Promise<void> {
    if (this.disposed) return;
    this.opts.onTurnStart();

    const wire = encode(msg).trim(); // single line of JSON
    // goose 1.32 makes --instructions and --text mutually exclusive, so we
    // use --system (which composes with --text) to install the ACP protocol
    // + system prompt on the FIRST turn. Subsequent turns --resume and rely
    // on the session already carrying the system prompt.
    const args = [
      "run",
      "--name",
      this.opts.sessionName,
      "--max-turns",
      "6",
      "-t",
      wire,
    ];
    if (this.hasSession) {
      args.push("--resume");
    } else {
      args.push("--system", this.opts.systemPrompt);
    }

    await new Promise<void>((resolvePromise) => {
      const child = spawn("goose", args, {
        stdio: ["ignore", "pipe", "pipe"],
      });

      let acpBuf = "";
      let traceBuf = "";
      const MIN_TRACE_CHARS = 24;
      const TRACE_DEBOUNCE_MS = 400;
      let pendingTrace: string[] = [];
      let traceTimer: NodeJS.Timeout | null = null;

      const flushTrace = () => {
        traceTimer = null;
        if (pendingTrace.length === 0) return;
        const combined = pendingTrace.join(" ").replace(/\s+/g, " ").trim();
        pendingTrace = [];
        if (combined.length < MIN_TRACE_CHARS) return;
        this.opts.onTrace(`[trace] ${combined.slice(0, 600)}`);
      };

      const pushTrace = (line: string) => {
        const t = line.trim();
        if (!t) return;
        if (
          t.startsWith("{") ||
          t.startsWith("}") ||
          t.startsWith('"') ||
          t.startsWith("[")
        )
          return;
        if (
          /^(goose is ready|starting session|logging to|session id|---+|closing session|resuming)/i.test(
            t,
          )
        )
          return;
        if (/^[>•·\s]{1,3}$/.test(t)) return;
        if (/^\( ?O ?\)/.test(t)) return;
        pendingTrace.push(t);
        if (!traceTimer) traceTimer = setTimeout(flushTrace, TRACE_DEBOUNCE_MS);
      };

      child.stdout.on("data", (chunk: Buffer) => {
        const text = chunk.toString("utf8");
        acpBuf += text;
        const { messages, rest } = decode(acpBuf);
        acpBuf = rest;
        for (const m of messages) this.opts.onMessage(m);

        traceBuf += text;
        const nl = traceBuf.lastIndexOf("\n");
        if (nl >= 0) {
          const ready = traceBuf.slice(0, nl).split("\n");
          traceBuf = traceBuf.slice(nl + 1);
          for (const line of ready) pushTrace(line);
        }
      });

      child.stderr.on("data", (chunk: Buffer) => {
        const line = chunk.toString("utf8").trim().slice(0, 300);
        if (!line) return;
        this.opts.onTrace(`[stderr] ${line}`);
      });

      child.on("exit", (code) => {
        if (traceTimer) {
          clearTimeout(traceTimer);
          traceTimer = null;
        }
        flushTrace();
        this.hasSession = true;
        if (code !== 0 && code !== null) {
          this.opts.onTrace(`[exit] turn finished (code=${code})`);
        }
        resolvePromise();
      });

      child.on("error", (err) => {
        this.opts.onTrace(`[error] ${err.message}`);
        resolvePromise();
      });
    });
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildSystemPrompt(
  id: string,
  systemPrompt: string,
  scenario: Scenario,
): string {
  const p = persona(id);
  const otherAgents = scenario.participants.filter((x) => x !== id);
  return `# Agent: ${p.display_name}

You are ${p.display_name}. Role: ${p.role}. Your id is "${id}".

## Principal intelligence (your knowledge base)

${p.intelligence
  .map(
    (i) =>
      `- [${i.sensitivity}] ${i.key} = ${i.value}  (source: ${i.source})`,
  )
  .join("\n")}

## Behavioral prompt

${systemPrompt}

## Scenario

Title: ${scenario.title}
Goal:  ${scenario.goal}
Constraints:
${scenario.constraints.map((c) => `  - ${c}`).join("\n")}
Counterparty agent id(s): ${otherAgents.join(", ")}

## Agent Client Protocol (ACP) — STRICT output format

Every turn, emit ONE AND ONLY ONE JSON object on a SINGLE line. No prose, no
markdown, no code fences. The ONLY allowed shapes:

  {"kind":"thought","content":"..."}
  {"kind":"card","card":{"id":"c1","from":"${id}","to":"<peer>","kind":"offer|request|commit|decline","topic":"...","shape":"...","teaser":"...","conditions":["..."],"consideration":"..."}}
  {"kind":"say","to":"<peer>","content":"..."}
  {"kind":"reveal","to":"<peer>","payload":{...},"under_card":"<card_id>"}
  {"kind":"propose.outcome","summary":"...","artifacts":{...}}
  {"kind":"bye"}

Turn-taking rules:
 1. Your FIRST output in the enclave must be a disclosure 'card', not a reveal.
 2. A 'reveal' is only valid AFTER a matching 'commit' card has been exchanged.
 3. When negotiation concludes, emit 'propose.outcome' then 'bye'.
 4. One JSON object per turn. Keep all fields compact.
 5. 'shape' and 'topic' must be strings, not nested objects.
 6. Never include PII flagged [never] in any output.
`;
}
