# agent.me

> A working prototype of a paradigm: personal AI agents negotiating in an
> ephemeral enclave, trading **disclosure cards** before they trade data.

Built from a group brainstorming session on personal agents, privacy, and
agent-to-agent interaction design. The conversation (transcript + whiteboards
live under [`sources/`](./sources/)) wrestled with the same core problem: how
do you give your agent access to your data — email, files, purchase history,
social graph — in a way that is useful, privacy-preserving, and interoperable
with agents representing other parties (vendors, friends, institutions)?

The group landed on a three-layer architecture, and this repo builds it:

1. **A "me agent"** with progressive-discovery access to your data sources.
2. **An agent-to-agent protocol** for the two agents to speak to each other.
3. **A trusted execution environment (enclave)** that mediates the exchange
   and burns itself down when the task is done.

On top of that, the central protocol idea: **disclosure cards** — structured
offers, requests, and commits that negotiate *what* will be revealed before
any payload crosses. Borrowed from Alvin-Roth-style market design, where the
information to reveal is itself the good being traded.

---

## What's in this repo

```
sources/           the original transcript + whiteboard photos + claude summary
src/
  types.ts          EnclaveEvent, DisclosureCard, Persona, Scenario
  personas.ts       6 agents with compact "intelligence" derived from their sources
  scenarios.ts      3 scenarios, each with a full canned event script
  enclave.ts        the mediator: runs mock or live, enforces policy, streams events
  agent-client-protocol.ts   the tiny ACP dialect (newline-delimited JSON)
  server/index.ts   Express + WebSocket server for the web UI
  cli/              headless scenario runners for the terminal
web/                the dossier-terminal UI (vanilla HTML/CSS/JS, no framework)
```

## The three scenarios

Each one faithfully reproduces a use case the group developed:

| # | Title | What's at stake |
|---|---|---|
| 01 | **Wardrobe triage** | Lucky's clothes were ruined at a hotel. His me-agent negotiates a 4-piece replacement with Huckberry — revealing fit data at the *summary* level, never the *biometric* level. |
| 02 | **Four hours in Milan** | Alex has a layover and wants *alpha* — the friend-of-friend kind. Craig's me-agent carries it. Progressive disclosure decides what crosses; private introductions require human-in-the-loop. |
| 03 | **Coverage without confession** | A fund wants to know whether a sector analyst holds primary sources on three specific names — without betraying its book. Disclosure cards as market design. |

## How to run the demo

Requires Node 20+ and [`goose`](https://github.com/block/goose) for live mode.

```bash
npm install --registry=https://registry.npmjs.org/
npm run dev
```

Open **http://localhost:4242**.

1. Pick a dossier (three tabs at the top of the enclave).
2. Choose a mode in the enclave header:
   - **Rehearsal** — canned, deterministic playback of the scenario script.
     Best for showing the idea; beautifully paced; no API calls.
   - **Live** — spawns real `goose run` subprocesses for each agent, one per
     turn, with `--resume --name <session>` to preserve per-agent memory.
     Agents speak the ACP dialect and negotiate in real time.
3. Click **Open enclave**.

### Headless (terminal)

```bash
npm run demo:shopping     # or demo:travel / demo:semi
npm run demo:all          # plays all three back to back

# live mode in the terminal:
tsx src/cli/run-scenario.ts shopping --live
tsx src/cli/run-scenario.ts travel --live --quiet
```

---

## What you're seeing

- **Left column** — the initiator's me-agent. Italic marginalia = private
  thoughts (never cross the rail). Solid blocks = spoken messages.
- **Center rail** — the trusted mediator. Every disclosure card and every
  data reveal transits here. Cards are stamped dossier slips; reveals are
  dark authorized envelopes marked with the card they were committed under.
- **Right column** — the counterparty's agent.
- **Brass footer** — the outcome, once the task closes. Followed by a
  close-band listing what was *burned* (inter-agent reasoning, transient
  state) and what was *retained* (the outcome itself, any reciprocity debts).

In live mode, small dimmed `trace.` lines show raw goose stdout so you can
always see the agents thinking, even when their output isn't yet clean ACP
JSON.

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

A **reveal is only valid under a prior matching commit card** — that's the
mediator enforcing the "trusted" in TEE. Agents don't trust each other; they
trust the enclave.

---

## Key ideas the demo encodes

- **Progressive discovery** — agents search compact representations before
  pulling full content. Saves tokens, saves context, saves attention.
- **Intelligence portability** — what's portable isn't the raw Gmail archive;
  it's the *derived signal*: who you reply to within a day, what size you
  return, what the vendor already knows about fit-model variance. Each persona
  in the demo holds a short list of these, sensitivity-tagged.
- **Disclosure cards** — the negotiation artifact. Four kinds: offer, request,
  commit, decline. Each carries a `shape` (what would be shared) before a
  `payload` (the actual data).
- **Ephemerality** — the enclave is a room with a timer. When the task
  concludes, inter-agent reasoning is wiped; only the outcome crosses the
  threshold. The UI shows this explicitly (the close-band).
- **Alpha vs beta** — aggregator recommendations (TripAdvisor, Yelp) are
  beta. Friend-of-friend recommendations (the sushi chef, the analyst's
  paper invoice) are alpha. Me-agents surface alpha without flattening it.
- **Minimum viable protocol** — the group's bet: the two things without
  industry consensus are (a) the missing MCP *analysis* tools and (b) the
  agent-to-agent envelope. Fix those, let everyone bring their own
  context-gathering to the enclave.

---

## Honest caveats

- **Live mode** spawns real goose subprocesses and really does preserve
  per-agent memory across turns. But goose's default output isn't strict
  JSON, so in practice you'll see a mix of well-formed ACP cards and dimmed
  trace lines. For a deterministic, always-polished demo, stay in Rehearsal.
- **Session memory** is preserved at the agent level via `goose run
  --resume --name <session>`. Each turn is a fresh subprocess that rehydrates
  the session. You can inspect a session after the fact with the goose CLI.
- **The "TEE" here is a metaphor**, not cryptographic. The enclave is a
  process mediator that enforces card-before-reveal policy and burns transient
  state at the end. A real implementation would sit behind actual attestation.

---

*agent.me — sourced from a whiteboard, built in TypeScript, ephemeral by design.*
