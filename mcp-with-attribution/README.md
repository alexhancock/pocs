# MCP with Attribution - Proof of Concept

This PoC demonstrates:
- **MCP Server** with a `web_scrape` tool that reads attribution/payment headers
- **MCP Client** that expresses capabilities for attribution and payments (USD, crypto)
- **Web Server** that returns content with `X-Content-*` headers specifying requirements
- **Frontend UI** that visualizes the entire flow

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   MCP Client    │────▶│   MCP Server    │────▶│   Web Server    │
│                 │     │                 │     │                 │
│ • Attribution   │     │ • web_scrape    │     │ • X-Content-*   │
│ • USD Payments  │     │   tool          │     │   headers       │
│ • Crypto        │     │ • Parse headers │     │ • Content       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Using Docker Compose (Recommended)

```bash
# Build and run all services
docker-compose up --build

# View the demo UI
open http://localhost:8080
```

### Local Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Terminal 1: Start web server (port 3000)
npm run start:web

# Terminal 2: Start MCP server (port 4000)
npm run start:server

# Then open public/index.html in a browser
```

## Attribution Headers

The web server uses custom HTTP headers to specify requirements:

| Header | Description | Example |
|--------|-------------|---------|
| `X-Content-Attribution` | Attribution requirements | `{"author": "Jane", "license": "CC BY 4.0"}` |
| `X-Content-Payment-USD` | USD payment requirement | `{"amount": 0.50, "method": "stripe"}` |
| `X-Content-Payment-Crypto` | Crypto payment requirement | `{"amount": 0.001, "currency": "ETH", "walletAddress": "0x..."}` |

## Client Capabilities

The MCP client expresses these capabilities:

```typescript
{
  attribution: {
    canProvideAttribution: true,
    supportedFormats: ["text", "html", "markdown", "json-ld"]
  },
  payments: {
    usd: {
      enabled: true,
      maxAmount: 10.0,
      methods: ["stripe", "paypal"]
    },
    crypto: {
      enabled: true,
      supportedChains: ["ethereum", "bitcoin", "solana"],
      maxAmountUSD: 5.0
    }
  }
}
```

## Key Concepts

### 1. Server-Side Attribution Headers
Content providers add headers to specify their requirements:
```http
X-Content-Attribution: {"author": "Dr. Smith", "license": "CC BY 4.0"}
X-Content-Payment-USD: {"amount": 0.50, "paymentMethod": "stripe"}
```

### 2. MCP Tool Response
The `web_scrape` tool returns structured data including requirements:
```json
{
  "url": "http://example.com/article",
  "content": "<article>...</article>",
  "attributionRequirements": [
    {"type": "attribution", "details": {...}},
    {"type": "payment-usd", "details": {...}}
  ]
}
```

### 3. Client Fulfillment
The client processes requirements based on its capabilities:
```
FULFILLING ATTRIBUTION:
    Author: Dr. Smith
    License: CC BY 4.0

PAYMENT EXECUTED:
   >>> Sending $0.50 via stripe...
   >>> Transaction ID: txn_abc123
   >>> Status: COMPLETED ✓
```
