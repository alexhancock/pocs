#!/usr/bin/env tsx
/**
 * Run a scenario headlessly and print the event stream to stdout.
 * Usage:
 *   tsx src/cli/run-scenario.ts <scenario-id> [--live] [--speed=0.5] [--quiet]
 *
 * Flags:
 *   --live   : spawn real goose subprocesses (default: mock / rehearsal)
 *   --quiet  : suppress noisy [trace]/[stderr] lines (default: show, but dim)
 */
import { Enclave } from "../enclave.js";
import { scenarios } from "../scenarios.js";

const id = process.argv[2];
if (!id || !scenarios[id]) {
  console.error(
    `usage: run-scenario <id>\navailable: ${Object.keys(scenarios).join(", ")}`,
  );
  process.exit(1);
}

const live = process.argv.includes("--live");
const quiet = process.argv.includes("--quiet");
const speedArg = process.argv.find((a) => a.startsWith("--speed="));
const speed = speedArg ? Number(speedArg.split("=")[1]) : 0.35;

// ---------- ANSI palette ----------
const useColor = process.stdout.isTTY;
const c = (code: string) => (s: string) =>
  useColor ? `\x1b[${code}m${s}\x1b[0m` : s;
const dim     = c("2;37");
const bold    = c("1");
const olive   = c("38;5;143");
const brass   = c("38;5;179");
const oxblood = c("38;5;167");
const sage    = c("38;5;108");
const cyan    = c("38;5;74");
const pale    = c("38;5;230");
const hr      = (ch = "─") => dim(ch.repeat(Math.min(process.stdout.columns ?? 80, 80)));

const kindStyle: Record<string, (s: string) => string> = {
  offer:   olive,
  request: oxblood,
  commit:  (s) => bold(brass(s)),
  decline: dim,
};

const str = (v: unknown, max = 400): string => {
  if (v == null) return "";
  if (typeof v === "string") return v.length > max ? v.slice(0, max) + "…" : v;
  const j = JSON.stringify(v, null, 2);
  return j.length > max ? j.slice(0, max) + "…" : j;
};

const indent = (text: string, pad = "   ") =>
  text.split("\n").map((l) => pad + l).join("\n");

// ---------- run ----------
const enc = new Enclave({
  mode: live ? "live" : "mock",
  scenario: scenarios[id],
  speed,
});

console.log();
console.log(hr("═"));
console.log(
  `  ${bold(pale("agent.me"))}   ${dim("·")}   ${brass(scenarios[id].title)}   ${dim("·")}   ${live ? oxblood("● LIVE") : sage("rehearsal")}`,
);
console.log(hr("═"));

enc.onEvent((ev) => {
  switch (ev.type) {
    case "enclave.open":
      console.log();
      console.log(`${brass("🔐 ENCLAVE OPEN")}  ${dim(ev.enclave_id)}`);
      console.log(`   ${dim("goal     :")} ${pale(ev.goal)}`);
      console.log(`   ${dim("between  :")} ${cyan(ev.participants.join("  ↔  "))}`);
      if (ev.constraints.length) {
        console.log(`   ${dim("constraints:")}`);
        for (const k of ev.constraints) console.log(`     ${dim("§")} ${k}`);
      }
      console.log(hr());
      break;

    case "agent.thought": {
      const t = ev.content ?? "";
      const isTrace = /^\[(trace|stderr|exit)\]/.test(t);
      if (isTrace) {
        if (quiet) break;
        // one dimmed line — no emoji clutter
        console.log(dim(`   ${ev.agent.padEnd(20)} ${t}`));
      } else {
        console.log(`${sage("💭")} ${bold(ev.agent)}  ${pale(str(t, 600))}`);
      }
      break;
    }

    case "agent.message":
      console.log();
      console.log(`${cyan("💬")} ${bold(ev.from)} ${dim("→")} ${bold(ev.to)}`);
      console.log(indent(pale(str(ev.content, 800))));
      break;

    case "card.exchange": {
      const k = ev.card.kind;
      const badge = (kindStyle[k] ?? ((s: string) => s))(`[${k.toUpperCase()}]`);
      console.log();
      console.log(
        `${brass("🎴")} ${badge}  ${bold(ev.card.from)} ${dim("→")} ${bold(ev.card.to)}   ${dim("topic=")}${olive(str(ev.card.topic, 80))}`,
      );
      if (ev.card.shape != null) {
        const shapeText = str(ev.card.shape, 400);
        console.log(indent(dim("shape:"), "   "));
        console.log(indent(shapeText));
      }
      if (ev.card.teaser) console.log(indent(dim("teaser: ") + pale(str(ev.card.teaser, 240))));
      if (ev.card.conditions && (ev.card.conditions as unknown[]).length)
        console.log(indent(dim("conditions: ") + str(ev.card.conditions, 240)));
      if (ev.card.consideration)
        console.log(indent(dim("consideration: ") + str(ev.card.consideration, 240)));
      break;
    }

    case "data.reveal":
      console.log();
      console.log(`${oxblood("🔓 REVEAL")}  ${bold(ev.from)} ${dim("→")} ${bold(ev.to)}   ${dim(`(under ${ev.under_card})`)}`);
      console.log(indent(pale(JSON.stringify(ev.payload, null, 2))));
      break;

    case "enclave.outcome":
      console.log();
      console.log(hr());
      console.log(`${brass("🏁 OUTCOME")}  ${bold(pale(ev.summary))}`);
      console.log(indent(dim("artifacts: ") + JSON.stringify(ev.artifacts, null, 2)));
      break;

    case "enclave.close":
      console.log();
      console.log(
        `${dim("🧹 close  · burned=")}${oxblood(String(ev.discarded.length))}${dim(" · kept=")}${brass(String(ev.retained.length))}`,
      );
      console.log(hr("═"));
      console.log();
      break;
  }
});

await enc.run();
