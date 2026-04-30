// agent.me — frontend app
// Vanilla TS-style module. No framework; the aesthetic does the heavy lifting.

const qs = (sel) => document.querySelector(sel);
const ce = (tag, props = {}, ...children) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") el.className = v;
    else if (k === "data") Object.assign(el.dataset, v);
    else if (k.startsWith("on") && typeof v === "function")
      el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v);
  }
  for (const c of children) {
    if (c == null) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
};

let scenarios = [];
let personas = [];
let selectedScenarioId = null;
let ws = null;
let running = false;
let mode = "mock"; // "mock" = scripted rehearsal, "live" = real goose subprocesses

// ----------- boot -----------

async function boot() {
  const [sRes, pRes] = await Promise.all([
    fetch("/api/scenarios").then((r) => r.json()),
    fetch("/api/personas").then((r) => r.json()),
  ]);
  scenarios = sRes;
  personas = pRes;

  renderTabs();
  renderPersonas();
  selectScenario(scenarios[0].id);
  connect();
}

function connect() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${proto}//${location.host}/ws`);
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.kind === "event") handleEvent(msg.event);
    else if (msg.kind === "started") onStart(msg);
    else if (msg.kind === "done") onDone();
    else if (msg.kind === "error") console.error(msg.error);
  };
  ws.onclose = () => setTimeout(connect, 1500);
}

// ----------- tabs / scenario header -----------

function renderTabs() {
  const host = qs("#scenarioTabs");
  host.innerHTML = "";
  scenarios.forEach((s, i) => {
    const tab = ce(
      "button",
      {
        class: "dossier-tab",
        data: { id: s.id },
        onclick: () => selectScenario(s.id),
      },
      ce("div", { class: "dt-no" }, `DOSSIER № ${String(i + 1).padStart(2, "0")}`),
      ce("div", { class: "dt-title" }, s.title),
      ce("div", { class: "dt-blurb" }, s.blurb),
    );
    host.append(tab);
  });
  highlightTab();
}

function highlightTab() {
  document.querySelectorAll(".dossier-tab").forEach((el) => {
    el.classList.toggle("active", el.dataset.id === selectedScenarioId);
  });
}

function selectScenario(id) {
  if (running) return;
  selectedScenarioId = id;
  highlightTab();
  const s = scenarios.find((x) => x.id === id);

  qs("#enclaveId").textContent = "(not yet open)";
  qs("#enclaveGoal").textContent = s.goal;

  const cons = qs("#enclaveConstraints");
  cons.innerHTML = "";
  s.constraints.forEach((c) =>
    cons.append(ce("span", { class: "constraint-chip" }, c)),
  );

  // set agent columns
  const [aId, bId] = s.participants;
  const pa = personas.find((p) => p.id === aId);
  const pb = personas.find((p) => p.id === bId);
  qs("#nameA").textContent = pa.display_name;
  qs("#roleA").textContent = pa.role;
  qs("#nameB").textContent = pb.display_name;
  qs("#roleB").textContent = pb.role;
  qs("#avatarA").dataset.role = pa.role;
  qs("#avatarB").dataset.role = pb.role;
  qs("#avatarA").firstElementChild.textContent = initials(pa.display_name);
  qs("#avatarB").firstElementChild.textContent = initials(pb.display_name);

  // clear floors
  qs("#thoughtsA").innerHTML = "";
  qs("#thoughtsB").innerHTML = "";
  qs("#railStream").innerHTML = "";
  qs("#outcomeSlot").innerHTML = "";

  qs("#runBtn").disabled = false;
}

function initials(name) {
  return name
    .replace(/'s me-agent/i, "")
    .replace(/ me-agent/i, "")
    .replace(/agent/i, "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2) || "??";
}

// ----------- run / stream -----------

qs("#runBtn").addEventListener("click", () => {
  if (running || !ws || ws.readyState !== WebSocket.OPEN) return;
  // clear state before a fresh run
  qs("#thoughtsA").innerHTML = "";
  qs("#thoughtsB").innerHTML = "";
  qs("#railStream").innerHTML = "";
  qs("#outcomeSlot").innerHTML = "";

  // When live, show a banner up front so the viewer knows what's running.
  if (mode === "live") {
    qs("#railStream").append(
      (() => {
        const el = document.createElement("div");
        el.className = "tick";
        el.textContent =
          "⏳ spawning real `goose run` subprocesses — first tokens can take 5–15s";
        return el;
      })(),
    );
  }

  ws.send(
    JSON.stringify({
      kind: "run",
      scenario: selectedScenarioId,
      mode,
      speed: 0.5,
    }),
  );
});

// mode toggle wiring
document.querySelectorAll(".mode-opt").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (running) return;
    mode = btn.dataset.mode;
    document.querySelectorAll(".mode-opt").forEach((b) => {
      const active = b.dataset.mode === mode;
      b.classList.toggle("active", active);
      b.setAttribute("aria-checked", active ? "true" : "false");
    });
  });
});

qs("#resetBtn").addEventListener("click", () => {
  selectScenario(selectedScenarioId);
});

function onStart(msg) {
  running = true;
  qs("#runBtn").disabled = true;
  qs("#enclaveId").textContent = msg.enclave_id;
}
function onDone() {
  running = false;
  qs("#runBtn").disabled = false;
}

// ----------- event rendering -----------

function handleEvent(ev) {
  switch (ev.type) {
    case "enclave.open":
      qs("#enclaveId").textContent = ev.enclave_id;
      break;
    case "agent.thought":
      appendThought(ev.agent, ev.content);
      break;
    case "agent.message":
      appendSay(ev.from, ev.to, ev.content);
      break;
    case "card.exchange":
      appendCard(ev.card);
      break;
    case "data.reveal":
      appendReveal(ev.from, ev.to, ev.payload, ev.under_card);
      break;
    case "enclave.outcome":
      appendOutcome(ev.summary, ev.artifacts);
      break;
    case "enclave.close":
      appendCloseBand(ev.discarded, ev.retained);
      break;
  }
}

function columnFor(agentId) {
  const s = scenarios.find((x) => x.id === selectedScenarioId);
  return s.participants[0] === agentId ? "A" : "B";
}

function appendThought(agent, content) {
  const col = columnFor(agent);
  const host = qs(col === "A" ? "#thoughtsA" : "#thoughtsB");
  const isTrace = typeof content === "string" &&
    (content.startsWith("[trace]") || content.startsWith("[stderr]") || content.startsWith("[exit]"));
  host.append(ce("div", { class: `thought ${isTrace ? "trace" : ""}` }, content));
  host.lastElementChild.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function appendSay(from, to, content) {
  // spoken messages get dropped into the sender's column as a more solid block
  const col = columnFor(from);
  const host = qs(col === "A" ? "#thoughtsA" : "#thoughtsB");
  const p = personas.find((x) => x.id === from);
  host.append(
    ce(
      "div",
      { class: "say" },
      ce(
        "div",
        { class: "say-from" },
        `${p?.display_name ?? from} → ${to}`,
      ),
      content,
    ),
  );
  host.lastElementChild.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// Normalize any field to a readable string. Live agents sometimes ship objects
// where the protocol asks for a string; render them as compact pretty JSON.
function asText(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function asList(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(asText);
  if (typeof v === "string") return [v];
  return [asText(v)];
}

function appendCard(card) {
  const stream = qs("#railStream");
  const fromCol = columnFor(card.from);
  const side = fromCol === "A" ? "from-left" : "from-right";

  const shapeText = asText(card.shape);
  const isMultilineShape = shapeText.includes("\n") || shapeText.length > 80;
  const shapeNode = ce(
    isMultilineShape ? "pre" : "div",
    { class: "card-shape" },
    shapeText,
  );

  const conds = asList(card.conditions);
  const node = ce(
    "div",
    { class: `card ${side}` },
    ce("span", { class: "card-stamp" }, `CARD № ${String(card.id ?? "—").toUpperCase()}`),
    ce(
      "div",
      { class: "card-header" },
      ce("span", { class: "card-kind", data: { kind: card.kind } }, card.kind),
      ce(
        "div",
        { class: "card-routing" },
        `${card.from}`,
        ce("br"),
        `→ ${card.to}`,
      ),
    ),
    ce("h4", { class: "card-topic" }, asText(card.topic)),
    shapeNode,
    card.teaser ? ce("div", { class: "card-teaser" }, `“${asText(card.teaser)}”`) : null,
    conds.length
      ? ce("div", { class: "card-extra" }, `conditions: ${conds.join(" · ")}`)
      : null,
    card.consideration
      ? ce("div", { class: "card-extra" }, `consideration: ${asText(card.consideration)}`)
      : null,
  );
  stream.append(node);
  node.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function appendReveal(from, to, payload, underCard) {
  const stream = qs("#railStream");
  const node = ce(
    "div",
    { class: "reveal" },
    ce(
      "div",
      { class: "reveal-head" },
      ce("span", {}, `REVEAL · ${from} → ${to}`),
      ce("span", { class: "under" }, `under ${underCard}`),
    ),
    ce("pre", {}, JSON.stringify(payload, null, 2)),
  );
  stream.append(node);
  node.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function appendOutcome(summary, artifacts) {
  const host = qs("#outcomeSlot");
  host.innerHTML = "";
  const artifactNodes = Object.entries(artifacts).map(([k, v]) =>
    ce(
      "div",
      {},
      ce("strong", {}, k),
      typeof v === "object" ? JSON.stringify(v) : String(v),
    ),
  );
  host.append(
    ce(
      "div",
      { class: "outcome" },
      ce("div", { class: "outcome-label" }, "OUTCOME · crossed the enclave threshold"),
      ce("div", { class: "outcome-body" }, summary),
      ce("div", { class: "outcome-artifacts" }, ...artifactNodes),
    ),
  );
}

function appendCloseBand(discarded, retained) {
  const host = qs("#outcomeSlot");
  host.append(
    ce(
      "div",
      { class: "closeband" },
      ce("strong", {}, "room closed ·"),
      ce("span", { class: "burn" }, `burned: ${discarded.length} items`),
      "·",
      ce("span", { class: "keep" }, `kept: ${retained.join(", ")}`),
    ),
  );
}

// ----------- personas -----------

function renderPersonas() {
  const host = qs("#personaGrid");
  host.innerHTML = "";
  personas.forEach((p) => {
    host.append(
      ce(
        "article",
        { class: "persona" },
        ce(
          "header",
          { class: "persona-header" },
          ce("h3", { class: "persona-name" }, p.display_name),
          ce("span", { class: "persona-role" }, p.role),
        ),
        ce("p", { class: "persona-line" }, p.one_liner),
        ce("div", { class: "persona-section" }, "Connected sources"),
        ce(
          "div",
          { class: "persona-sources" },
          ...p.sources.map((s) => ce("span", { class: "source-chip" }, s)),
        ),
        ce("div", { class: "persona-section" }, "Derived intelligence"),
        ce(
          "ul",
          { class: "intel-list" },
          ...p.intelligence.map((i) =>
            ce(
              "li",
              { class: "intel-item" },
              ce("span", { class: "intel-key" }, i.key),
              ce("span", { class: "intel-val" }, i.value),
              ce(
                "span",
                { class: "intel-sens", data: { s: i.sensitivity } },
                i.sensitivity,
              ),
            ),
          ),
        ),
      ),
    );
  });
}

// ----------- go -----------
boot();
