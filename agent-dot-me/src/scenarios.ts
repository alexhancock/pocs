import type { Scenario, EnclaveEvent } from "./types.js";

/**
 * The scripts below are *faithful to the whiteboard session*: progressive
 * disclosure cards, alpha-vs-beta distinctions, and ephemerality are all
 * expressed structurally, not just described.
 *
 * In live mode (goose subprocesses actually running), the bridge produces
 * the same event shapes — the scripts here are the spec + a fallback demo.
 */

let _ts = Date.now();
const nextTs = () => (_ts += 900 + Math.random() * 600);

/* ------------------------------------------------------------------ */
/*  1. Shopping — Lucky's wardrobe was ruined by a hotel.             */
/* ------------------------------------------------------------------ */

const shoppingEvents: EnclaveEvent[] = [
  {
    type: "enclave.open",
    enclave_id: "ENC-shop-001",
    participants: ["me.lucky", "vendor.huckberry"],
    goal: "Replace Lucky's wardrobe basics in 3 days without leaking PII.",
    constraints: [
      "Ephemeral: wipe session on close.",
      "No height/weight/income disclosure.",
      "Prefer items with primary fit-data match, not aggregator reviews.",
    ],
    ts: nextTs(),
  },
  {
    type: "agent.thought",
    enclave_id: "ENC-shop-001",
    agent: "me.lucky",
    content:
      "I'll lead with shape-only cards. Huckberry doesn't need Lucky's size on the wire yet — first confirm they can cover the category at the right price band.",
    ts: nextTs(),
  },
  {
    type: "card.exchange",
    enclave_id: "ENC-shop-001",
    card: {
      id: "c1",
      from: "me.lucky",
      to: "vendor.huckberry",
      kind: "request",
      topic: "wardrobe.basics.availability",
      shape: "category={tees,overshirts,denim}:stock=now:price_band=premium-midmarket",
      conditions: ["US ship within 72h"],
    },
    ts: nextTs(),
  },
  {
    type: "card.exchange",
    enclave_id: "ENC-shop-001",
    card: {
      id: "c2",
      from: "vendor.huckberry",
      to: "me.lucky",
      kind: "offer",
      topic: "wardrobe.basics.coverage",
      shape: "tees:selvedge:3-colorways / overshirts:wool:2-cuts / denim:selvedge:limited",
      teaser: "We can cover all three in 72h; some items primary-sourced (house-milled).",
      consideration: "no-cost; subject to fit match",
    },
    ts: nextTs(),
  },
  {
    type: "agent.thought",
    enclave_id: "ENC-shop-001",
    agent: "vendor.huckberry",
    content:
      "Before I commit inventory, I need *just enough* to avoid a return. I'll request size at summary granularity, not biometrics.",
    ts: nextTs(),
  },
  {
    type: "card.exchange",
    enclave_id: "ENC-shop-001",
    card: {
      id: "c3",
      from: "vendor.huckberry",
      to: "me.lucky",
      kind: "request",
      topic: "fit.summary",
      shape: "top_size:label_only + fit_feel:loose|reg|slim",
      consideration: "unlocks primary fit-model match (Flint & Tinder aggregate)",
    },
    ts: nextTs(),
  },
  {
    type: "card.exchange",
    enclave_id: "ENC-shop-001",
    card: {
      id: "c4",
      from: "me.lucky",
      to: "vendor.huckberry",
      kind: "commit",
      topic: "fit.summary",
      shape: "M slightly loose / 32x32 / indigo-cream-olive",
      conditions: ["do not persist beyond enclave", "no inference to biometrics"],
    },
    ts: nextTs(),
  },
  {
    type: "data.reveal",
    enclave_id: "ENC-shop-001",
    from: "me.lucky",
    to: "vendor.huckberry",
    payload: {
      top_size: "M",
      fit_feel: "slightly loose",
      bottom: "32x32",
      palette: ["indigo", "cream", "olive"],
    },
    under_card: "c4",
    ts: nextTs(),
  },
  {
    type: "card.exchange",
    enclave_id: "ENC-shop-001",
    card: {
      id: "c5",
      from: "vendor.huckberry",
      to: "me.lucky",
      kind: "commit",
      topic: "curated.bundle",
      shape: "3 tees + 1 overshirt + optional denim",
      teaser: "Flint & Tinder M indigo+cream+olive, Taylor Stitch Maritime M — ships tonight.",
      consideration: "$344 ($432 a-la-carte); loyalty 10% = $310",
    },
    ts: nextTs(),
  },
  {
    type: "data.reveal",
    enclave_id: "ENC-shop-001",
    from: "vendor.huckberry",
    to: "me.lucky",
    payload: {
      bundle: [
        { sku: "FT-SEL-TEE-IN-M", name: "Flint & Tinder 10oz selvedge tee — indigo", price: 88 },
        { sku: "FT-SEL-TEE-CR-M", name: "Flint & Tinder 10oz selvedge tee — cream", price: 88 },
        { sku: "FT-SEL-TEE-OL-M", name: "Flint & Tinder 10oz selvedge tee — olive", price: 88 },
        { sku: "TS-MARITIME-IN-M", name: "Taylor Stitch Maritime — indigo wool", price: 168 },
      ],
      subtotal: 432,
      loyalty_discount: -43,
      bundle_discount: -79,
      total: 310,
      ships_by: "tonight 2pm PT cutoff",
    },
    under_card: "c5",
    ts: nextTs(),
  },
  {
    type: "agent.message",
    enclave_id: "ENC-shop-001",
    from: "me.lucky",
    to: "vendor.huckberry",
    content:
      "Confirming the bundle at $310. Ship to my on-file shipping token (no new address needed). Do not keep the biometric-adjacent summary after checkout.",
    ts: nextTs(),
  },
  {
    type: "enclave.outcome",
    enclave_id: "ENC-shop-001",
    summary:
      "Lucky bought a 4-piece replacement wardrobe for $310 without disclosing PII. Vendor got the sale + the shape-level fit data they need for primary-source match — nothing more.",
    artifacts: {
      order_id: "HB-9F3-X72A",
      eta: "Fri",
      what_left_the_enclave_for_principal: ["order_id", "eta", "receipt"],
      what_left_the_enclave_for_vendor: ["sale_record (no PII)", "fit_summary (ephemeral)"],
    },
    ts: nextTs(),
  },
  {
    type: "enclave.close",
    enclave_id: "ENC-shop-001",
    discarded: [
      "fit.summary session copy",
      "palette preference session copy",
      "all inter-agent reasoning traces",
    ],
    retained: ["order_id", "eta", "loyalty bump on Huckberry side"],
    ts: nextTs(),
  },
];

/* ------------------------------------------------------------------ */
/*  2. Travel alpha — Alex has 4 hours in Milan tomorrow.             */
/* ------------------------------------------------------------------ */

const travelEvents: EnclaveEvent[] = [
  {
    type: "enclave.open",
    enclave_id: "ENC-travel-001",
    participants: ["me.alex", "peer.craig_in_tokyo"],
    goal: "Find alpha for Alex's 4-hour Milan layover tomorrow.",
    constraints: [
      "No flight numbers / hotel leakage.",
      "Private introductions require principal approval.",
      "Prefer alpha over beta (aggregator) recommendations.",
    ],
    ts: nextTs(),
  },
  {
    type: "agent.thought",
    enclave_id: "ENC-travel-001",
    agent: "me.alex",
    content:
      "Craig's graph has signal on Milan — I know he was there March '24. I'll probe with a shape-card that doesn't pin Alex to specific flights.",
    ts: nextTs(),
  },
  {
    type: "card.exchange",
    enclave_id: "ENC-travel-001",
    card: {
      id: "t1",
      from: "me.alex",
      to: "peer.craig_in_tokyo",
      kind: "request",
      topic: "alpha.city",
      shape: "city=Milan:window=4h:traveler=carry-on:taste=standing-bars>tasting-menus",
      consideration: "reciprocal — Alex's Tokyo notes are yours",
    },
    ts: nextTs(),
  },
  {
    type: "card.exchange",
    enclave_id: "ENC-travel-001",
    card: {
      id: "t2",
      from: "peer.craig_in_tokyo",
      to: "me.alex",
      kind: "offer",
      topic: "alpha.milan",
      shape: "3 food picks + 1 walking route + 1 bar",
      teaser: "Primary, not aggregator. Indexable: no.",
    },
    ts: nextTs(),
  },
  {
    type: "card.exchange",
    enclave_id: "ENC-travel-001",
    card: {
      id: "t3",
      from: "me.alex",
      to: "peer.craig_in_tokyo",
      kind: "commit",
      topic: "alpha.milan",
      shape: "accept; do not persist my timing",
      conditions: ["ephemeral on close"],
    },
    ts: nextTs(),
  },
  {
    type: "data.reveal",
    enclave_id: "ENC-travel-001",
    from: "peer.craig_in_tokyo",
    to: "me.alex",
    payload: {
      food: [
        "Trippa — nose-to-tail; book the 12:30",
        "Pasticceria Marchesi — cornetto + espresso standing",
        "Bar Basso — Negroni Sbagliato (4 minutes, ask for Maurizio)",
      ],
      walk: "Brera → Cimitero Monumentale → tram 1 to Navigli at dusk",
      note: "Skip Duomo queue — you have 4 hours, don't burn them in line.",
    },
    under_card: "t3",
    ts: nextTs(),
  },
  {
    type: "card.exchange",
    enclave_id: "ENC-travel-001",
    card: {
      id: "t4",
      from: "peer.craig_in_tokyo",
      to: "me.alex",
      kind: "offer",
      topic: "alpha.introduction",
      shape: "warm intro to Matteo (design studio, Navigli)",
      teaser: "Matteo shows visitors the non-touristy side — if he's free.",
      conditions: ["needs_principal_approval", "Matteo also consents"],
    },
    ts: nextTs(),
  },
  {
    type: "agent.thought",
    enclave_id: "ENC-travel-001",
    agent: "me.alex",
    content:
      "Private intro = human-in-the-loop. I'll flag this to Alex rather than auto-accept. Matteo's surface area is a person, not data.",
    ts: nextTs(),
  },
  {
    type: "agent.message",
    enclave_id: "ENC-travel-001",
    from: "me.alex",
    to: "peer.craig_in_tokyo",
    content:
      "Flagging your intro offer to Alex. Food + walk accepted and discarded on close. Thanks — reciprocal Tokyo kit coming your way.",
    ts: nextTs(),
  },
  {
    type: "enclave.outcome",
    enclave_id: "ENC-travel-001",
    summary:
      "Alex leaves with 3 alpha food picks + a walking route. Craig's private intro pending human approval. No flight/hotel surface area leaked.",
    artifacts: {
      alpha_delivered: 4,
      pending_principal_approval: ["warm_intro.matteo"],
      reciprocal_queued: ["tokyo_alpha_for_craig"],
    },
    ts: nextTs(),
  },
  {
    type: "enclave.close",
    enclave_id: "ENC-travel-001",
    discarded: [
      "timing shape for Alex's Milan window",
      "inter-agent reasoning",
    ],
    retained: ["alpha_recommendations (for Alex)", "reciprocity_debt (for Craig)"],
    ts: nextTs(),
  },
];

/* ------------------------------------------------------------------ */
/*  3. B2B research — Fund wants datacenter alpha, won't reveal book. */
/* ------------------------------------------------------------------ */

const semiEvents: EnclaveEvent[] = [
  {
    type: "enclave.open",
    enclave_id: "ENC-semi-001",
    participants: ["me.fund", "analyst.semi"],
    goal: "Fund probes for data-center supply-chain coverage without disclosing its position.",
    constraints: [
      "Never reveal fund's direction of conviction.",
      "Reveal primary sources only once subscription shape is agreed.",
      "Each tier of interest depth requires matched tier of coverage proof.",
    ],
    ts: nextTs(),
  },
  {
    type: "agent.thought",
    enclave_id: "ENC-semi-001",
    agent: "me.fund",
    content:
      "Classic information-asymmetry market. I'll use Roth-style progressive disclosure: shape → sub-sector → vendor, each gated on their coverage proof.",
    ts: nextTs(),
  },
  {
    type: "card.exchange",
    enclave_id: "ENC-semi-001",
    card: {
      id: "s1",
      from: "me.fund",
      to: "analyst.semi",
      kind: "request",
      topic: "coverage.sector",
      shape: "ai_datacenter_supply_chain:yes|no",
    },
    ts: nextTs(),
  },
  {
    type: "card.exchange",
    enclave_id: "ENC-semi-001",
    card: {
      id: "s2",
      from: "analyst.semi",
      to: "me.fund",
      kind: "offer",
      topic: "coverage.sector",
      shape: "yes:multi-year:primary-sources",
      teaser: "6 switch vendors + power procurement, paper invoices held.",
      consideration: "no reveal without subscription tier agreed",
    },
    ts: nextTs(),
  },
  {
    type: "card.exchange",
    enclave_id: "ENC-semi-001",
    card: {
      id: "s3",
      from: "me.fund",
      to: "analyst.semi",
      kind: "request",
      topic: "coverage.sub_sector",
      shape: "networking_switch_share:quarterly:primary",
      conditions: ["confirm primary source before deeper interest disclosed"],
    },
    ts: nextTs(),
  },
  {
    type: "card.exchange",
    enclave_id: "ENC-semi-001",
    card: {
      id: "s4",
      from: "analyst.semi",
      to: "me.fund",
      kind: "commit",
      topic: "coverage.sub_sector",
      shape: "networking_switch_share:Q1-Q4 2025:class-A",
      teaser: "Paper invoice copies, quarter-dated, principal-verified.",
      consideration: "$65k/yr single-vendor unlocks name-level reveal",
    },
    ts: nextTs(),
  },
  {
    type: "agent.thought",
    enclave_id: "ENC-semi-001",
    agent: "me.fund",
    content:
      "They've proven sub-sector. I can now widen one notch — vendor shortlist — without revealing which way I'm leaning.",
    ts: nextTs(),
  },
  {
    type: "card.exchange",
    enclave_id: "ENC-semi-001",
    card: {
      id: "s5",
      from: "me.fund",
      to: "analyst.semi",
      kind: "offer",
      topic: "interest.shape",
      shape: "shortlist_of_6:position_direction=withheld",
      consideration: "$240k sector unlimited if any of 3 names are primary-covered",
    },
    ts: nextTs(),
  },
  {
    type: "card.exchange",
    enclave_id: "ENC-semi-001",
    card: {
      id: "s6",
      from: "analyst.semi",
      to: "me.fund",
      kind: "commit",
      topic: "match",
      shape: "3-of-6:class-A",
      consideration: "subscription tier: sector_unlimited",
    },
    ts: nextTs(),
  },
  {
    type: "data.reveal",
    enclave_id: "ENC-semi-001",
    from: "analyst.semi",
    to: "me.fund",
    payload: {
      tier: "sector_unlimited",
      covered_primary: ["VENDOR_A", "VENDOR_C", "VENDOR_F"],
      sample_artifact: "Q3 invoice copy — VENDOR_A — hyperscaler_2 — quantity redacted until subscription finalized",
    },
    under_card: "s6",
    ts: nextTs(),
  },
  {
    type: "enclave.outcome",
    enclave_id: "ENC-semi-001",
    summary:
      "Fund learned coverage depth on the names it cares about without disclosing direction. Analyst earned a sector-unlimited subscription without ever asking 'which way are you leaning?'.",
    artifacts: {
      subscription_tier: "sector_unlimited",
      fund_position_revealed: false,
      analyst_primary_sources_previewed: 3,
      value_exchanged: "$240k/yr research access",
    },
    ts: nextTs(),
  },
  {
    type: "enclave.close",
    enclave_id: "ENC-semi-001",
    discarded: [
      "fund's interest-shape shortlist",
      "interim negotiation reasoning",
    ],
    retained: ["subscription contract", "analyst primary-preview receipt"],
    ts: nextTs(),
  },
];

/* ------------------------------------------------------------------ */

export const scenarios: Record<string, Scenario> = {
  shopping: {
    id: "shopping",
    title: "Wardrobe triage",
    blurb:
      "Lucky's laundry got ruined at a hotel. His me-agent negotiates a 4-piece replacement with Huckberry — sells fit data at the summary level, never the biometric level.",
    goal: "Replace wardrobe basics in 72h without leaking PII.",
    constraints: [
      "No height/weight/income.",
      "Shape-only cards first; commits only against matched offers.",
      "Ephemeral: session wiped on close.",
    ],
    participants: ["me.lucky", "vendor.huckberry"],
    initiator: "me.lucky",
    script: shoppingEvents,
  },
  travel: {
    id: "travel",
    title: "Four hours in Milan",
    blurb:
      "Alex has a layover tomorrow and wants alpha — the kind friends-of-friends carry. Craig's me-agent holds it; progressive disclosure decides what crosses.",
    goal: "Surface alpha recommendations without leaking travel logistics.",
    constraints: [
      "No flight/hotel leakage.",
      "Private introductions require human-in-the-loop.",
      "Alpha > beta (aggregator).",
    ],
    participants: ["me.alex", "peer.craig_in_tokyo"],
    initiator: "me.alex",
    script: travelEvents,
  },
  semi: {
    id: "semi",
    title: "Coverage without confession",
    blurb:
      "A fund wants to know whether a sector analyst holds primary sources on three specific names — without betraying its book. Disclosure cards as market design (Roth nods).",
    goal: "Exchange proof-of-coverage for proof-of-interest, one tier at a time.",
    constraints: [
      "Fund never reveals direction of conviction.",
      "Analyst never asks for position; waits for voluntary shape widening.",
      "Each tier of disclosure gated on matched proof.",
    ],
    participants: ["me.fund", "analyst.semi"],
    initiator: "me.fund",
    script: semiEvents,
  },
};
