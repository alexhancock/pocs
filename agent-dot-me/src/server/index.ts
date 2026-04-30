import express from "express";
import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { Enclave } from "../enclave.js";
import { scenarios } from "../scenarios.js";
import { personas } from "../personas.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const staticDir = resolve(__dirname, "..", "..", "web");

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

// --- REST: scenario catalog + persona cards -------------------------------

app.get("/api/scenarios", (_req, res) => {
  res.json(
    Object.values(scenarios).map((s) => ({
      id: s.id,
      title: s.title,
      blurb: s.blurb,
      goal: s.goal,
      constraints: s.constraints,
      participants: s.participants,
      initiator: s.initiator,
    })),
  );
});

app.get("/api/personas", (_req, res) => {
  // Don't ship 'never' or 'high' values to the client verbatim — this page
  // is meant to *show* the intelligence-portability idea, not to simulate
  // a breach of it.
  const safe = Object.values(personas).map((p) => ({
    id: p.id,
    display_name: p.display_name,
    role: p.role,
    one_liner: p.one_liner,
    sources: p.sources,
    intelligence: p.intelligence.map((r) =>
      r.sensitivity === "never" || r.sensitivity === "high"
        ? { ...r, value: "••••••" }
        : r,
    ),
  }));
  res.json(safe);
});

app.use(express.static(staticDir));

// --- WebSocket: run an enclave and stream its events ---------------------

type ClientMsg =
  | { kind: "run"; scenario: string; mode?: "mock" | "live"; speed?: number }
  | { kind: "cancel" };

wss.on("connection", (ws: WebSocket) => {
  let abort: AbortController | null = null;
  send(ws, { kind: "hello", server: "agent.me/0.1" });

  ws.on("message", async (raw) => {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(raw.toString("utf8"));
    } catch {
      return;
    }
    if (msg.kind === "run") {
      if (abort) abort.abort();
      abort = new AbortController();
      const s = scenarios[msg.scenario];
      if (!s) {
        send(ws, { kind: "error", error: `unknown scenario ${msg.scenario}` });
        return;
      }
      const enclave = new Enclave({
        mode: msg.mode ?? "mock",
        scenario: s,
        speed: msg.speed ?? 0.55,
        signal: abort.signal,
      });
      enclave.onEvent((ev) => send(ws, { kind: "event", event: ev }));
      send(ws, { kind: "started", enclave_id: enclave.id, scenario: s.id });
      try {
        await enclave.run();
        send(ws, { kind: "done", enclave_id: enclave.id });
      } catch (e) {
        send(ws, {
          kind: "error",
          error: e instanceof Error ? e.message : String(e),
        });
      }
    } else if (msg.kind === "cancel") {
      abort?.abort();
    }
  });

  ws.on("close", () => abort?.abort());
});

function send(ws: WebSocket, obj: unknown) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
}

const port = Number(process.env.PORT ?? 4242);
httpServer.listen(port, () => {
  console.log(`\n  agent.me  →  http://localhost:${port}\n`);
});
