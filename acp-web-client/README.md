# ACP Web Client

A single page app that speaks the [Agent Client Protocol](https://github.com/agentclientprotocol/typescript-sdk)
to a fresh build of **goose**, with a live toggle between two transports:

- **stdio** — `goose acp` (bridged through the node server)
- **http / ws** — `goose serve` (browser connects directly over WebSocket)

Same client, same agent — only the transport underneath changes.

## Architecture

Just two files:

| File         | Role                                                                                    |
| ------------ | --------------------------------------------------------------------------------------- |
| `server.ts`  | Vite middleware + serves the SPA; spawns `goose serve`; bridges a WS to `goose acp`     |
| `client.tsx` | The single page app (React). ACP session flow, transport toggle, Swiss design          |

```
browser (client.tsx)
   │
   ├── stdio mode ──► ws://localhost:5173/bridge ──► server.ts ──► spawn `goose acp` (ndjson over stdio)
   │
   └── http/ws mode ─► ws://127.0.0.1:3284/acp  ──► `goose serve` (spawned by server.ts)
```

The browser uses the SDK's `createWebSocketStream` for **both** modes — only the URL differs.
The stdio bridge is a trivial newline-delimited JSON-RPC pipe between the socket and the child's
stdin/stdout.

## Run

```bash
npm install
npm run dev
```

Open <http://localhost:5173> and use the **transport** toggle.

## Configuration

Environment variables (all optional):

| Var                | Default                                                            |
| ------------------ | ----------------------------------------------------------------- |
| `GOOSE_BIN`        | `/Users/alexhancock/Development/goose/target/release/goose`       |
| `PORT`             | `5173` (app + stdio bridge)                                       |
| `GOOSE_SERVE_PORT` | `3284` (`goose serve` ACP endpoint)                               |

`goose serve` is spawned with `GOOSE_SERVER__SECRET_KEY` stripped so the local demo
endpoint accepts unauthenticated connections.

## Design

Swiss / international typographic style, lifted from the talk slides:
white field, ink `#111111`, a single red accent `#E5322D`, serif display type
(Newsreader), mono labels (IBM Plex Mono), and the thin-stroke "remote emitting a
signal" line mark whose arcs go red when a session is live.
