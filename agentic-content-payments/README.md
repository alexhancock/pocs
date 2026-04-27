# x402 + MCP demo

A small PoC that shows how the [x402](https://x402.org) HTTP-native payment
protocol composes with [MCP](https://modelcontextprotocol.io) and Agent Skills.
Three demos, all running on your laptop, all using the same servers underneath.

## The three demos

| # | Demo | What it shows |
|---|---|---|
| **1** | **Site** — open `http://localhost:4000/states` in a browser | A standalone six-page magazine site (one page per New England state) where each page is paywalled by a different x402 config. **Browsers see beautiful 402 pages**; machine clients get canonical x402 JSON. |
| **2** | **Inspector** — open `http://localhost:3000` in a browser | A side-by-side debugger: pick a mock wallet profile + a state page → see the request log, the cross-referenced `accepts[]` table, and the rendered HTML in a sandboxed iframe. Drives the MCP server. |
| **3** | **Agent** — talk to goose | Have goose fetch all six state pages and write a combined report. Uses the `x402-pay` skill + CLI to sign payments. Watch a real agent + real wallet hit a real paywall and decide what to pay. |

## Ports

| Port | Service |
|---|---|
| `:3000` | Inspector UI |
| `:4000` | Web server (`/states/*`, `/article/*`) |
| `:5000` | MCP server (`/mcp`) |

## Start the servers

In one terminal at the repo root:

```bash
npm install                  # only needed the first time
npm run dev:all
```

You should see:

```
[fe]  🎨 Inspector running on http://localhost:3000
[web] 🌐 x402-aware web server on http://localhost:4000
[mcp] 🔌 x402-aware MCP server on http://localhost:5000
```

Hot reload is on. `Ctrl+C` stops all three.

---

## Demo 1 — the site

Open <http://localhost:4000>. (Root redirects to `/states`.)

You'll get a dark gallery of six tiles. Click any state. The browser hits a
paywall — a full-bleed Pexels photo of the state, EB Garamond title, glassy
"Payment Required" card listing the `accepts[]`. To bypass it for poking
around, send any non-empty `X-PAYMENT` header:

```bash
curl -H "X-PAYMENT: anything" http://localhost:4000/states/vermont
```

That's the whole demo. The site exists to be **the thing the other two demos
fetch from**.

---

## Demo 2 — the inspector

Open <http://localhost:3000>.

Three columns:

1. **Left** — pick a *wallet capability profile* (EVM-only / BTC-only / multichain / nothing) + a state page → click **Fetch**.
2. **Middle** — live request log: MCP `tools/call` → `402 Payment Required` → annotated `accepts[]` (✓ payable / ✗ reason) → simulated payment → retry → `200 OK`.
3. **Right** — sandboxed iframe rendering the HTML the server actually returned.

Things to try:

- **Empty wallet** + **Maine** → blocks at "no payable options"
- **EVM-only** + **Rhode Island** (BTC) → same
- **BTC-only** + **Vermont** (multi-option) → picks the BTC rail
- **Multi-chain EVM** + **Connecticut** (Avalanche Fuji) → only profile that can
- **Any wallet** + **/states (the index)** → no payment, content renders directly

Use this to *see* the protocol when you want a visual.

---

## Demo 3 — the agent

Goose fetches all six state pages, paying each paywall via the `x402-pay`
skill + CLI, and writes a combined report.

### One-time setup

The `x402-pay` skill and CLI should already be installed at
`~/.agents/skills/x402-pay/SKILL.md` and `~/.local/bin/x402-pay`.

Verify:

```bash
x402-pay address              # should print 0x… (the throwaway key)
ls ~/.agents/skills/x402-pay  # should list SKILL.md
```

If goose is installed and you want the MCP tool wired up too (optional — the
skill+CLI path doesn't need it), make sure `~/.config/goose/config.yaml` has
the right port:

```yaml
extensions:
  x402_mcp:
    enabled: true
    type: streamable_http
    name: x402_mcp
    uri: http://localhost:5000/mcp     # not 4000, not 3000
    timeout: 60
```

### Run it

In a fresh goose session, with `npm run dev:all` running in another terminal,
paste:

> Fetch each of the six New England state pages on this site and write me a
> single combined report on their histories. The pages are paywalled — pay
> for whichever ones your wallet can afford. URLs:
>
> - http://localhost:4000/states/maine
> - http://localhost:4000/states/new-hampshire
> - http://localhost:4000/states/vermont
> - http://localhost:4000/states/massachusetts
> - http://localhost:4000/states/rhode-island
> - http://localhost:4000/states/connecticut

Goose will:

1. Hit the first state, get a `402`, auto-load the **`x402-pay` skill** on the keyword match.
2. Run `x402-pay <url>` once per state in the shell.
3. Sign an EIP-3009 authorization with its throwaway key, send `X-PAYMENT`, get back the HTML.
4. Strip paywall chrome from each page, synthesize a multi-paragraph report.

Five of six work cleanly. **Rhode Island accepts only BTC** and the
`x402-pay` CLI signs EVM only — goose will report it as inaccessible (or
fall back to whatever's visible on the public 402 page, which still has the
photo and tagline). That's an honest demo outcome.

---

## Useful files

| Path | What it is |
|---|---|
| [`src/web-server.ts`](./src/web-server.ts) | Express app: `/states/*`, `/article/*`, `/api/articles`. Emits dual-dialect 402 (legacy `Payment-Required` header **and** canonical Coinbase JSON body). |
| [`src/states.ts`](./src/states.ts) | Six-state data, hero photos, color palettes, copy, paywall configs, HTML rendering. |
| [`src/mcp-server.ts`](./src/mcp-server.ts) | MCP `web_scrape` tool. Three modes: free / `payment_required` (with cross-reference) / retry-with-proof. |
| [`src/frontend-server.ts`](./src/frontend-server.ts) | Static file server for the inspector. |
| [`public/index.html`](./public/index.html) | The inspector UI itself. |
| [`extensions/x402-mcp.config.yaml`](./extensions/x402-mcp.config.yaml) | Snippet for `~/.config/goose/config.yaml`. |
| `~/.local/bin/x402-pay` | Single-file Node CLI; signs EIP-3009, talks Coinbase x402-fetch. |
| `~/.agents/skills/x402-pay/SKILL.md` | The skill that teaches goose to use `x402-pay`. |

## Architecture

```
┌─────────────────┐        ┌──────────────────┐        ┌──────────────┐
│ goose / browser │        │  MCP server      │        │ web server   │
│ (or x402-pay)   ├──────▶ │  /mcp :5000      ├──────▶ │ /states/*    │
│                 │        │  web_scrape tool │        │ /article/*   │
│ chooses payment │        │  decodes 402,    │        │ /api/*       │
│ rail from accepts│       │  cross-refs caps │        │     :4000    │
└─────────────────┘        └──────────────────┘        └──────────────┘
        ▲                                                     │
        │  402 + accepts[] · X-PAYMENT proof                  │
        └─────────────────────────────────────────────────────┘
```

## When things go wrong

| Symptom | Likely cause |
|---|---|
| `npm run dev:all` fails on port collision | Old run didn't fully exit. `lsof -iTCP:3000 -iTCP:4000 -iTCP:5000 -sTCP:LISTEN -P -n` and kill stragglers. |
| Inspector says "blocked" no matter what | Wallet profile is "empty" — pick another. |
| `x402-pay` errors `Cannot read properties of undefined (reading 'map')` | Server returned a 402 with no `accepts[]` body. Check that `dev:web` is running on `:4000`. |
| Goose calls `x402_mcp.web_scrape` and times out | `~/.config/goose/config.yaml` still has `:4000` for the MCP URL. Update to `:5000` and restart goose. |
| Rhode Island fails for goose | Working as designed — BTC-only state, EVM-only wallet. |

## External references

- [x402.org](https://x402.org) · [coinbase/x402](https://github.com/coinbase/x402) · [`x402-fetch` on npm](https://www.npmjs.com/package/x402-fetch)
- [Circle USDC faucet (Base Sepolia)](https://faucet.circle.com/) — for funding the `x402-pay` throwaway key
- [MCP](https://modelcontextprotocol.io) · [goose docs](https://block.github.io/goose/) · [Agent Skills](http://agentskills.io/)
