/**
 * Core types for the agent.me paradigm.
 *
 * Concepts (from the whiteboard session):
 *   - Me agent: a personal agent with progressive-discovery access to a principal's data.
 *   - Enclave: an ephemeral trusted execution environment; discarded after the exchange.
 *   - Disclosure card: a structured "I have X, I'm willing to share Y under Z terms" artifact.
 *     Cards are exchanged progressively to negotiate what enters the enclave — borrowed
 *     from Alvin-Roth-style market design, where the *information to reveal* is the good
 *     being traded.
 *   - Intelligence portability: compact derived signals (preferences, returns, response
 *     patterns) that apps could expose to the me-agent instead of raw data dumps.
 *   - Alpha vs Beta: Beta = aggregator knowledge (TripAdvisor, Yelp). Alpha = friend-of-friend
 *     insight surfaced through the me-agent social graph.
 */

export type AgentRole =
  | "me"          // represents the principal user
  | "vendor"      // represents a seller / service / institution
  | "peer"        // represents a friend's me-agent (alpha source)
  | "analyst";    // represents a data provider (B2B research case)

export interface Persona {
  id: string;
  display_name: string;
  role: AgentRole;
  one_liner: string;
  /** Compact "intelligence cards" derived from raw sources. These are what the agent
   *  reveals progressively, never the raw data. See: "intelligence portability". */
  intelligence: IntelligenceRecord[];
  /** Mock raw-data sources attached by name (Gmail, Drive, Purchase history, etc.) */
  sources: string[];
  /** System prompt describing the agent's behavior & disclosure posture. */
  agent_prompt: string;
}

/** A compact fact the agent has derived and could potentially disclose.
 *  The `sensitivity` governs the disclosure card it can be revealed in. */
export interface IntelligenceRecord {
  key: string;
  value: string;
  /** low = broadcastable, medium = share with matched counterparty,
   *  high = only under explicit principal consent, never = never leaves the agent. */
  sensitivity: "low" | "medium" | "high" | "never";
  /** Provenance — which source derived this. */
  source: string;
}

/** A disclosure card is an offer to reveal (or a request to receive) information
 *  at a given granularity. Cards are the unit of agent-to-agent negotiation. */
export interface DisclosureCard {
  id: string;
  from: string;            // agent id
  to: string;              // agent id
  kind: "offer" | "request" | "commit" | "decline";
  /** What category of info is in play. Vague on purpose to avoid leakage during negotiation. */
  topic: string;
  /** Shape of what would be shared / is being asked for. Examples:
   *   - "size_preferences:summary"
   *   - "purchase_history:last_12_months:aggregated"
   *   - "alpha_recommendations:city=Milan:count<=5"
   */
  shape: string;
  /** Optional teaser — a compact hint of the value, without revealing it. */
  teaser?: string;
  /** Conditions the other side must meet for this to turn into a commit. */
  conditions?: string[];
  /** Cost / compensation for the disclosure (may be monetary, reciprocal, or zero). */
  consideration?: string;
}

/** A message inside the enclave. This is the ACP-style envelope we use on the bridge. */
export type EnclaveEvent =
  | {
      type: "enclave.open";
      enclave_id: string;
      participants: string[];
      goal: string;
      constraints: string[];
      ts: number;
    }
  | {
      type: "agent.thought";
      enclave_id: string;
      agent: string;
      content: string;
      ts: number;
    }
  | {
      type: "agent.message";
      enclave_id: string;
      from: string;
      to: string;
      content: string;
      ts: number;
    }
  | {
      type: "card.exchange";
      enclave_id: string;
      card: DisclosureCard;
      ts: number;
    }
  | {
      type: "data.reveal";
      enclave_id: string;
      from: string;
      to: string;
      payload: Record<string, unknown>;
      /** Which card authorized this reveal */
      under_card: string;
      ts: number;
    }
  | {
      type: "enclave.outcome";
      enclave_id: string;
      summary: string;
      artifacts: Record<string, unknown>;
      ts: number;
    }
  | {
      type: "enclave.close";
      enclave_id: string;
      discarded: string[];   // ids of transient state wiped
      retained: string[];    // ids of durable artifacts surfaced back to principals
      ts: number;
    };

export interface Scenario {
  id: string;
  title: string;
  blurb: string;
  goal: string;
  constraints: string[];
  participants: string[]; // persona ids
  initiator: string;      // the "me" agent that opens the enclave
  /** A canned but realistic script of events the enclave emits in mock mode.
   *  When running live, the goose agents produce these same event types dynamically. */
  script: EnclaveEvent[];
}
