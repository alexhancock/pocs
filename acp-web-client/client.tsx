/**
 * ACP Web Client — single page app.
 *
 * One React tree, two transports. The browser speaks the Agent Client Protocol
 * to a fresh build of goose either:
 *   • stdio  — through the local node bridge to `goose acp`, or
 *   • http/ws — straight to `goose serve` over a WebSocket.
 *
 * Swiss design: white field, ink (#111), one red accent (#E5322D), serif
 * display type, a single thin-stroke line mark.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";

import * as acp from "@agentclientprotocol/sdk";
import { createWebSocketStream } from "@agentclientprotocol/sdk/experimental/ws-client";

import { openHttpSession, type LogEntry } from "./transport.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Transport = "stdio" | "http";
type Status = "idle" | "connecting" | "ready" | "thinking" | "error";

interface ToolCall {
  id: string;
  title: string;
  status: string;
}

interface Turn {
  id: string;
  role: "user" | "agent";
  text: string;
  thought?: string;
  tools?: ToolCall[];
  stopReason?: string;
}

interface AppConfig {
  stdioBridgeUrl: string;
  serveWsUrl: string;
  serveHttpUrl: string;
}

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const INK = "#111111";
const RED = "#E5322D";
const PAPER = "#FFFFFF";
const FAINT = "#E7E7E4";
const MUTE = "#8A8A85";
const SERIF = `"Newsreader", Georgia, serif`;
const SANS = `"IBM Plex Sans", system-ui, sans-serif`;
const MONO = `"IBM Plex Mono", ui-monospace, monospace`;

// ---------------------------------------------------------------------------
// The line mark from the title slide — a remote emitting a signal.
// ---------------------------------------------------------------------------
function RemoteMark({ size = 44, live }: { size?: number; live: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 600 600" aria-hidden>
      <g
        transform="translate(250 300)"
        strokeWidth={10}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <rect x={-150} y={-95} width={180} height={190} rx={24} stroke={INK} />
        <circle cx={-60} cy={0} r={22} stroke={INK} />
        <line x1={-60} y1={-48} x2={-60} y2={-30} stroke={INK} />
        <line x1={-60} y1={30} x2={-60} y2={48} stroke={INK} />
        <line x1={-108} y1={0} x2={-90} y2={0} stroke={INK} />
        <line x1={-30} y1={0} x2={-12} y2={0} stroke={INK} />
        <line x1={30} y1={0} x2={58} y2={0} stroke={INK} />
        <path
          d="M92 -52 A78 78 0 0 1 92 52"
          stroke={live ? RED : FAINT}
          style={{ transition: "stroke .4s" }}
        />
        <path
          d="M126 -86 A126 126 0 0 1 126 86"
          stroke={live ? RED : FAINT}
          style={{ transition: "stroke .4s .05s" }}
        />
        <path
          d="M160 -120 A174 174 0 0 1 160 120"
          stroke={live ? RED : FAINT}
          style={{ transition: "stroke .4s .1s" }}
        />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Connection wrapper — owns the ACP session for one transport.
// ---------------------------------------------------------------------------
interface LiveSession {
  session: acp.ActiveSession;
  connection: acp.ClientConnection;
  agentName: string;
  agentVersion: string;
  mode: "stdio" | "ws" | "http";
  close: () => void;
}

async function openSession(
  transport: Transport,
  config: AppConfig,
  onPermission: (title: string) => void,
  log: (entry: LogEntry) => void,
): Promise<LiveSession> {
  // http/ws goes through the dedicated, instrumented frontend transport module
  // so its connection failures are logged in detail.
  if (transport === "http") {
    return openHttpSession({
      wsUrl: config.serveWsUrl,
      httpUrl: config.serveHttpUrl,
      mode: "ws",
      cwd: workingDir(),
      onPermission,
      log,
    });
  }

  // stdio goes through the local node bridge (server.ts → `goose acp`).
  const stream = createWebSocketStream(config.stdioBridgeUrl, { WebSocket });

  const app = acp
    .client({ name: "acp-web-client" })
    .onRequest(acp.methods.client.session.requestPermission, async (ctx) => {
      // Auto-allow for a frictionless demo, but surface it in the UI.
      onPermission(ctx.params.toolCall?.title ?? "permission");
      const option =
        ctx.params.options.find((o) => o.kind === "allow_always") ??
        ctx.params.options.find((o) => o.kind === "allow_once") ??
        ctx.params.options[0];
      return {
        outcome: { outcome: "selected", optionId: option?.optionId ?? "allow" },
      };
    });

  const connection = app.connect(stream);
  const ctx = connection.agent;

  const init = await ctx.request(acp.methods.agent.initialize, {
    protocolVersion: acp.PROTOCOL_VERSION,
    clientCapabilities: {},
  });

  const session = await ctx.buildSession(workingDir()).start();

  return {
    session,
    connection,
    agentName: init.agentInfo?.name ?? "agent",
    agentVersion: init.agentInfo?.version ?? "",
    mode: "stdio",
    close: () => connection.close(),
  };
}

function workingDir(): string {
  // The agent runs locally; point it at the demo project directory.
  return "/Users/alexhancock/Development/pocs/acp-web-client";
}

// A typewriter that smooths bursty token arrival. Text is pushed in as it
// arrives off the wire; it's revealed on each animation frame by easing out a
// fraction of the unrevealed gap (so it catches up fast after a burst but
// glides when nearly caught up). `finish()` resolves once everything is shown.
function createTypewriter(onText: (shown: string) => void) {
  let target = "";
  let shown = 0;
  let raf = 0;
  let finalized = false;
  let resolveDone: (() => void) | null = null;

  const tick = () => {
    const gap = target.length - shown;
    if (gap > 0) {
      shown = Math.min(target.length, shown + Math.max(2, Math.ceil(gap * 0.2)));
      onText(target.slice(0, shown));
    }
    if (finalized && shown >= target.length) {
      raf = 0;
      resolveDone?.();
      resolveDone = null;
      return;
    }
    raf = requestAnimationFrame(tick);
  };

  return {
    push(text: string) {
      target += text;
      if (!raf) raf = requestAnimationFrame(tick);
    },
    finish(): Promise<void> {
      finalized = true;
      if (!raf && shown >= target.length) return Promise.resolve();
      return new Promise<void>((res) => (resolveDone = res));
    },
    cancel() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      resolveDone?.();
    },
  };
}

function formatDetail(detail: unknown): string {
  if (detail instanceof Error) return `— ${detail.message}`;
  if (typeof detail === "string") return `— ${detail}`;
  try {
    return `— ${JSON.stringify(detail)}`;
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [transport, setTransport] = useState<Transport>("stdio");
  const [status, setStatus] = useState<Status>("idle");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [agentLabel, setAgentLabel] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  const liveRef = useRef<LiveSession | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const log = useCallback((entry: LogEntry) => {
    setLogs((prev) => [...prev.slice(-199), entry]);
    if (entry.level === "error") setShowLogs(true);
  }, []);

  useEffect(() => {
    fetch("/config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setNote("could not load /config"));
  }, []);

  // Keep the transcript pinned to the bottom while streaming. Use instant jumps,
  // not smooth scrolling — a smooth animation restarted on every token reads as
  // stutter. Only auto-follow when the user is already near the bottom, so
  // scrolling up to re-read isn't fought.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [turns]);

  const teardown = useCallback(() => {
    liveRef.current?.close();
    liveRef.current = null;
  }, []);

  // Reconnect whenever the transport changes.
  useEffect(() => {
    if (!config) return;
    let cancelled = false;
    setStatus("connecting");
    setTurns([]);
    setNote(null);
    setLogs([]);
    teardown();

    openSession(
      transport,
      config,
      (title) => setNote(`auto-approved: ${title}`),
      log,
    )
      .then((live) => {
        if (cancelled) {
          live.close();
          return;
        }
        liveRef.current = live;
        setAgentLabel(
          `${live.agentName}${live.agentVersion ? " " + live.agentVersion : ""}`,
        );
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setNote(String(err?.message ?? err));
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [transport, config, teardown, log]);

  const send = useCallback(async () => {
    const live = liveRef.current;
    const text = draft.trim();
    if (!live || !text || status === "thinking") return;

    setDraft("");
    const userTurn: Turn = { id: crypto.randomUUID(), role: "user", text };
    const agentTurn: Turn = {
      id: crypto.randomUUID(),
      role: "agent",
      text: "",
      tools: [],
    };
    setTurns((t) => [...t, userTurn, agentTurn]);
    setStatus("thinking");

    const patch = (fn: (t: Turn) => Turn) =>
      setTurns((all) =>
        all.map((t) => (t.id === agentTurn.id ? fn(t) : t)),
      );

    // The model emits tokens in bursts; feeding them straight to the DOM looks
    // choppy. Buffer text in a typewriter that reveals it at a steady rate.
    const typer = createTypewriter((shown) =>
      patch((t) => ({ ...t, text: shown })),
    );

    try {
      // Fire the prompt but don't await it — `prompt()` only resolves once the
      // whole turn is done, which would queue every update before we read any.
      // Draining `nextUpdate()` concurrently lets chunks render as they arrive.
      const done = live.session.prompt(text);
      done.catch(() => {}); // surfaced via the nextUpdate() loop / stop message
      for (;;) {
        const msg = await live.session.nextUpdate();
        if (msg.kind === "stop") {
          await typer.finish();
          patch((t) => ({ ...t, stopReason: msg.stopReason }));
          break;
        }
        const u = msg.update;
        switch (u.sessionUpdate) {
          case "agent_message_chunk": {
            const c = u.content;
            if (c.type === "text") typer.push(c.text);
            break;
          }
          case "agent_thought_chunk": {
            const c = u.content;
            if (c.type === "text")
              patch((t) => ({
                ...t,
                thought: (t.thought ?? "") + c.text,
              }));
            break;
          }
          case "tool_call":
            patch((t) => ({
              ...t,
              tools: [
                ...(t.tools ?? []),
                {
                  id: u.toolCallId,
                  title: u.title ?? u.toolCallId,
                  status: u.status ?? "pending",
                },
              ],
            }));
            break;
          case "tool_call_update":
            patch((t) => ({
              ...t,
              tools: (t.tools ?? []).map((c) =>
                c.id === u.toolCallId
                  ? { ...c, status: u.status ?? c.status }
                  : c,
              ),
            }));
            break;
          default:
            break;
        }
      }
    } catch (err) {
      console.error(err);
      typer.cancel();
      patch((t) => ({ ...t, text: t.text || `· error: ${String(err)}` }));
      setNote(String((err as Error)?.message ?? err));
    } finally {
      setStatus("ready");
    }
  }, [draft, status]);

  const transports = useMemo(
    () =>
      [
        { id: "stdio" as const, label: "stdio", sub: "goose acp" },
        { id: "http" as const, label: "http / ws", sub: "goose serve" },
      ],
    [],
  );

  const connected = status === "ready" || status === "thinking";

  return (
    <div style={S.shell}>
      <div style={S.frame}>
        {/* Masthead ------------------------------------------------------ */}
        <header style={S.masthead}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <RemoteMark live={connected} />
            <div>
              <h1 style={S.title}>the universal remote for ai</h1>
              <p style={S.kicker}>
                agent client protocol · one client, any agent
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setShowLogs((v) => !v)}
              style={{
                ...S.logToggle,
                color: logs.some((l) => l.level === "error") ? RED : MUTE,
                borderColor: logs.some((l) => l.level === "error")
                  ? RED
                  : FAINT,
              }}
              title="connection log"
            >
              log{logs.length ? ` · ${logs.length}` : ""}
            </button>
            <StatusPill status={status} label={agentLabel} />
          </div>
        </header>

        <div style={S.rule} />

        {/* Transport toggle --------------------------------------------- */}
        <section style={S.controls}>
          <span style={S.controlLabel}>transport</span>
          <div style={S.toggle}>
            {transports.map((t) => {
              const active = transport === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTransport(t.id)}
                  style={{
                    ...S.toggleBtn,
                    ...(active ? S.toggleBtnActive : null),
                  }}
                >
                  <span style={S.toggleMain}>{t.label}</span>
                  <span
                    style={{
                      ...S.toggleSub,
                      color: active ? PAPER : MUTE,
                    }}
                  >
                    {t.sub}
                  </span>
                </button>
              );
            })}
          </div>
          <span style={S.endpoint}>
            {transport === "stdio"
              ? config?.stdioBridgeUrl
              : config?.serveWsUrl}
          </span>
        </section>

        {/* Transcript ---------------------------------------------------- */}
        <main ref={scrollRef} style={S.transcript}>
          {turns.length === 0 && status !== "connecting" && (
            <Empty transport={transport} />
          )}
          {status === "connecting" && (
            <p style={S.systemLine}>· establishing {transport} session …</p>
          )}
          {turns.map((t) => (
            <TurnView key={t.id} turn={t} />
          ))}
        </main>

        {/* Composer ------------------------------------------------------ */}
        <footer style={S.composer}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder={
              connected
                ? "send a message to goose…"
                : "connecting to the agent…"
            }
            rows={1}
            disabled={!connected}
            style={S.input}
          />
          <button
            onClick={() => void send()}
            disabled={!connected || !draft.trim() || status === "thinking"}
            style={{
              ...S.sendBtn,
              opacity:
                !connected || !draft.trim() || status === "thinking" ? 0.4 : 1,
            }}
          >
            {status === "thinking" ? "…" : "send"}
          </button>
        </footer>

        {note && <div style={S.note}>{note}</div>}

        {showLogs && (
          <div style={S.logPanel}>
            <div style={S.logHeader}>
              <span>connection log</span>
              <button onClick={() => setLogs([])} style={S.logClear}>
                clear
              </button>
            </div>
            <div style={S.logBody}>
              {logs.length === 0 && (
                <div style={{ color: MUTE }}>no events yet</div>
              )}
              {logs.map((l, i) => (
                <div key={i} style={S.logRow}>
                  <span style={S.logTime}>
                    {new Date(l.ts).toLocaleTimeString([], {
                      hour12: false,
                    })}
                  </span>
                  <span
                    style={{
                      ...S.logScope,
                      color:
                        l.level === "error"
                          ? RED
                          : l.level === "warn"
                            ? "#b8860b"
                            : MUTE,
                    }}
                  >
                    {l.scope}
                  </span>
                  <span
                    style={{
                      color: l.level === "error" ? RED : INK,
                    }}
                  >
                    {l.message}
                    {l.detail !== undefined && (
                      <span style={{ color: MUTE }}>
                        {" "}
                        {formatDetail(l.detail)}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------
function StatusPill({ status, label }: { status: Status; label: string }) {
  const map: Record<Status, { text: string; color: string }> = {
    idle: { text: "idle", color: MUTE },
    connecting: { text: "connecting", color: MUTE },
    ready: { text: label || "connected", color: INK },
    thinking: { text: "thinking", color: RED },
    error: { text: "error", color: RED },
  };
  const s = map[status];
  return (
    <div style={S.pill}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 8,
          background: s.color,
          ...(status === "thinking"
            ? { animation: "pulse 1s ease-in-out infinite" }
            : null),
        }}
      />
      <span style={{ color: s.color }}>{s.text}</span>
    </div>
  );
}

function Empty({ transport }: { transport: Transport }) {
  return (
    <div style={S.empty}>
      <p style={S.emptyHead}>
        connected over{" "}
        <em style={{ color: RED, fontStyle: "normal" }}>
          {transport === "stdio" ? "stdio" : "http / ws"}
        </em>
      </p>
      <p style={S.emptyBody}>
        The same client speaks the Agent Client Protocol to the same agent —
        only the transport underneath has changed. Ask goose anything.
      </p>
    </div>
  );
}

function TurnView({ turn }: { turn: Turn }) {
  if (turn.role === "user") {
    return (
      <div style={S.userRow}>
        <span style={S.roleTag}>you</span>
        <p style={S.userText}>{turn.text}</p>
      </div>
    );
  }
  return (
    <div style={S.agentRow}>
      <span style={{ ...S.roleTag, color: RED }}>goose</span>
      <div style={{ flex: 1 }}>
        {turn.thought && <p style={S.thought}>{turn.thought}</p>}
        {turn.tools && turn.tools.length > 0 && (
          <div style={S.tools}>
            {turn.tools.map((c) => (
              <span key={c.id} style={S.tool}>
                <span style={S.toolDot(c.status)} />
                {c.title}
              </span>
            ))}
          </div>
        )}
        <p style={S.agentText}>
          {turn.text}
          {!turn.stopReason && <span style={S.caret}>▍</span>}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const S = {
  shell: {
    minHeight: "100vh",
    background: PAPER,
    color: INK,
    display: "flex",
    justifyContent: "center",
    fontFamily: SANS,
  } as React.CSSProperties,
  frame: {
    width: "min(820px, 100%)",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    padding: "48px 40px 28px",
    boxSizing: "border-box",
  } as React.CSSProperties,
  masthead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 24,
  } as React.CSSProperties,
  title: {
    fontFamily: SERIF,
    fontWeight: 600,
    fontSize: 30,
    lineHeight: 1.05,
    letterSpacing: "-0.01em",
    margin: 0,
  } as React.CSSProperties,
  kicker: {
    margin: "6px 0 0",
    fontSize: 12.5,
    color: MUTE,
    letterSpacing: "0.02em",
  } as React.CSSProperties,
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontFamily: MONO,
    fontSize: 12,
    border: `1px solid ${FAINT}`,
    padding: "6px 11px",
    borderRadius: 999,
    whiteSpace: "nowrap",
  } as React.CSSProperties,
  rule: { height: 1, background: INK, margin: "26px 0 22px" } as React.CSSProperties,
  controls: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  } as React.CSSProperties,
  controlLabel: {
    fontFamily: MONO,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: MUTE,
  } as React.CSSProperties,
  toggle: {
    display: "inline-flex",
    border: `1px solid ${INK}`,
    borderRadius: 12,
    overflow: "hidden",
  } as React.CSSProperties,
  toggleBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 1,
    padding: "9px 18px",
    background: PAPER,
    color: INK,
    border: "none",
    borderRight: `1px solid ${INK}`,
    cursor: "pointer",
    font: "inherit",
  } as React.CSSProperties,
  toggleBtnActive: { background: INK, color: PAPER } as React.CSSProperties,
  toggleMain: {
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: "0.01em",
  } as React.CSSProperties,
  toggleSub: { fontFamily: MONO, fontSize: 10.5 } as React.CSSProperties,
  endpoint: {
    fontFamily: MONO,
    fontSize: 11.5,
    color: MUTE,
    marginLeft: "auto",
  } as React.CSSProperties,
  transcript: {
    flex: 1,
    marginTop: 24,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 26,
    paddingRight: 4,
  } as React.CSSProperties,
  empty: { maxWidth: 460, marginTop: 8 } as React.CSSProperties,
  emptyHead: {
    fontFamily: SERIF,
    fontSize: 22,
    fontWeight: 500,
    margin: 0,
  } as React.CSSProperties,
  emptyBody: {
    fontSize: 14.5,
    lineHeight: 1.55,
    color: MUTE,
    margin: "10px 0 0",
  } as React.CSSProperties,
  systemLine: {
    fontFamily: MONO,
    fontSize: 12.5,
    color: MUTE,
  } as React.CSSProperties,
  userRow: { display: "flex", gap: 14, alignItems: "baseline" } as React.CSSProperties,
  agentRow: { display: "flex", gap: 14, alignItems: "baseline" } as React.CSSProperties,
  roleTag: {
    fontFamily: MONO,
    fontSize: 10.5,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: MUTE,
    width: 44,
    flexShrink: 0,
    paddingTop: 3,
  } as React.CSSProperties,
  userText: {
    margin: 0,
    fontSize: 16,
    fontFamily: SERIF,
    lineHeight: 1.5,
  } as React.CSSProperties,
  agentText: {
    margin: 0,
    fontSize: 15.5,
    lineHeight: 1.62,
    whiteSpace: "pre-wrap",
  } as React.CSSProperties,
  thought: {
    margin: "0 0 8px",
    fontSize: 13,
    fontStyle: "italic",
    color: MUTE,
    lineHeight: 1.5,
    borderLeft: `2px solid ${FAINT}`,
    paddingLeft: 12,
    whiteSpace: "pre-wrap",
  } as React.CSSProperties,
  tools: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    margin: "0 0 10px",
  } as React.CSSProperties,
  tool: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    fontFamily: MONO,
    fontSize: 11.5,
    border: `1px solid ${FAINT}`,
    borderRadius: 7,
    padding: "4px 9px",
  } as React.CSSProperties,
  toolDot: (status: string): React.CSSProperties => ({
    width: 6,
    height: 6,
    borderRadius: 6,
    background:
      status === "completed" ? INK : status === "failed" ? RED : MUTE,
  }),
  caret: { color: RED, marginLeft: 1 } as React.CSSProperties,
  composer: {
    display: "flex",
    gap: 12,
    alignItems: "flex-end",
    borderTop: `1px solid ${INK}`,
    paddingTop: 18,
    marginTop: 20,
  } as React.CSSProperties,
  input: {
    flex: 1,
    resize: "none",
    border: "none",
    outline: "none",
    background: "transparent",
    font: "inherit",
    fontSize: 16,
    fontFamily: SERIF,
    lineHeight: 1.5,
    color: INK,
    maxHeight: 160,
  } as React.CSSProperties,
  sendBtn: {
    background: INK,
    color: PAPER,
    border: "none",
    borderRadius: 10,
    padding: "10px 22px",
    fontFamily: MONO,
    fontSize: 13,
    letterSpacing: "0.04em",
    cursor: "pointer",
  } as React.CSSProperties,
  note: {
    marginTop: 12,
    fontFamily: MONO,
    fontSize: 11.5,
    color: RED,
  } as React.CSSProperties,
  logToggle: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: "0.04em",
    background: PAPER,
    border: `1px solid ${FAINT}`,
    borderRadius: 999,
    padding: "6px 11px",
    cursor: "pointer",
  } as React.CSSProperties,
  logPanel: {
    marginTop: 14,
    border: `1px solid ${FAINT}`,
    borderRadius: 12,
    overflow: "hidden",
  } as React.CSSProperties,
  logHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "9px 14px",
    borderBottom: `1px solid ${FAINT}`,
    fontFamily: MONO,
    fontSize: 10.5,
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: MUTE,
  } as React.CSSProperties,
  logClear: {
    fontFamily: MONO,
    fontSize: 10.5,
    letterSpacing: "0.06em",
    background: "transparent",
    border: "none",
    color: MUTE,
    cursor: "pointer",
    textTransform: "uppercase",
  } as React.CSSProperties,
  logBody: {
    maxHeight: 220,
    overflowY: "auto",
    padding: "10px 14px",
    fontFamily: MONO,
    fontSize: 11.5,
    lineHeight: 1.55,
    display: "flex",
    flexDirection: "column",
    gap: 3,
  } as React.CSSProperties,
  logRow: {
    display: "grid",
    gridTemplateColumns: "72px 90px 1fr",
    gap: 10,
    alignItems: "baseline",
  } as React.CSSProperties,
  logTime: { color: MUTE } as React.CSSProperties,
  logScope: {
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  } as React.CSSProperties,
};

// ---------------------------------------------------------------------------
// Mount
// ---------------------------------------------------------------------------
const style = document.createElement("style");
style.textContent = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: ${PAPER}; }
  ::selection { background: ${RED}; color: ${PAPER}; }
  textarea::placeholder { color: ${MUTE}; font-style: italic; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.25; } }
  ::-webkit-scrollbar { width: 8px; }
  ::-webkit-scrollbar-thumb { background: ${FAINT}; border-radius: 8px; }
`;
document.head.appendChild(style);

createRoot(document.getElementById("root")!).render(<App />);
