# agent.me

> Personal AI agents communicating in an ephemeral enclave, trading
> **disclosure cards** before they trade data.

## About

**agent.me** is a prototype of a three-layer architecture for agent-to-agent
interaction:

1. **A "me agent"** — a personal agent with progressive-discovery access to
   your data sources (mail, files, purchase history, social graph, etc.).
2. **An agent-to-agent protocol** — a tiny newline-delimited JSON dialect
   (ACP) that lets two agents speak to each other turn by turn.
3. **A trusted execution environment (the enclave)** — a mediator that sits
   between the two agents, enforces policy, and burns itself down when the
   task is done.

The central idea is the **disclosure card**: a structured offer, request, or
commit that negotiates *what* will be revealed before any payload crosses the
rail. Agents don't trust each other — they trust the enclave, which only
lets a `reveal` through if it's backed by a prior matching `commit` card.
The result is a conversation where progressive disclosure is a first-class
protocol primitive, not an afterthought.

The repo ships with three scenarios that exercise the protocol end-to-end
(a shopping negotiation, a travel intro, and a capital-markets coverage
check), and a dossier-style web UI that renders the enclave as a live
transcript — private thoughts in the left/right columns, disclosure cards
and authorized reveals transiting the center rail, and a close-band showing
what was burned and what was retained.

---

## Running it

Requires **Node 20+**. Live mode additionally requires
[`goose`](https://github.com/block/goose) on your PATH.

### Install

```bash
npm install
```

### Web UI

```bash
npm run dev
```

Open **http://localhost:4242**.

1. Pick a dossier (tabs at the top of the enclave).
2. Choose a mode in the enclave header:
   - **Rehearsal** — canned, deterministic playback. No API calls; great for
     demos and for watching the protocol shape without any live variance.
   - **Live** — spawns real `goose run` subprocesses per agent per turn,
     using `--resume --name <session>` to preserve per-agent memory. Agents
     speak ACP and negotiate in real time.
3. Click **Open enclave**.

In live mode, small dimmed `trace.` lines show raw goose stdout so you can
watch the agents think even when their output isn't yet clean ACP JSON.

### Headless (terminal)

Run a single scenario:

```bash
npm run demo:shopping     # wardrobe triage
npm run demo:travel       # four hours in Milan
npm run demo:semi         # coverage without confession
```

Run all three back to back:

```bash
npm run demo:all
```

Live mode from the CLI:

```bash
tsx src/cli/run-scenario.ts shopping --live
tsx src/cli/run-scenario.ts travel --live --quiet
```

### Build

```bash
npm run build
```

---

## The protocol, briefly

**Agent Client Protocol (ACP)** — newline-delimited JSON. Every turn an
agent emits exactly one object:

```jsonc
{"kind":"card","card":{"id":"c1","from":"me.lucky","to":"vendor.huckberry",
  "kind":"request","topic":"wardrobe.basics.availability",
  "shape":"category={tees,overshirts,denim}:stock=now:price_band=premium-midmarket",
  "conditions":["US ship within 72h"]}}

{"kind":"reveal","to":"vendor.huckberry","under_card":"c4",
  "payload":{"top_size":"M","fit_feel":"slightly loose","palette":["indigo","cream","olive"]}}

{"kind":"propose.outcome","summary":"...","artifacts":{...}}
```

A reveal is only valid under a prior matching commit card — that's the
mediator enforcing the "trusted" in TEE.

---

## Repo layout

```
src/
  types.ts                    EnclaveEvent, DisclosureCard, Persona, Scenario
  personas.ts                 agents with compact "intelligence" per source
  scenarios.ts                scenario definitions and canned event scripts
  enclave.ts                  the mediator: mock or live, policy, streaming
  agent-client-protocol.ts    the ACP dialect
  server/index.ts             Express + WebSocket server for the web UI
  cli/                        headless scenario runners
web/                          the dossier-terminal UI (vanilla HTML/CSS/JS)
```

---

## Caveats

- **Live mode** spawns real goose subprocesses and preserves per-agent
  memory across turns, but goose's default output isn't strict JSON — in
  practice you'll see a mix of well-formed ACP cards and dimmed trace
  lines. For a deterministic, polished walkthrough, stay in Rehearsal.
- **The "TEE" here is a metaphor**, not cryptographic. The enclave is a
  process mediator that enforces card-before-reveal policy and burns
  transient state at the end. A real implementation would sit behind
  actual attestation.
