import express, { Request, Response } from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Expose-Headers", "X-Content-Attribution, X-Content-Payment-USD, X-Content-Payment-Crypto");
  next();
});

app.get("/article/free", (req: Request, res: Response) => {
  res.setHeader("X-Content-Attribution", JSON.stringify({
    author: "Jane Smith",
    source: "https://example.com/articles/free-article",
    license: "CC BY 4.0",
  }));

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

app.get("/article/premium", (req: Request, res: Response) => {
  res.setHeader("X-Content-Attribution", JSON.stringify({
    author: "Dr. Alex Johnson",
    source: "https://example.com/articles/premium-research",
    license: "All Rights Reserved",
  }));

  res.setHeader("X-Content-Payment-USD", JSON.stringify({
    amount: 0.50,
    currency: "USD",
    paymentMethod: "stripe",
    description: "Premium article access fee",
  }));

  res.setHeader("Content-Type", "text/html");
  res.send(`
    <article>
      <h1>Premium Research: Advanced Machine Learning Techniques</h1>
      <p>By Dr. Alex Johnson</p>
      <p>This premium article requires a small payment to access.
         In this comprehensive guide, we explore cutting-edge ML techniques
         including transformer architectures, attention mechanisms, and
         state-of-the-art optimization strategies...</p>
      <p>The research presented here represents months of careful analysis
         and experimentation across multiple domains.</p>
    </article>
  `);
});

app.get("/article/crypto", (req: Request, res: Response) => {
  res.setHeader("X-Content-Attribution", JSON.stringify({
    author: "CryptoWriter",
    source: "https://example.com/articles/crypto-exclusive",
    license: "Token-Gated",
  }));

  res.setHeader("X-Content-Payment-Crypto", JSON.stringify({
    amount: 0.001,
    currency: "ETH",
    walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f8fE21",
    chain: "ethereum",
    description: "Crypto article access - pay with ETH",
  }));

  res.setHeader("Content-Type", "text/html");
  res.send(`
    <article>
      <h1>Exclusive: The Future of Decentralized Content</h1>
      <p>By CryptoWriter</p>
      <p>This article is token-gated and requires crypto payment.
         Discover how blockchain technology is revolutionizing content
         monetization and creator economics...</p>
      <p>We explore DAOs, NFTs, and novel tokenomics models that
         empower content creators worldwide.</p>
    </article>
  `);
});

app.get("/article/multi", (req: Request, res: Response) => {
  res.setHeader("X-Content-Attribution", JSON.stringify({
    author: "Premium Publishers Inc.",
    source: "https://example.com/articles/exclusive-report",
    license: "Commercial License Required",
  }));

  res.setHeader("X-Content-Payment-USD", JSON.stringify({
    amount: 2.00,
    currency: "USD",
    paymentMethod: "stripe",
    description: "Exclusive report access",
  }));

  res.setHeader("X-Content-Payment-Crypto", JSON.stringify({
    amount: 0.005,
    currency: "ETH",
    walletAddress: "0x8Ba1f109551bD432803012645Hac136c22bBBBBB",
    chain: "ethereum",
    description: "Alternative crypto payment option",
  }));

  res.setHeader("Content-Type", "text/html");
  res.send(`
    <article>
      <h1>Exclusive Industry Report: AI Market Analysis 2024</h1>
      <p>By Premium Publishers Inc.</p>
      <p>This exclusive report offers multiple payment options.
         Comprehensive analysis of the AI industry including market
         size, growth projections, key players, and emerging trends...</p>
      <p>Includes detailed charts, expert interviews, and proprietary
         data from our research team.</p>
    </article>
  `);
});

app.get("/article/public", (req: Request, res: Response) => {
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

app.get("/api/articles", (req: Request, res: Response) => {
  res.json({
    articles: [
      { path: "/article/free", title: "Free Article (Attribution Only)", requirements: ["attribution"] },
      { path: "/article/premium", title: "Premium Article (Attribution + USD Payment)", requirements: ["attribution", "payment-usd"] },
      { path: "/article/crypto", title: "Crypto Article (Attribution + Crypto Payment)", requirements: ["attribution", "payment-crypto"] },
      { path: "/article/multi", title: "Multi-Requirement Article (All Options)", requirements: ["attribution", "payment-usd", "payment-crypto"] },
      { path: "/article/public", title: "Public Domain (No Requirements)", requirements: [] },
    ],
  });
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🌐 Web Server running on http://localhost:${PORT}`);
  console.log("\nAvailable endpoints:");
  console.log("  GET /article/free    - Attribution only");
  console.log("  GET /article/premium - Attribution + USD payment");
  console.log("  GET /article/crypto  - Attribution + Crypto payment");
  console.log("  GET /article/multi   - All requirements");
  console.log("  GET /article/public  - No requirements");
  console.log("  GET /api/articles    - List all articles");
  console.log("  GET /health          - Health check");
});
