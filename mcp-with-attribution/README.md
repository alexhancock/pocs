# x402 + MCP demo

A self-contained illustration of the [x402](https://x402.org) HTTP-native
payment protocol composed with [MCP](https://modelcontextprotocol.io) and
[Agent Skills](http://agentskills.io/) + CLI. It shows an HTTP server emitting
`402 Payment Required`, an MCP tool that decodes the response and cross-references
it against a client's wallet capabilities, and two ways to drive the whole loop:

- a browser UI
- an agent (goose) using a real wallet CLI

```
┌──────────────┐  client_capabilities   ┌──────────────┐  GET / X-PAYMENT  ┌──────────────┐
│ Client       │──────────────────────▶│ MCP Server   │──────────────────▶│ x402 Web     │
│ browser or   │  payment_proof retry  │ web_scrape   │  402 + accepts[]  │ Server       │
│ goose+wallet │◀──────────────────────│ + cross-ref  │◀──────────────────│              │
└──────────────┘                       └──────────────┘                   └──────────────┘
```

## What's in this repo

Three small services, two client paths, one MCP tool. Everything is
TypeScript and runs locally with no external dependencies beyond Node.

| Piece | Role |
|---|---|
| **Inspector** (`:3000`) | Static demo UI. Picks a wallet capability profile + a state page, drives the MCP tool over the wire, and shows three things side-by-side: the live request log, the cross-referenced accepts table, and a sandboxed iframe rendering the actual HTML the server returned. |
| **Web server** (`:4000`) | Emits real x402 v2 `402 Payment Required` responses with a `Payment-Required` header carrying `accepts[]` (USDC on Base Sepolia, BTC, multi-option, free, public). Serves `/states/*` (the New England demo site) and `/article/*` (the original PoC fixtures). Serves the protected content once a non-empty `X-PAYMENT` arrives. |
| **MCP server** (`:5000`) | Exposes a single `web_scrape` tool over Streamable HTTP. Hits the web server, decodes the 402, **cross-references** each `accepts[]` entry against the caller's declared `client_capabilities`, and returns a `payment_required` result with `payable: true/false` and a `recommendedIndex`. |
| **`x402-pay` CLI** | A separate single-file Node script (lives at `~/.local/bin/x402-pay`) that uses Coinbase's reference `x402-fetch` library + a throwaway EVM key. Lets an agent pay an x402 endpoint with one command and produces a real `X-PAYMENT` proof. |
| **`x402-pay` skill** | Goose skill that auto-loads when the agent encounters x402 / 402 / paywall language and teaches it to use the CLI above. |
| **Endpoints offered by the web server** | `/article/free` (attribution only) · `/article/premium` (USDC on Base Sepolia, 0.01 USDC) · `/article/crypto` (BTC, 1000 sats) · `/article/multi` (USDC **or** BTC) · `/article/public` · `/api/articles` (catalog) · `/health` |
| **`web_scrape` tool — three modes** | `{url}` → `success` if free · `{url, client_capabilities}` → `payment_required` with annotated accepts · `{url, payment_proof}` → `success` after retry |

The web server emits **both** dialects of x402 simultaneously: the full
v2 payload via the `Payment-Required` header (legacy clients, MCP), and a
canonical Coinbase-shaped JSON body (`x402-fetch`, `x402-axios`). One
server, every client works.

## Running it in dev

### Prerequisites

- Node 20+
- `npm install` once at the repo root.

### Start everything

```bash
cd ~/Development/pocs/mcp-with-attribution
npm run dev:all
```

That brings up all three servers with hot reload (via `tsx`):

```
[fe]   🎨 Inspector running on http://localhost:3000
[web]  🌐 x402-aware web server on http://localhost:4000
[mcp]  🔌 x402-aware MCP server on http://localhost:5000
```

`Ctrl+C` stops all three. Logs are color-coded.

> Need to start them individually? `npm run dev:web`, `npm run dev:mcp`,
> `npm run dev:frontend`. Production-ish: `npm run build && npm run start:all`.

### Drive it from the browser

Open <http://localhost:3000>. Pick a wallet capability profile on the
left, pick a state page, click **Fetch**. The middle column animates
through:

1. MCP `web_scrape` called with `client_capabilities`
2. 402 returned, options decoded, each tagged payable / not
3. Mock wallet "pays" and produces a stub proof
4. `web_scrape` retried with `payment_proof` → 200 + content

Try **Multi-Option** with each wallet profile to see the cross-reference
flip between USDC-payable and BTC-payable.

### Drive it from goose (real wallet, no MCP)

Simplest agent path. Just have the web server running and ask:

> Use `x402-pay` to fetch `http://localhost:4000/states/maine`.

Goose loads the `x402-pay` skill automatically (it triggers on
"x402" / "402" / "paywall" / "payment_required") and runs the CLI.
You'll see the 402 → sign → 200 chain in the terminal output.

> First time only: `x402-pay keygen` to generate a throwaway key, then
> fund the printed address with testnet USDC from
> <https://faucet.circle.com/> (select **Base Sepolia**). The local demo
> server accepts any non-empty proof, so funding is optional for it; the
> CLI works against any real x402 endpoint once funded. **No ETH gas
> needed** — the x402 facilitator pays gas.

### Drive it from goose with the MCP server (full PoC)

Same setup as above, plus the MCP server. Wire goose to the MCP server
once:

```yaml
# Paste under `extensions:` in ~/.config/goose/config.yaml
extensions:
  x402_mcp:
    enabled: true
    type: streamable_http
    name: x402_mcp
    description: |
      Fetch URLs that may require x402 payment. The web_scrape tool
      decodes HTTP 402 responses, surfaces accepts[] payment requirements,
      and cross-references them against client_capabilities. Retry with
      payment_proof obtained from a wallet (see the x402-pay skill).
    uri: http://localhost:5000/mcp
    timeout: 60
    headers: {}
    env_keys: []
    available_tools: []
```

Restart goose. Then ask:

> Use `x402_mcp.web_scrape` to fetch
> `http://localhost:4000/states/vermont`. My wallet can pay USDC on Base
> Sepolia via `x402-pay`.

Goose will:

1. call `web_scrape` with your stated capabilities;
2. inspect the annotated `accepts[]` and pick the recommended payable option;
3. run `x402-pay http://localhost:4000/states/vermont` to obtain an `X-PAYMENT` proof;
4. call `web_scrape` again with `payment_proof`;
5. return the unlocked content.

This is the full story: an agent reasoning about a paywall via MCP, then
settling via a wallet skill.

## Links

### Code in this repo

- [`src/web-server.ts`](./src/web-server.ts) — x402 web server (paywall + protected routes + dual-dialect 402)
- [`src/mcp-server.ts`](./src/mcp-server.ts) — MCP `web_scrape` tool with capability cross-reference
- [`src/frontend-server.ts`](./src/frontend-server.ts) — static file server for the demo UI
- [`public/index.html`](./public/index.html) — browser demo UI (single file, no build step)
- [`extensions/x402-mcp.config.yaml`](./extensions/x402-mcp.config.yaml) — goose extension snippet
- [`package.json`](./package.json) — npm scripts (`dev:all`, `dev:web`, etc.)

### CLI + skill (installed outside the repo)

- `~/.local/bin/x402-pay` — single-file x402 client (uses Coinbase's `x402-fetch`)
- [`~/.agents/skills/x402-pay/SKILL.md`](~/.agents/skills/x402-pay/SKILL.md) — goose skill teaching the agent to use the CLI
- `~/.config/x402-pay/.env` — throwaway EVM private key (chmod 600, demo only)

### External references

- [x402 protocol homepage](https://x402.org)
- [x402.org / protected demo](https://www.x402.org/protected) — public x402 endpoint to test against
- [Circle USDC testnet faucet](https://faucet.circle.com/) — Base Sepolia funding
- [`x402-fetch` on npm](https://www.npmjs.com/package/x402-fetch) — Coinbase's reference client
- [Coinbase x402 GitHub](https://github.com/coinbase/x402) — protocol + libraries
- [MCP specification](https://modelcontextprotocol.io)
- [goose docs](https://block.github.io/goose/)
