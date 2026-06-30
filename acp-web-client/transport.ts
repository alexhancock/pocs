/**
 * Frontend transport module.
 *
 * Owns connecting the browser directly to `goose serve` for the http/ws case,
 * with verbose, structured logging at every stage so connection failures are
 * easy to diagnose from the dev console (and surfaceable in the UI).
 *
 * The stdio case is intentionally NOT here — that path goes through the node
 * bridge in server.ts. This module is the place to debug the direct
 * browser → `goose serve` connection.
 */
import * as acp from "@agentclientprotocol/sdk";
import {
  createWebSocketStream,
  type WebSocketStreamOptions,
} from "@agentclientprotocol/sdk/experimental/ws-client";
import { createHttpStream } from "@agentclientprotocol/sdk/experimental/http-client";

export type HttpMode = "ws" | "http";

export interface LogEntry {
  ts: number;
  level: "info" | "warn" | "error";
  scope: string;
  message: string;
  detail?: unknown;
}

export type Logger = (entry: LogEntry) => void;

export interface PermissionPrompt {
  (title: string): void;
}

export interface OpenHttpSessionOptions {
  /** WebSocket URL for `goose serve`, e.g. ws://127.0.0.1:3284/acp */
  wsUrl: string;
  /** HTTP (streamable) URL for `goose serve`, e.g. http://127.0.0.1:3284/acp */
  httpUrl: string;
  /** Which underlying transport to use. */
  mode: HttpMode;
  /** Absolute cwd handed to the agent for `session/new`. */
  cwd: string;
  /** Optional secret if the server requires X-Secret-Key auth. */
  secretKey?: string;
  /** Called when the agent asks for a tool permission (auto-approved). */
  onPermission?: PermissionPrompt;
  /** Structured log sink. Defaults to console. */
  log?: Logger;
}

export interface HttpSession {
  session: acp.ActiveSession;
  connection: acp.ClientConnection;
  agentName: string;
  agentVersion: string;
  mode: HttpMode;
  close: () => void;
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------
function makeLogger(sink?: Logger): Logger {
  return (entry) => {
    const tag = `%c[http/${entry.scope}]`;
    const style =
      entry.level === "error"
        ? "color:#E5322D;font-weight:600"
        : entry.level === "warn"
          ? "color:#b8860b"
          : "color:#8A8A85";
    const args: unknown[] = [tag, style, entry.message];
    if (entry.detail !== undefined) args.push(entry.detail);
    // eslint-disable-next-line no-console
    (console[entry.level] ?? console.log)(...args);
    sink?.(entry);
  };
}

// ---------------------------------------------------------------------------
// Preflight — check the endpoint is reachable and report exactly why not.
// This catches the common hang/failure modes (server down, 401 auth, CORS)
// before we hand off to the SDK, where the failure is otherwise opaque.
// ---------------------------------------------------------------------------
async function preflight(
  httpUrl: string,
  secretKey: string | undefined,
  log: Logger,
): Promise<void> {
  // Probe the sibling /health endpoint that `goose serve` exposes.
  const healthUrl = new URL(httpUrl);
  healthUrl.pathname = "/health";

  log({
    ts: Date.now(),
    level: "info",
    scope: "preflight",
    message: `probing ${healthUrl.toString()}`,
  });

  try {
    const res = await fetch(healthUrl.toString(), {
      method: "GET",
      headers: secretKey ? { "X-Secret-Key": secretKey } : undefined,
    });
    if (res.ok) {
      log({
        ts: Date.now(),
        level: "info",
        scope: "preflight",
        message: `server reachable (health ${res.status})`,
      });
      return;
    }
    if (res.status === 401) {
      log({
        ts: Date.now(),
        level: "error",
        scope: "preflight",
        message:
          "server returned 401 — it requires X-Secret-Key auth. Set the secret or run goose serve without GOOSE_SERVER__SECRET_KEY.",
      });
      return;
    }
    log({
      ts: Date.now(),
      level: "warn",
      scope: "preflight",
      message: `health endpoint responded ${res.status}`,
    });
  } catch (err) {
    // A network error here almost always means the server isn't running, the
    // port is wrong, or CORS blocked the request.
    log({
      ts: Date.now(),
      level: "error",
      scope: "preflight",
      message:
        "could not reach the server — is `goose serve` running on this host/port? (network error / CORS / wrong port)",
      detail: err,
    });
  }
}

// ---------------------------------------------------------------------------
// Build a logged Stream for the chosen mode.
// ---------------------------------------------------------------------------
function buildStream(opts: OpenHttpSessionOptions, log: Logger): acp.Stream {
  const headers = opts.secretKey ? { "X-Secret-Key": opts.secretKey } : undefined;

  if (opts.mode === "ws") {
    const url = opts.secretKey
      ? `${opts.wsUrl}?token=${encodeURIComponent(opts.secretKey)}`
      : opts.wsUrl;

    log({
      ts: Date.now(),
      level: "info",
      scope: "ws",
      message: `opening WebSocket → ${url}`,
    });

    // Wrap the platform WebSocket so we can log open/close/error transitions,
    // which the SDK otherwise swallows.
    const LoggingWebSocket = makeLoggingWebSocket(log);
    const wsOpts: WebSocketStreamOptions = {
      WebSocket: LoggingWebSocket as unknown as WebSocketStreamOptions["WebSocket"],
    };
    return createWebSocketStream(url, wsOpts);
  }

  log({
    ts: Date.now(),
    level: "info",
    scope: "http",
    message: `opening HTTP stream → ${opts.httpUrl}`,
  });
  return createHttpStream(opts.httpUrl, { headers });
}

// A WebSocket subclass that logs lifecycle events. The SDK only sees a normal
// WebSocket; we just attach listeners for visibility.
function makeLoggingWebSocket(log: Logger) {
  return class LoggingWebSocket extends WebSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, protocols);
      this.addEventListener("open", () =>
        log({ ts: Date.now(), level: "info", scope: "ws", message: "open" }),
      );
      this.addEventListener("error", (e) =>
        log({
          ts: Date.now(),
          level: "error",
          scope: "ws",
          message: "socket error (often a failed upgrade — check auth/CORS)",
          detail: e,
        }),
      );
      this.addEventListener("close", (e) =>
        log({
          ts: Date.now(),
          level: (e as CloseEvent).wasClean ? "info" : "warn",
          scope: "ws",
          message: `close code=${(e as CloseEvent).code} clean=${
            (e as CloseEvent).wasClean
          }`,
          detail: (e as CloseEvent).reason || undefined,
        }),
      );
    }
  };
}

// ---------------------------------------------------------------------------
// Open a session over http/ws, logging every protocol step.
// ---------------------------------------------------------------------------
export async function openHttpSession(
  opts: OpenHttpSessionOptions,
): Promise<HttpSession> {
  const log = makeLogger(opts.log);

  log({
    ts: Date.now(),
    level: "info",
    scope: "connect",
    message: `starting ${opts.mode} session`,
    detail: { wsUrl: opts.wsUrl, httpUrl: opts.httpUrl, cwd: opts.cwd },
  });

  await preflight(opts.httpUrl, opts.secretKey, log);

  const stream = buildStream(opts, log);

  const app = acp
    .client({ name: "acp-web-client" })
    .onRequest(acp.methods.client.session.requestPermission, async (ctx) => {
      const title = ctx.params.toolCall?.title ?? "permission";
      log({
        ts: Date.now(),
        level: "info",
        scope: "permission",
        message: `auto-approving: ${title}`,
      });
      opts.onPermission?.(title);
      const option =
        ctx.params.options.find((o) => o.kind === "allow_always") ??
        ctx.params.options.find((o) => o.kind === "allow_once") ??
        ctx.params.options[0];
      return {
        outcome: { outcome: "selected", optionId: option?.optionId ?? "allow" },
      };
    });

  let connection: acp.ClientConnection;
  try {
    connection = app.connect(stream);
  } catch (err) {
    log({
      ts: Date.now(),
      level: "error",
      scope: "connect",
      message: "failed to attach ACP connection to the stream",
      detail: err,
    });
    throw err;
  }

  // Surface unexpected connection closure (e.g. server drops the socket).
  connection.closed
    .then(() =>
      log({
        ts: Date.now(),
        level: "info",
        scope: "connect",
        message: "connection closed",
      }),
    )
    .catch((err) =>
      log({
        ts: Date.now(),
        level: "error",
        scope: "connect",
        message: "connection closed with error",
        detail: err,
      }),
    );

  const ctx = connection.agent;

  let init: acp.InitializeResponse;
  try {
    log({
      ts: Date.now(),
      level: "info",
      scope: "initialize",
      message: "sending initialize",
    });
    init = await ctx.request(acp.methods.agent.initialize, {
      protocolVersion: acp.PROTOCOL_VERSION,
      clientCapabilities: {},
    });
    log({
      ts: Date.now(),
      level: "info",
      scope: "initialize",
      message: `agent ${init.agentInfo?.name ?? "?"} ${
        init.agentInfo?.version ?? ""
      } (protocol v${init.protocolVersion})`,
    });
  } catch (err) {
    log({
      ts: Date.now(),
      level: "error",
      scope: "initialize",
      message:
        "initialize failed — the socket likely never completed its upgrade (auth/CORS/server down)",
      detail: err,
    });
    connection.close(err);
    throw err;
  }

  let session: acp.ActiveSession;
  try {
    log({
      ts: Date.now(),
      level: "info",
      scope: "session",
      message: `creating session (cwd=${opts.cwd})`,
    });
    session = await ctx.buildSession(opts.cwd).start();
    log({
      ts: Date.now(),
      level: "info",
      scope: "session",
      message: `session ready: ${session.sessionId}`,
    });
  } catch (err) {
    log({
      ts: Date.now(),
      level: "error",
      scope: "session",
      message: "session/new failed",
      detail: err,
    });
    connection.close(err);
    throw err;
  }

  return {
    session,
    connection,
    agentName: init.agentInfo?.name ?? "agent",
    agentVersion: init.agentInfo?.version ?? "",
    mode: opts.mode,
    close: () => {
      log({
        ts: Date.now(),
        level: "info",
        scope: "connect",
        message: "closing session",
      });
      connection.close();
    },
  };
}
