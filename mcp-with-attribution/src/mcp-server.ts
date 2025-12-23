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

interface AttributionRequirement {
  type: "attribution" | "payment-usd" | "payment-crypto";
  details: {
    attribution?: { author: string; source: string; license: string };
    payment?: { amount: number; currency: string; walletAddress?: string; paymentMethod?: string };
  };
}

interface ScrapeResult {
  url: string;
  content: string;
  attributionRequirements: AttributionRequirement[];
  rawHeaders: Record<string, string>;
}

function parseAttributionHeaders(headers: Headers): AttributionRequirement[] {
  const requirements: AttributionRequirement[] = [];

  const attributionHeader = headers.get("X-Content-Attribution");
  if (attributionHeader) {
    try {
      requirements.push({ type: "attribution", details: { attribution: JSON.parse(attributionHeader) } });
    } catch {
      requirements.push({ type: "attribution", details: { attribution: { author: attributionHeader, source: "", license: "Unknown" } } });
    }
  }

  const usdPaymentHeader = headers.get("X-Content-Payment-USD");
  if (usdPaymentHeader) {
    try {
      const payment = JSON.parse(usdPaymentHeader);
      requirements.push({ type: "payment-usd", details: { payment: { ...payment, currency: "USD" } } });
    } catch {
      requirements.push({ type: "payment-usd", details: { payment: { amount: parseFloat(usdPaymentHeader), currency: "USD", paymentMethod: "stripe" } } });
    }
  }

  const cryptoPaymentHeader = headers.get("X-Content-Payment-Crypto");
  if (cryptoPaymentHeader) {
    try {
      requirements.push({ type: "payment-crypto", details: { payment: JSON.parse(cryptoPaymentHeader) } });
    } catch {
      console.error("Failed to parse crypto payment header");
    }
  }

  return requirements;
}

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "attribution-web-scraper",
    version: "1.0.0",
  });

  server.tool(
    "web_scrape",
    "Scrape web content from a URL. Returns content along with any attribution or payment requirements.",
    { url: z.string().url().describe("The URL to scrape content from") },
    async ({ url }): Promise<{ content: Array<{ type: "text"; text: string }> }> => {
      console.log(`[MCP] Scraping: ${url}`);

      try {
        const response = await fetch(url, {
          headers: { "User-Agent": "MCP-Attribution-Scraper/1.0", "Accept": "text/html,application/json,text/plain" },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const content = await response.text();
        const attributionRequirements = parseAttributionHeaders(response.headers);

        const rawHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          if (key.toLowerCase().startsWith("x-content-")) {
            rawHeaders[key] = value;
          }
        });

        const result: ScrapeResult = { url, content, attributionRequirements, rawHeaders };
        console.log(`[MCP] Scraped. Found ${attributionRequirements.length} requirements.`);

        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[MCP] Scrape failed: ${message}`);
        return { content: [{ type: "text", text: JSON.stringify({ error: true, message, url }) }] };
      }
    }
  );

  return server;
}

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
    console.log(`[MCP] New session: ${newSessionId}`);

    transport.onclose = () => {
      transports.delete(newSessionId);
      console.log(`[MCP] Session closed: ${newSessionId}`);
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

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "mcp-server", sessions: transports.size });
});

app.listen(PORT, () => {
  console.log(`🔌 MCP Server (Streamable HTTP) running on http://localhost:${PORT}`);
  console.log("\nEndpoints:");
  console.log("  POST /mcp    - MCP messages");
  console.log("  GET  /mcp    - SSE stream");
  console.log("  DELETE /mcp  - Close session");
  console.log("  GET  /health - Health check");
});
