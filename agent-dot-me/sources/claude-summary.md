This is a wide-ranging brainstorming session on personal AI agents, privacy, and agent-to-agent interaction design. Here's what the group covered:

**Core problem being addressed:** How do you give a personal AI agent access to your data — email, files, contacts, purchase history — in a way that is useful, privacy-preserving, and interoperable with agents representing other parties (vendors, friends, institutions)?

**Key architectural ideas:**

- A "me agent" connected to personal data sources via MCP servers (Gmail, Google Drive, local files), using progressive discovery — searching compact representations before pulling full content — to stay token-efficient
- Agent-to-agent interaction happening inside a Trusted Execution Environment (enclave), where both agents exchange information to accomplish a task, then the session is discarded
- "Disclosure cards" as a negotiation mechanism — parties progressively reveal what data they have and are willing to share before entering deeper exchange, borrowing from Alvin Roth-style market design thinking
- A distinction between *data portability* (raw exports) and *intelligence portability* — the compact signals apps have already derived about you (who you email most, what you return, your size preferences) that could be exposed to your agent without dumping raw data

**Use cases the group developed:**

1. **Shopping** — buying shirts from Uniqlo/Huckberry, where your agent negotiates with the vendor's agent using only the information necessary (size, style history) while withholding everything else
2. **Event/conference planning** — "who should I invite to Foo Camp?" as a multi-hop network discovery problem; agents surfacing alpha from your social graph rather than just beta from aggregators
3. **Travel recommendations** — finding friends who have alpha on a city (Milan, Japan) and asking their agents for recommendations, with privacy controls over what gets shared
4. **B2B research** — the Semi Analysis example, where a fund wants sector intelligence but doesn't want to reveal its position; agents doing progressive disclosure to negotiate what gets exchanged

**Key tensions identified:**

- Ephemerality vs. memory: a session that disappears is private but leaves no learning
- Efficiency vs. richness: MCP search tools exist, but analysis and insight tools are mostly missing
- User control vs. adoption: overly prescriptive architectures won't get uptake; minimum viable protocols matter
- Two-sided market cold start: both sides need agents for this to work

**Where the group landed:** Focus near-term on (1) the missing MCP tools — especially analysis/insight beyond raw search — and (2) the agent-to-agent communication protocol, since neither has industry consensus. A working demo showing the value would drive adoption better than a spec alone. The group ended by planning to photograph the whiteboards and feed everything to an AI to build a prototype