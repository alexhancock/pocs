import express, { Request, Response, NextFunction } from "express";
import { STATES, getState, renderIndex, renderStateBody, renderPaywall } from "./states.js";

/**
 * x402 v2 wire format demo web server.
 *
 * On a protected route with no payment: respond `402 Payment Required`
 * with a `Payment-Required` header. The header value is base64(JSON) where
 * the JSON has the shape:
 *   {
 *     x402Version: 2,
 *     error: "Payment required",
 *     resource: { url, description, mimeType },
 *     accepts: [
 *       { scheme, network, amount, asset, payTo, maxTimeoutSeconds, extra? },
 *       ...
 *     ]
 *   }
 *
 * The client retries with an `X-PAYMENT` header containing a payment proof
 * (whatever the wallet/payer produces; for this demo we accept any non-empty
 * value and treat it as valid). On success we echo the proof back via
 * `X-PAYMENT-RESPONSE`.
 *
 * This format matches what x402.org and tools like `baw` understand.
 */

const app = express();
const PORT = process.env.PORT || 3000;

// ---- types --------------------------------------------------------------

interface PaymentRequirement {
  scheme: "exact";
  network: string; // e.g. "eip155:84532", "solana:...", or for the demo "demo:btc-mainnet"
  amount: string; // smallest-unit string (e.g. "10000" = 0.01 USDC at 6 decimals)
  asset: string; // address or token mint; for demo BTC we use the string "BTC"
  payTo: string; // destination address
  maxTimeoutSeconds: number;
  extra?: Record<string, unknown>;
}

interface PaymentRequiredPayload {
  x402Version: 2;
  error: string;
  resource: { url: string; description: string; mimeType: string };
  accepts: PaymentRequirement[];
}

interface RouteSpec {
  description: string;
  attribution?: { author: string; source: string; license: string };
  accepts: PaymentRequirement[];
  body: () => string;
  contentType?: string;
  /**
   * Optional HTML paywall renderer. When set, an unpaid request that
   * prefers HTML (Accept: text/html — i.e. a browser, not the MCP scraper
   * or `x402-pay`) will receive this page instead of the canonical JSON
   * 402 body. The `Payment-Required` header is still emitted so any
   * machine client reading the response can still parse it.
   */
  htmlPaywall?: () => string;
}

// ---- demo wallet addresses ---------------------------------------------
// USDC on Base Sepolia (testnet) — the official x402 facilitator network
const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
// Demo recipient addresses (these are the demo's own server, not real funds)
const DEMO_PAY_TO_EVM = "0x209693Bc6afc0C5328bA36FaF03C514EF312287C";
const DEMO_PAY_TO_BTC = "bc1qexampledemoaddressdoNotSendRealFunds00000";

// ---- middleware ---------------------------------------------------------

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header(
    "Access-Control-Expose-Headers",
    "X-Content-Attribution, Payment-Required, X-PAYMENT-RESPONSE",
  );
  next();
});

// ---- helpers ------------------------------------------------------------

function buildPaymentRequiredHeader(
  req: Request,
  description: string,
  accepts: PaymentRequirement[],
  mimeType = "text/html",
): string {
  const payload: PaymentRequiredPayload = {
    x402Version: 2,
    error: "Payment required",
    resource: {
      url: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
      description,
      mimeType,
    },
    accepts,
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

/**
 * Map a CAIP-2 chain identifier to the canonical network name expected by
 * Coinbase's x402 reference libraries (`x402-fetch`, `x402-axios`, etc.).
 *
 * x402-fetch uses a Zod enum: "base-sepolia" | "base" | "avalanche-fuji" |
 * "avalanche" | "iotex". CAIP-2 strings (e.g. "eip155:84532") are not
 * recognized. We translate when possible and pass through otherwise so
 * non-EVM accepts (BTC, etc.) remain in the body for clients that can use them.
 */
function caip2ToCanonicalNetwork(caip: string): string {
  switch (caip) {
    case "eip155:84532":
      return "base-sepolia";
    case "eip155:8453":
      return "base";
    case "eip155:43113":
      return "avalanche-fuji";
    case "eip155:43114":
      return "avalanche";
    default:
      return caip; // pass through (BTC, Solana, etc.)
  }
}

/**
 * Translate our internal v2 `PaymentRequirement` into the canonical Coinbase
 * x402 `PaymentRequirements` shape, the one validated by `x402-fetch`'s
 * `PaymentRequirementsSchema`.
 *
 * Field mapping:
 *   amount        -> maxAmountRequired
 *   network       -> network          (CAIP-2 -> canonical name)
 *   resource (string URL) and description / mimeType / payTo / asset are
 *   added/promoted to the top of the accept entry.
 */
function toCanonicalAccept(
  req: Request,
  description: string,
  mimeType: string,
  a: PaymentRequirement,
): Record<string, unknown> {
  const resourceUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  return {
    scheme: a.scheme,
    network: caip2ToCanonicalNetwork(a.network),
    maxAmountRequired: a.amount,
    resource: resourceUrl,
    description,
    mimeType,
    payTo: a.payTo,
    maxTimeoutSeconds: a.maxTimeoutSeconds,
    asset: a.asset,
    extra: a.extra,
  };
}

/**
 * Serialize an attribution object for the X-Content-Attribution header.
 *
 * HTTP/1.1 only allows ISO-8859-1 in header values (RFC 7230 §3.2.4), so
 * non-ASCII characters like em-dashes or curly quotes that appear in
 * editorial copy will cause Node to throw `ERR_INVALID_CHAR`. Base64-
 * encoding the UTF-8 JSON sidesteps the encoding question entirely;
 * clients decode with `Buffer.from(value, "base64").toString("utf8")`.
 */
function encodeAttributionHeader(
  attribution: { author: string; source: string; license: string },
): string {
  return Buffer.from(JSON.stringify(attribution), "utf8").toString("base64");
}

function sendProtected(req: Request, res: Response, spec: RouteSpec) {
  const xPayment = req.header("X-PAYMENT");

  if (!xPayment) {
    // 402 Payment Required.
    //
    // We emit BOTH dialects so every x402 client we care about works
    // out of the box:
    //
    //   1. `Payment-Required` header (base64 of our internal v2 payload)
    //      — read by `baw`, the MCP scraper, and anything else that
    //        speaks the x402.org "v2 wire format" we originated.
    //
    //   2. JSON body with `{x402Version, accepts: [...]}` in the canonical
    //      Coinbase shape (`maxAmountRequired`, `network: "base-sepolia"`,
    //      flat `resource` URL, etc.) — read by Coinbase's reference
    //      libraries `x402-fetch` and `x402-axios`.
    //
    // The two carry the same information; clients pick whichever one
    // they parse and ignore the other.
    const mimeType = spec.contentType ?? "text/html";
    const headerValue = buildPaymentRequiredHeader(
      req,
      spec.description,
      spec.accepts,
      mimeType,
    );
    // The canonical Coinbase schema only knows EVM networks
    // ("base-sepolia", "base", "avalanche-fuji", "avalanche", "iotex").
    // Including a BTC/Solana accept here would make `x402-fetch` reject
    // the entire body during Zod validation. We therefore filter the
    // body to EVM accepts only — non-EVM accepts remain advertised in
    // the `Payment-Required` header for clients that understand them
    // (e.g. `baw`, the MCP scraper).
    const canonicalAccepts = spec.accepts
      .filter((a) => a.network.startsWith("eip155:"))
      .map((a) => toCanonicalAccept(req, spec.description, mimeType, a));
    res.status(402);
    res.setHeader("Payment-Required", headerValue);
    if (spec.attribution) {
      res.setHeader("X-Content-Attribution", encodeAttributionHeader(spec.attribution));
    }

    // Content negotiation:
    //   - HTML-preferring clients (browsers) get the gorgeous paywall page
    //     when the route provides one;
    //   - everything else (MCP scraper, `x402-pay`, curl, etc.) gets the
    //     canonical JSON body.
    const wantsHtml = (req.headers.accept ?? "").includes("text/html");
    if (wantsHtml && spec.htmlPaywall) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(spec.htmlPaywall());
      return;
    }
    res.setHeader("Content-Type", "application/json");
    res.json({
      x402Version: 1,
      error: "Payment required",
      accepts: canonicalAccepts,
    });
    return;
  }

  // For the demo we accept ANY non-empty X-PAYMENT proof and treat it as valid.
  // A real x402 server would forward this to a facilitator for settlement.
  console.log(
    `[${new Date().toISOString()}] X-PAYMENT received (${xPayment.length} chars) — accepting as valid (demo mode)`,
  );

  if (spec.attribution) {
    res.setHeader("X-Content-Attribution", encodeAttributionHeader(spec.attribution));
  }
  res.setHeader(
    "X-PAYMENT-RESPONSE",
    Buffer.from(
      JSON.stringify({
        success: true,
        receivedAt: new Date().toISOString(),
        proofLength: xPayment.length,
        note: "demo-mode: any X-PAYMENT value accepted",
      }),
    ).toString("base64"),
  );
  res.setHeader("Content-Type", spec.contentType ?? "text/html");
  res.send(spec.body());
}

// ---- routes -------------------------------------------------------------

app.get("/article/free", (req: Request, res: Response) => {
  res.setHeader(
    "X-Content-Attribution",
    JSON.stringify({
      author: "Jane Smith",
      source: "https://example.com/articles/free-article",
      license: "CC BY 4.0",
    }),
  );
  res.setHeader("Content-Type", "text/html");
  res.send(`
    <article>
      <h1>Free Article: Introduction to Web Scraping</h1>
      <p>By Jane Smith</p>
      <p>This is a free article that only requires attribution.
         Web scraping is the process of automatically extracting
         information from websites...</p>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.
         Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
    </article>
  `);
});

// Premium article — pay $0.01 USDC on Base Sepolia (real x402-style)
app.get("/article/premium", (req: Request, res: Response) => {
  sendProtected(req, res, {
    description: "Premium article: Advanced Machine Learning Techniques",
    attribution: {
      author: "Dr. Alex Johnson",
      source: "https://example.com/articles/premium-research",
      license: "All Rights Reserved",
    },
    accepts: [
      {
        scheme: "exact",
        network: "eip155:84532", // Base Sepolia
        amount: "10000", // 0.01 USDC (6 decimals)
        asset: USDC_BASE_SEPOLIA,
        payTo: DEMO_PAY_TO_EVM,
        maxTimeoutSeconds: 300,
        extra: { name: "USDC", version: "2" },
      },
    ],
    body: () => `
      <article>
        <h1>Premium Research: Advanced Machine Learning Techniques</h1>
        <p>By Dr. Alex Johnson</p>
        <p>This premium article required payment to access.
           In this comprehensive guide, we explore cutting-edge ML techniques
           including transformer architectures, attention mechanisms, and
           state-of-the-art optimization strategies...</p>
        <p>The research presented here represents months of careful analysis
           and experimentation across multiple domains.</p>
      </article>
    `,
  });
});

// Crypto-only article — pay in BTC (illustrates a non-EVM accept)
app.get("/article/crypto", (req: Request, res: Response) => {
  sendProtected(req, res, {
    description: "Crypto-exclusive article: The Future of Decentralized Content",
    attribution: {
      author: "CryptoWriter",
      source: "https://example.com/articles/crypto-exclusive",
      license: "Token-Gated",
    },
    accepts: [
      {
        scheme: "exact",
        network: "bip122:000000000019d6689c085ae165831e93", // BTC mainnet chain id
        amount: "1000", // 1000 sats (~$0.50 at $50k BTC, demo only)
        asset: "BTC",
        payTo: DEMO_PAY_TO_BTC,
        maxTimeoutSeconds: 600,
        extra: { unit: "sat" },
      },
    ],
    body: () => `
      <article>
        <h1>Exclusive: The Future of Decentralized Content</h1>
        <p>By CryptoWriter</p>
        <p>This article was token-gated and required crypto payment.
           Discover how blockchain technology is revolutionizing content
           monetization and creator economics...</p>
        <p>We explore DAOs, NFTs, and novel tokenomics models that
           empower content creators worldwide.</p>
      </article>
    `,
  });
});

// Multi-option article — multiple `accepts` entries (USDC on Base Sepolia OR BTC)
app.get("/article/multi", (req: Request, res: Response) => {
  sendProtected(req, res, {
    description: "Exclusive industry report: AI Market Analysis 2024",
    attribution: {
      author: "Premium Publishers Inc.",
      source: "https://example.com/articles/exclusive-report",
      license: "Commercial License Required",
    },
    accepts: [
      {
        scheme: "exact",
        network: "eip155:84532",
        amount: "20000", // 0.02 USDC
        asset: USDC_BASE_SEPOLIA,
        payTo: DEMO_PAY_TO_EVM,
        maxTimeoutSeconds: 300,
        extra: { name: "USDC", version: "2" },
      },
      {
        scheme: "exact",
        network: "bip122:000000000019d6689c085ae165831e93",
        amount: "500", // 500 sats
        asset: "BTC",
        payTo: DEMO_PAY_TO_BTC,
        maxTimeoutSeconds: 600,
        extra: { unit: "sat" },
      },
    ],
    body: () => `
      <article>
        <h1>Exclusive Industry Report: AI Market Analysis 2024</h1>
        <p>By Premium Publishers Inc.</p>
        <p>This exclusive report offers multiple payment options.
           Comprehensive analysis of the AI industry including market
           size, growth projections, key players, and emerging trends...</p>
        <p>Includes detailed charts, expert interviews, and proprietary
           data from our research team.</p>
      </article>
    `,
  });
});

app.get("/article/public", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`
    <article>
      <h1>Public Domain: Classic Literature Excerpt</h1>
      <p>This content is in the public domain with no requirements.</p>
      <p>It was the best of times, it was the worst of times,
         it was the age of wisdom, it was the age of foolishness...</p>
    </article>
  `);
});

// -----------------------------------------------------------------------
// Six States — a standalone paid-content site under /states/*
//
// Each New England state has its own page, with its own EB-Garamond hero,
// its own rich background palette, and its own x402 paywall config.
// Visit `/` (which redirects to `/states`) to see the index.
// -----------------------------------------------------------------------

app.get("/", (_req: Request, res: Response) => {
  res.redirect(302, "/states");
});

app.get("/states", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(renderIndex());
});

app.get("/states/:slug", (req: Request, res: Response) => {
  const state = getState(req.params.slug);
  if (!state) {
    res.status(404);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!doctype html><meta charset="utf-8"><title>not found</title><body style="font-family:'EB Garamond',Georgia,serif;background:#0a0c10;color:#e8e3d4;padding:14vh 8vw;"><h1 style="font-weight:500;font-size:5rem;margin:0">No such state.</h1><p style="font-size:1.2rem;opacity:0.7"><a href="/states" style="color:#e8c275">← back to the index</a></p></body>`);
    return;
  }

  sendProtected(req, res, {
    description: `${state.name} — ${state.tagline}`,
    attribution: state.attribution,
    accepts: state.accepts,
    body: () => renderStateBody(state),
    htmlPaywall: () => renderPaywall(state, req),
  });
});

app.get("/api/articles", (_req: Request, res: Response) => {
  res.json({
    articles: [
      {
        path: "/article/free",
        title: "Free Article (Attribution Only)",
        protocol: "none",
        requirements: ["attribution"],
      },
      {
        path: "/article/premium",
        title: "Premium Article (x402: USDC on Base Sepolia)",
        protocol: "x402",
        requirements: ["payment-x402"],
        priceLabel: "$0.01 USDC",
      },
      {
        path: "/article/crypto",
        title: "Crypto Article (x402: 1000 sats BTC)",
        protocol: "x402",
        requirements: ["payment-x402"],
        priceLabel: "1000 sats BTC",
      },
      {
        path: "/article/multi",
        title: "Multi-option (x402: USDC or BTC)",
        protocol: "x402",
        requirements: ["payment-x402"],
        priceLabel: "$0.02 USDC or 500 sats",
      },
      {
        path: "/article/public",
        title: "Public Domain (No Requirements)",
        protocol: "none",
        requirements: [],
      },
    ],
  });
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🌐 x402 demo web server on http://localhost:${PORT}`);
  console.log("");
  console.log("Endpoints:");
  console.log("  GET /                - redirects to /states");
  console.log("  GET /states          - Six States index");
  console.log("  GET /states/:slug    - state page (paywalled per state)");
  console.log("  GET /article/free    - free, attribution only");
  console.log("  GET /article/premium - 402 (USDC Base Sepolia)");
  console.log("  GET /article/crypto  - 402 (BTC mainnet)");
  console.log("  GET /article/multi   - 402 (USDC OR BTC)");
  console.log("  GET /article/public  - public domain");
  console.log("  GET /api/articles    - list all articles");
  console.log("  GET /health          - health check");
  console.log("");
  console.log("Send X-PAYMENT: <any-non-empty-string> to satisfy paywall (demo).");
});
