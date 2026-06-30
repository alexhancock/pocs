/**
 * ACP Web Client — single-file Node server.
 *
 * Responsibilities:
 *   1. Serve the Vite-built single page app (client.tsx).
 *   2. Run `goose serve` so the browser can talk ACP over HTTP/WebSocket directly.
 *   3. Expose a WebSocket "bridge" so the browser can talk ACP over stdio to
 *      `goose acp` — the browser cannot spawn processes, so we proxy raw
 *      newline-delimited JSON-RPC frames between the socket and the child's
 *      stdin/stdout.
 *
 * The whole demo is just this file plus client.tsx.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

import express from "express";
import { WebSocketServer, type WebSocket } from "ws";
import { createServer as createViteServer } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const GOOSE_BIN =
  process.env.GOOSE_BIN ??
  "/Users/alexhancock/Development/goose/target/release/goose";
const APP_PORT = Number(process.env.PORT ?? 5173);
const SERVE_PORT = Number(process.env.GOOSE_SERVE_PORT ?? 3284);
const SERVE_HOST = "127.0.0.1";

// ---------------------------------------------------------------------------
// `goose serve` — the HTTP/WebSocket transport.
// Spawn it without the secret-key env so the local demo endpoint is open.
// ---------------------------------------------------------------------------
function startGooseServe(): ChildProcess {
  const env = { ...process.env };
  delete env.GOOSE_SERVER__SECRET_KEY;

  const child = spawn(
    GOOSE_BIN,
    ["serve", "--host", SERVE_HOST, "--port", String(SERVE_PORT)],
    { env, stdio: ["ignore", "pipe", "pipe"] },
  );

  child.stdout?.on("data", (d) => process.stdout.write(`[goose serve] ${d}`));
  child.stderr?.on("data", (d) => process.stderr.write(`[goose serve] ${d}`));
  child.on("exit", (code) =>
    console.log(`[goose serve] exited with code ${code}`),
  );
  return child;
}

// ---------------------------------------------------------------------------
// stdio bridge — one `goose acp` child per browser WebSocket connection.
// Each ACP JSON-RPC message is one line / one text frame in both directions.
// ---------------------------------------------------------------------------
function bridgeStdio(socket: WebSocket): void {
  // Disable Nagle's algorithm on the underlying TCP socket. ACP streams arrive
  // as a rapid sequence of tiny `agent_message_chunk` frames; without this the
  // kernel coalesces them and the browser receives the text in stuttery bursts.
  const tcp = (socket as unknown as { _socket?: { setNoDelay(v: boolean): void } })
    ._socket;
  tcp?.setNoDelay(true);

  const child = spawn(GOOSE_BIN, ["acp"], {
    stdio: ["pipe", "pipe", "pipe"],
  });
  console.log(`[bridge] spawned goose acp (pid ${child.pid})`);

  // Agent stdout (ndjson) -> browser, as close to a raw passthrough as the
  // framing allows. The browser's ACP stream parses exactly one JSON-RPC
  // message per WebSocket frame, so the only transform we must do is split on
  // newlines; each complete line is forwarded the instant it arrives.
  //
  //  - setEncoding("utf8") routes bytes through Node's StringDecoder, so a
  //    multi-byte codepoint split across two reads is never corrupted (a
  //    corrupted line yields malformed JSON the client silently drops, which
  //    looks like a stall).
  //  - An index pointer avoids re-slicing the whole buffer per line.
  //  - compress:false skips deflate; fin defaults true so each frame flushes.
  child.stdout!.setEncoding("utf8");
  let buffer = "";
  child.stdout!.on("data", (chunk: string) => {
    buffer += chunk;
    let start = 0;
    let nl: number;
    while ((nl = buffer.indexOf("\n", start)) !== -1) {
      const line = buffer.slice(start, nl);
      start = nl + 1;
      if (line.length > 0 && socket.readyState === socket.OPEN) {
        socket.send(line, { compress: false });
      }
    }
    if (start > 0) buffer = buffer.slice(start);
  });

  child.stderr!.on("data", (d) => process.stderr.write(`[goose acp] ${d}`));

  // Browser -> agent stdin (one JSON-RPC message per frame).
  socket.on("message", (data) => {
    const text = typeof data === "string" ? data : data.toString("utf8");
    child.stdin!.write(text.trimEnd() + "\n");
  });

  const cleanup = () => {
    if (!child.killed) child.kill();
  };
  socket.on("close", cleanup);
  socket.on("error", cleanup);
  child.on("exit", () => {
    if (socket.readyState === socket.OPEN) socket.close();
  });
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
async function main() {
  const gooseServe = startGooseServe();

  const app = express();

  // Vite in middleware mode: transforms and serves client.tsx with HMR.
  const vite = await createViteServer({
    root: __dirname,
    server: { middlewareMode: true },
    appType: "custom",
  });
  app.use(vite.middlewares);

  // Tell the client where the two ACP transports live.
  app.get("/config", (_req, res) => {
    res.json({
      stdioBridgeUrl: `ws://${"localhost"}:${APP_PORT}/bridge`,
      serveWsUrl: `ws://${SERVE_HOST}:${SERVE_PORT}/acp`,
      serveHttpUrl: `http://${SERVE_HOST}:${SERVE_PORT}/acp`,
    });
  });

  // The single page. HTML lives here so the app is just client.tsx + server.ts.
  const HTML = /* html */ `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>the universal remote for ai</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/client.tsx"></script>
  </body>
</html>`;

  app.use("*", async (req, res, next) => {
    try {
      const html = await vite.transformIndexHtml(req.originalUrl, HTML);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });

  // Plain HTTP server so we can attach the stdio-bridge WebSocket alongside Express.
  const httpServer = createServer(app);
  const wss = new WebSocketServer({
    server: httpServer,
    path: "/bridge",
    // Per-message-deflate buffers small frames to build a compression context,
    // which stutters token-by-token streaming. The frames are tiny JSON-RPC
    // messages on localhost, so compression buys nothing — turn it off.
    perMessageDeflate: false,
  });
  wss.on("connection", (socket) => bridgeStdio(socket));

  httpServer.listen(APP_PORT, () => {
    console.log(`\n  ACP Web Client → http://localhost:${APP_PORT}`);
    console.log(`  stdio bridge   → ws://localhost:${APP_PORT}/bridge`);
    console.log(`  goose serve    → ws://${SERVE_HOST}:${SERVE_PORT}/acp\n`);
  });

  const shutdown = () => {
    console.log("\nShutting down…");
    gooseServe.kill();
    wss.close();
    httpServer.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
