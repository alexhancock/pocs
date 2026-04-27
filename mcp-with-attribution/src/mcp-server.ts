import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { randomUUID } from "crypto";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.header("Access-Control-Expose-Headers", "mcp-session-id");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// ---------------------------------------------------------------------------
// x402 v2 wire format types
// ---------------------------------------------------------------------------

interface PaymentRequirement {
  scheme: string;
  network: string;
  amount: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra?: Record<string, unknown>;
}

interface PaymentRequiredPayload {
  x402Version: number;
  error: string;
  resource: { url: string; description: string; mimeType: string };
  accepts: PaymentRequirement[];
}

/**
 * What a client tells us it can pay with. Mirrors the shape of `baw check
 * --json`'s available methods (chain + asset) so a wallet-aware client
 * (like goose w/ baw) can pass it through directly.
 *
 * networks: chain identifiers the client can transact on. Use the same
 *   namespaces as x402 (`eip155:<chainId>`, `solana:<genesis>`, `bip122:<hash>`).
 *   Wildcards: "eip155:*", "solana:*", "bip122:*".
 * assets: optional list of asset identifiers the client can spend
 *   (addresses, mints, or symbols like "BTC", "ETH"). If empty, any asset
 *   on a supported network is treated as payable.
 */
interface ClientPaymentCapabilities {
  networks?: string[];
  assets?: string[];
  schemes?: string[]; // defaults to ["exact"]
  maxAmountUSD?: number; // optional spend cap for the demo
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function decodePaymentRequired(headerValue: string): PaymentRequiredPayload | null {
  try {
    const json = Buffer.from(headerValue, "base64").toString("utf8");
    return JSON.parse(json) as PaymentRequiredPayload;
  } catch (e) {
    console.error(`[MCP] failed to decode Payment-Required header: ${e}`);
    return null;
  }
}

function networkMatches(supported: string[] | undefined, network: string): boolean {
  if (!supported || supported.length === 0) return false;
  for (const s of supported) {
    if (s === network) return true;
    // wildcard match: "eip155:*"
    if (s.endsWith(":*")) {
      const prefix = s.slice(0, -1); // "eip155:"
      if (network.startsWith(prefix)) return true;
    }
  }
  return false;
}

function assetMatches(supported: string[] | undefined, asset: string): boolean {
  if (!supported || supported.length === 0) return true; // unspecified = accept any
  const normAsset = asset.toLowerCase();
  return supported.some((a) => a.toLowerCase() === normAsset);
}

interface AnnotatedRequirement extends PaymentRequirement {
  payable: boolean;
  payableReason: string;
}

function annotateAccepts(
  accepts: PaymentRequirement[],
  caps: ClientPaymentCapabilities | undefined,
): AnnotatedRequirement[] {
  if (!caps) {
    return accepts.map((r) => ({
      ...r,
      payable: false,
      payableReason: "no client_capabilities provided",
    }));
  }
  const supportedSchemes = caps.schemes ?? ["exact"];
  return accepts.map((r) => {
    if (!supportedSchemes.includes(r.scheme)) {
      return {
        ...r,
        payable: false,
        payableReason: `client does not support scheme '${r.scheme}'`,
      };
    }
    if (!networkMatches(caps.networks, r.network)) {
      return {
        ...r,
        payable: false,
        payableReason: `client does not support network '${r.network}'`,
      };
    }
    if (!assetMatches(caps.assets, r.asset)) {
      return {
        ...r,
        payable: false,
        payableReason: `client does not support asset '${r.asset}'`,
      };
    }
    return { ...r, payable: true, payableReason: "client can pay" };
  });
}

// ---------------------------------------------------------------------------
// legacy attribution header (kept for free article / educational purposes)
// ---------------------------------------------------------------------------

interface AttributionInfo {
  author: string;
  source: string;
  license: string;
}

function parseAttribution(headers: Headers): AttributionInfo | null {
  const h = headers.get("X-Content-Attribution");
  if (!h) return null;
  try {
    return JSON.parse(h) as AttributionInfo;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// MCP tool implementation
// ---------------------------------------------------------------------------

interface ScrapeArgs {
  url: string;
  client_capabilities?: ClientPaymentCapabilities;
  payment_proof?: string; // value to send as X-PAYMENT on retry
}

interface PaymentRequiredResult {
  status: "payment_required";
  url: string;
  httpStatus: number;
  description: string;
  accepts: AnnotatedRequirement[];
  payableCount: number;
  totalCount: number;
  rawHeaders: Record<string, string>;
  /**
   * Hint for an LLM client: which `accepts` entry to consider first.
   * Filled with the index of the cheapest payable option, or null.
   */
  recommendedIndex: number | null;
  /**
   * Action hint to retry with payment proof.
   */
  next: {
    action: "retry_with_payment";
    description: string;
  };
}

interface SuccessResult {
  status: "success";
  url: string;
  httpStatus: number;
  content: string;
  attribution: AttributionInfo | null;
  paymentResponse: Record<string, unknown> | null;
  rawHeaders: Record<string, string>;
}

interface ErrorResult {
  status: "error";
  url: string;
  httpStatus?: number;
  message: string;
}

type ScrapeResult = PaymentRequiredResult | SuccessResult | ErrorResult;

function pickRecommended(annotated: AnnotatedRequirement[]): number | null {
  // pick the cheapest payable option (lowest amount as a number)
  let bestIdx: number | null = null;
  let bestAmount = Number.POSITIVE_INFINITY;
  for (let i = 0; i < annotated.length; i++) {
    if (!annotated[i].payable) continue;
    const n = Number(annotated[i].amount);
    if (Number.isFinite(n) && n < bestAmount) {
      bestAmount = n;
      bestIdx = i;
    }
  }
  return bestIdx;
}

async function performScrape(args: ScrapeArgs): Promise<ScrapeResult> {
  const headers: Record<string, string> = {
    "User-Agent": "MCP-x402-Scraper/2.0",
    Accept: "text/html,application/json,text/plain",
  };
  if (args.payment_proof) {
    headers["X-PAYMENT"] = args.payment_proof;
  }

  let response: Response;
  try {
    response = await fetch(args.url, { headers });
  } catch (e) {
    return {
      status: "error",
      url: args.url,
      message: e instanceof Error ? e.message : String(e),
    };
  }

  const rawHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    const lk = key.toLowerCase();
    if (
      lk === "payment-required" ||
      lk === "x-payment-response" ||
      lk.startsWith("x-content-")
    ) {
      rawHeaders[key] = value;
    }
  });

  if (response.status === 402) {
    const headerValue = response.headers.get("Payment-Required");
    if (!headerValue) {
      return {
        status: "error",
        url: args.url,
        httpStatus: 402,
        message: "Server returned 402 but no Payment-Required header",
      };
    }
    const decoded = decodePaymentRequired(headerValue);
    if (!decoded) {
      return {
        status: "error",
        url: args.url,
        httpStatus: 402,
        message: "Failed to decode Payment-Required header",
      };
    }
    const annotated = annotateAccepts(decoded.accepts, args.client_capabilities);
    const payableCount = annotated.filter((a) => a.payable).length;
    return {
      status: "payment_required",
      url: args.url,
      httpStatus: 402,
      description: decoded.resource.description,
      accepts: annotated,
      payableCount,
      totalCount: annotated.length,
      recommendedIndex: pickRecommended(annotated),
      rawHeaders,
      next: {
        action: "retry_with_payment",
        description:
          payableCount > 0
            ? `Pay one of the ${payableCount} payable option(s), then call web_scrape again with payment_proof set to the X-PAYMENT proof string from your wallet (e.g. \`baw pay <url>\`).`
            : "No payment options match the client_capabilities you provided. Either widen capabilities or skip this resource.",
      },
    };
  }

  if (!response.ok) {
    return {
      status: "error",
      url: args.url,
      httpStatus: response.status,
      message: `HTTP ${response.status} ${response.statusText}`,
    };
  }

  const content = await response.text();
  const attribution = parseAttribution(response.headers);

  let paymentResponse: Record<string, unknown> | null = null;
  const xpr = response.headers.get("X-PAYMENT-RESPONSE");
  if (xpr) {
    try {
      paymentResponse = JSON.parse(Buffer.from(xpr, "base64").toString("utf8"));
    } catch {
      paymentResponse = { raw: xpr };
    }
  }

  return {
    status: "success",
    url: args.url,
    httpStatus: response.status,
    content,
    attribution,
    paymentResponse,
    rawHeaders,
  };
}

// ---------------------------------------------------------------------------
// MCP server wiring
// ---------------------------------------------------------------------------

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "x402-web-scraper",
    version: "2.0.0",
  });

  server.tool(
    "web_scrape",
    [
      "Fetch a URL.",
      "If the server replies with HTTP 402 (x402 Payment Required), this tool returns",
      "the decoded payment requirements and cross-references them against the",
      "`client_capabilities` you pass in. The response is a JSON object with",
      "`status: \"payment_required\"` and an `accepts[]` array, each entry tagged",
      "with `payable: true|false` based on what the client can actually pay with.",
      "",
      "To pay and retry, call this tool again with the same `url` and a",
      "`payment_proof` string (the X-PAYMENT value produced by your wallet).",
      "",
      "If you don't pass `client_capabilities`, every accept will be marked",
      "`payable: false` (informational only).",
    ].join("\n"),
    {
      url: z.string().url().describe("The URL to scrape."),
      client_capabilities: z
        .object({
          networks: z
            .array(z.string())
            .optional()
            .describe(
              "Chain identifiers the client can transact on. Use x402 namespaces (eip155:<chainId>, solana:<genesis>, bip122:<hash>). Wildcards allowed: 'eip155:*'.",
            ),
          assets: z
            .array(z.string())
            .optional()
            .describe(
              "Asset identifiers the client can spend (token addresses, mints, or symbols like 'BTC'). Empty = any asset on a supported network.",
            ),
          schemes: z
            .array(z.string())
            .optional()
            .describe("x402 schemes supported (default: ['exact'])."),
          maxAmountUSD: z.number().optional().describe("Optional spend cap for the demo."),
        })
        .optional()
        .describe(
          "What the client can pay with. Pass this so the server can mark which `accepts` entries are payable.",
        ),
      payment_proof: z
        .string()
        .optional()
        .describe(
          "The X-PAYMENT proof value to retry with. Obtain by paying via your wallet (e.g. `baw pay <url>`).",
        ),
    },
    async (args): Promise<{ content: Array<{ type: "text"; text: string }> }> => {
      console.log(
        `[MCP] web_scrape url=${args.url} caps=${args.client_capabilities ? "yes" : "no"} proof=${args.payment_proof ? "yes" : "no"}`,
      );
      const result = await performScrape(args as ScrapeArgs);
      console.log(`[MCP]   -> ${result.status}`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  return server;
}

// ---------------------------------------------------------------------------
// Streamable-HTTP transport
// ---------------------------------------------------------------------------

const transports = new Map<string, StreamableHTTPServerTransport>();

app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports.has(sessionId)) {
    transport = transports.get(sessionId)!;
  } else if (!sessionId && req.body?.method === "initialize") {
    const newSessionId = randomUUID();
    transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => newSessionId });
    const server = createMcpServer();
    await server.connect(transport);

    transports.set(newSessionId, transport);
    console.log(`[MCP] new session: ${newSessionId}`);

    transport.onclose = () => {
      transports.delete(newSessionId);
      console.log(`[MCP] session closed: ${newSessionId}`);
    };
  } else {
    res.status(400).json({ error: "Bad request: no session" });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).json({ error: "Bad request: no session" });
    return;
  }
  const transport = transports.get(sessionId)!;
  await transport.handleRequest(req, res);
});

app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId)!;
    await transport.close();
    transports.delete(sessionId);
  }
  res.status(200).end();
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "x402-mcp-server", sessions: transports.size });
});

app.listen(PORT, () => {
  console.log(`🔌 x402-aware MCP server (Streamable HTTP) on http://localhost:${PORT}`);
  console.log("");
  console.log("Endpoints:");
  console.log("  POST /mcp    - MCP messages");
  console.log("  GET  /mcp    - SSE stream");
  console.log("  DELETE /mcp  - close session");
  console.log("  GET  /health - health check");
  console.log("");
  console.log("Tool exposed: web_scrape(url, client_capabilities?, payment_proof?)");
});
