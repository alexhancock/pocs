/**
 * "Six States" — a tiny standalone website used to demo different x402
 * payment configurations for web content. Each New England state gets its
 * own page, with a giant hand-picked Pexels hero image, a rich background
 * color, EB Garamond typography, and a paywall keyed to a different x402
 * `accepts[]` shape so you can see how the protocol composes with content.
 *
 * The site lives under /states/* on the existing web server (web-server.ts).
 */

import { Request } from "express";

// ---- shared types ------------------------------------------------------

interface AcceptOption {
  scheme: "exact";
  network: string; // CAIP-2 (e.g. "eip155:84532", "bip122:000…1e93")
  amount: string; // smallest-unit string
  asset: string; // contract address, mint, or symbol
  payTo: string;
  maxTimeoutSeconds: number;
  extra?: Record<string, unknown>;
}

export interface StateDef {
  slug: string;
  name: string;
  tagline: string; // 1-line poetic description
  // Hero photo (Pexels — direct CDN, optimised via auto=compress)
  heroUrl: string;
  heroPhotographer: string;
  heroPhotoPage: string;
  heroAlt: string;
  // Visual identity
  bg: string; // page background (deep, saturated)
  fg: string; // body text (light, slightly off-white)
  accent: string; // small accent for rules/badges
  // Long-form body (markdown-ish: each item is a paragraph)
  paragraphs: string[];
  // Author + license attribution returned in X-Content-Attribution
  attribution: { author: string; source: string; license: string };
  // x402 payment shape — what makes each state different
  accepts: AcceptOption[];
  // Friendly label that appears in the 402 paywall card
  priceLabel: string;
  paymentExplainer: string;
}

// ---- demo recipient addresses (mirror web-server.ts) ------------------

const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const DEMO_PAY_TO_EVM = "0x209693Bc6afc0C5328bA36FaF03C514EF312287C";
const DEMO_PAY_TO_BTC = "bc1qexampledemoaddressdoNotSendRealFunds00000";

// Helper: Pexels CDN with sensible compression for hero use.
const pexels = (id: string | number, width = 2400) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;

// ---- the six states ---------------------------------------------------

export const STATES: StateDef[] = [
  {
    slug: "maine",
    name: "Maine",
    tagline: "The way life should be.",
    heroUrl: pexels(29207953),
    heroPhotographer: "Annee McHughes",
    heroPhotoPage: "https://www.pexels.com/photo/29207953/",
    heroAlt:
      "Portland Head Light on a sunny day in Cape Elizabeth, Maine — a white lighthouse perched on dark coastal granite.",
    // Deep navy / lighthouse-night
    bg: "#0d2538",
    fg: "#f1ece1",
    accent: "#e8c275",
    paragraphs: [
      "Carved by glaciers and wreathed in fog, Maine reaches farther into the Atlantic than any other state in the contiguous union. Its coastline, if you traced every cove and inlet, would unspool to nearly 3,500 miles — longer than California's. The pre-dawn light at Quoddy Head, on the easternmost tip of the United States, is the first to touch American soil each morning, and the same coast has sent that signal back westward for as long as people have lived here.",
      "The Wabanaki — the Penobscot, Passamaquoddy, Maliseet, and Mi'kmaq nations — have moved between Maine's interior forests and tidal shores for at least twelve thousand years. Their canoes, made from a single sheet of birch bark sewn with spruce root and sealed with pine pitch, were so finely engineered that the design was essentially perfect on arrival; nothing has improved on it since. French Acadians and English fishermen arrived in the seventeenth century to find a country already dense with trade routes, weirs, and seasonal villages.",
      "Maine separated from Massachusetts in 1820 in a quiet political bargain known as the Missouri Compromise, joining the Union as a free state to balance the admission of slaveholding Missouri. Within a generation, its shipyards in Bath and Kittery were launching wooden vessels that ran cargo from Liverpool to Hong Kong, and its forests fed the world's first paper mills. The state still produces ninety percent of the United States' lobster catch, and the lighthouses — sixty-five of them, most still operating — remain in service not as monuments but as working aids to navigation.",
    ],
    attribution: {
      author: "Coastal Histories Quarterly",
      source: "https://example.com/states/maine",
      license: "Editorial — single-read",
    },
    // 0.001 USDC — true micropayment
    accepts: [
      {
        scheme: "exact",
        network: "eip155:84532",
        amount: "1000", // 0.001 USDC (6 decimals)
        asset: USDC_BASE_SEPOLIA,
        payTo: DEMO_PAY_TO_EVM,
        maxTimeoutSeconds: 300,
        extra: { name: "USDC", version: "2" },
      },
    ],
    priceLabel: "$0.001 USDC",
    paymentExplainer:
      "A single fraction of a cent. The kind of tip you'd never bother with in fiat, but trivially settleable on Base Sepolia in milliseconds.",
  },
  {
    slug: "new-hampshire",
    name: "New Hampshire",
    tagline: "Live free or die.",
    heroUrl: pexels(10810321),
    heroPhotographer: "Mohan Nannapaneni",
    heroPhotoPage: "https://www.pexels.com/photo/10810321/",
    heroAlt:
      "Panoramic view of New Hampshire's White Mountains in autumn, ridges of orange and red foliage rolling to the horizon.",
    // Deep forest green with a violet undertone — the granite-shadowed mountains at dusk
    bg: "#1a3326",
    fg: "#eef0e8",
    accent: "#d99858",
    paragraphs: [
      "New Hampshire is a state shaped almost entirely by what's underfoot: granite, ancient and inflexible, refusing to round off no matter how long the rivers and glaciers work on it. The White Mountains here aren't tall by global standards — Mount Washington, the highest point, tops out at 6,288 feet — but the weather they generate is genuinely lethal. Winds at the summit have been clocked at 231 miles per hour, a record on Earth's surface that stood unchallenged for sixty-two years.",
      "The Abenaki name for this country, N'dakinna, means simply our land, and it described a world organised around the spring smelt run, the autumn salmon migration on the Merrimack, and the seasonal moves between forest hunting grounds and river meadows. The English settlers who arrived in the 1620s came initially for fish, not soil; the Piscataqua estuary was already on European maritime charts before Plymouth was settled, and Portsmouth grew rich on dried cod and white pine masts that the Royal Navy reserved by law for its tallest ships.",
      "The state's revolutionary streak runs older than the country it joined. New Hampshire was the first colony to declare independence from Britain — six months ahead of the formal Declaration — and the ninth and final state needed to ratify the Constitution, which made the document law. The motto on every license plate, Live Free or Die, is the second half of a longer line by John Stark, the general who won the Battle of Bennington: \"Live free or die: death is not the worst of evils.\" New Hampshire still has no general sales tax and no income tax on wages.",
    ],
    attribution: {
      author: "Granite Records Society",
      source: "https://example.com/states/new-hampshire",
      license: "Editorial — single-read",
    },
    // 0.01 USDC — typical article price
    accepts: [
      {
        scheme: "exact",
        network: "eip155:84532",
        amount: "10000", // 0.01 USDC
        asset: USDC_BASE_SEPOLIA,
        payTo: DEMO_PAY_TO_EVM,
        maxTimeoutSeconds: 300,
        extra: { name: "USDC", version: "2" },
      },
    ],
    priceLabel: "$0.01 USDC",
    paymentExplainer:
      "A penny. The price an old newspaper used to charge for a single article, now actually feasible to collect online.",
  },
  {
    slug: "vermont",
    name: "Vermont",
    tagline: "Freedom and unity.",
    heroUrl: pexels(11566230),
    heroPhotographer: "Vanessa Sezini",
    heroPhotoPage: "https://www.pexels.com/photo/11566230/",
    heroAlt:
      "Captivating autumn landscape in Woodstock, Vermont — a classic red farmhouse and barn ringed by yellow and orange maples.",
    // Deep maroon — the sugar-maple leaf at peak burn
    bg: "#3d1818",
    fg: "#f4ebd9",
    accent: "#e9b15c",
    paragraphs: [
      "Vermont was, for fourteen years, an independent country. From 1777 to 1791 it printed its own currency, ran its own postal service, and operated its own foreign policy, mostly to keep New York and New Hampshire from carving it up between them. The Vermont Republic's constitution was the first in North America to ban slavery outright and the first to enshrine universal male suffrage regardless of property. When Vermont finally joined the Union as the fourteenth state, it did so on terms it largely set itself.",
      "The land is a long furrow between two mountain ranges — the Greens to the east and the Taconics to the west — with the Connecticut River drawing the eastern border and Lake Champlain the western. Roughly seventy-eight percent of the state is forested, the highest proportion in the United States. That figure used to be far lower; in the late nineteenth century, sheep farming and clear-cutting had reduced Vermont's forest cover to about thirty percent. The trees came back the way they always do here, slowly and on their own terms.",
      "Sugar maples reach their peak in Vermont because they need exactly what Vermont gives them: warm sunny days and freezing nights in succession, every March, for the sap to run sweet. The state produces roughly half the maple syrup in the United States, and the older sugar shacks still boil it down over wood fires for thirty hours to drive off thirty-nine parts of water for every one part of syrup. The result is, by mass, the densest source of distinct flavour molecules in the North American food economy.",
    ],
    attribution: {
      author: "Green Mountain Almanac",
      source: "https://example.com/states/vermont",
      license: "Editorial — single-read",
    },
    // 0.02 USDC — multi-option, USDC OR BTC
    accepts: [
      {
        scheme: "exact",
        network: "eip155:84532",
        amount: "20000",
        asset: USDC_BASE_SEPOLIA,
        payTo: DEMO_PAY_TO_EVM,
        maxTimeoutSeconds: 300,
        extra: { name: "USDC", version: "2" },
      },
      {
        scheme: "exact",
        network: "bip122:000000000019d6689c085ae165831e93",
        amount: "200", // 200 sats
        asset: "BTC",
        payTo: DEMO_PAY_TO_BTC,
        maxTimeoutSeconds: 600,
        extra: { unit: "sat" },
      },
    ],
    priceLabel: "$0.02 USDC or 200 sats",
    paymentExplainer:
      "Reader's choice. The page advertises two payment rails — pay in USDC on Base Sepolia, or in Bitcoin sats — and the wallet picks whichever one it can settle.",
  },
  {
    slug: "massachusetts",
    name: "Massachusetts",
    tagline: "By the sword we seek peace, but peace only under liberty.",
    heroUrl: pexels(16388120),
    heroPhotographer: "Grisha Besko",
    heroPhotoPage: "https://www.pexels.com/photo/16388120/",
    heroAlt:
      "Boston skyline at golden-hour sunset — modern skyscrapers and historic brownstones lit warm against a clear sky.",
    // Deep oxblood — Harvard crimson, the burgundy of old leather chairs at the Athenaeum
    bg: "#3a0e16",
    fg: "#f3e7d6",
    accent: "#cda85b",
    paragraphs: [
      "Massachusetts is a small state that has produced an outsized share of American institutions, partly by chronological accident — the Pilgrims and the Puritans got here early — and partly by an old conviction that public infrastructure is a form of moral self-improvement. The Boston Latin School, founded in 1635, predates Harvard by a year and is still operating. The first public library, the first public park, the first subway tunnel, and the first chocolate factory in North America are all in or just outside the city.",
      "The Wampanoag, who had farmed and fished this coast for at least ten thousand years, were already managing it with seasonal burns to keep the forests open and game-rich when the Mayflower's passengers arrived in 1620. The first decade of contact was a careful, mutually-skeptical alliance between the Wampanoag sachem Massasoit and the Plymouth colony — without which, by Plymouth's own records, the colony would not have survived. The unraveling that came later was neither inevitable nor accidental, and the consequences shaped every colonial relationship that followed.",
      "The Massachusetts of the eighteenth century invented the public meeting as a unit of governance, and the public meeting promptly invented the American Revolution. The Boston Tea Party, the Battles of Lexington and Concord, the writing of Common Sense in nearby Philadelphia and its mass distribution through the Boston papers — these weren't isolated flashpoints, they were the visible part of a fifty-year conversation in town halls about what a government owed the people who paid for it. The state's seal still carries a Native American with a downward-pointing arrow above the Latin: \"by the sword we seek peace, but peace only under liberty.\"",
    ],
    attribution: {
      author: "Bay State Review",
      source: "https://example.com/states/massachusetts",
      license: "Editorial — single-read",
    },
    // 0.10 USDC — premium tier
    accepts: [
      {
        scheme: "exact",
        network: "eip155:84532",
        amount: "100000", // 0.10 USDC
        asset: USDC_BASE_SEPOLIA,
        payTo: DEMO_PAY_TO_EVM,
        maxTimeoutSeconds: 300,
        extra: { name: "USDC", version: "2" },
      },
    ],
    priceLabel: "$0.10 USDC",
    paymentExplainer:
      "A dime. The going rate, roughly, for a deeply-reported magazine essay if you only had to pay for the one you actually read.",
  },
  {
    slug: "rhode-island",
    name: "Rhode Island",
    tagline: "Hope.",
    heroUrl: pexels(13337822),
    heroPhotographer: "Mohan Nannapaneni",
    heroPhotoPage: "https://www.pexels.com/photo/13337822/",
    heroAlt:
      "A tall ship with the American flag docked at Newport Harbor under a cloudy sky — masts rigged against grey water and old shingled buildings.",
    // Deep cobalt / Newport-harbor blue
    bg: "#0f253f",
    fg: "#eef1f5",
    accent: "#e0bd6e",
    paragraphs: [
      "Rhode Island is the smallest state and contains, despite that, the highest density of historical firsts per square mile of any place in the country. It was founded in 1636 by Roger Williams, exiled from Massachusetts for arguing that the civil magistrate had no jurisdiction over the conscience of the soul — a position that, when written into the colony's charter, made Rhode Island the first political entity in the English-speaking world to enshrine total religious liberty by law. Williams bought the land from the Narragansett sachems Canonicus and Miantonomi at a price he negotiated himself, in their language, which he had taught himself.",
      "The Narragansett, who held the bay before any European set foot here, ran a sophisticated network of trails connecting Cape Cod, Long Island, and the interior — much of which became the post roads of colonial New England and, eventually, US Route 1. Their wampum, made from purple and white quahog shells found only in Narragansett Bay, served as the de facto currency of the entire northeastern fur trade until well into the seventeenth century. Counterfeit wampum, made from inferior shells in Long Island and dyed dark, eventually collapsed the system the way bad money usually does.",
      "Industrial America began here in 1790, when Samuel Slater rebuilt from memory the British water-powered cotton spinning machinery he had been forbidden to take with him out of England. His mill on the Blackstone River in Pawtucket worked, and within forty years the river was lined end-to-end with textile mills, attracting French Canadian, Irish, Italian, Polish, and Portuguese workers in successive waves. Providence became, briefly, one of the wealthiest cities per capita on Earth. The state motto — Hope — is the shortest of any state's, and was chosen at the founding for a reason that's never been definitively recorded but which nobody has felt any need to change.",
    ],
    attribution: {
      author: "Ocean State Letters",
      source: "https://example.com/states/rhode-island",
      license: "Editorial — single-read",
    },
    // 500 sats BTC — non-EVM crypto
    accepts: [
      {
        scheme: "exact",
        network: "bip122:000000000019d6689c085ae165831e93",
        amount: "500",
        asset: "BTC",
        payTo: DEMO_PAY_TO_BTC,
        maxTimeoutSeconds: 600,
        extra: { unit: "sat" },
      },
    ],
    priceLabel: "500 sats BTC",
    paymentExplainer:
      "Bitcoin only. Some readers don't have a stablecoin wallet, and x402 makes it trivial to take any payment rail you want — including pure on-chain BTC.",
  },
  {
    slug: "connecticut",
    name: "Connecticut",
    tagline: "He who transplanted still sustains.",
    heroUrl: pexels(28915846),
    heroPhotographer: "David Kanigan",
    heroPhotoPage: "https://www.pexels.com/photo/28915846/",
    heroAlt:
      "Charming waterfront homes nestled in vibrant autumn foliage in Stamford, Connecticut — old colonial-shingled houses tucked between blazing sugar maples on a calm cove.",
    // Deep evergreen / charter-oak shade
    bg: "#1a2e26",
    fg: "#f0eadb",
    accent: "#cf9a4d",
    paragraphs: [
      "Connecticut writes its own constitution in 1639 — three years after settlement — and gives it a name, the Fundamental Orders. It is the first written constitution in the Western world to derive the authority of government solely from the consent of the governed, with no reference to the Crown or to God's appointment of any earthly ruler. One hundred and thirty-eight years later, the framers of the United States Constitution borrow heavily from it. The state's nickname, the Constitution State, is not a marketing slogan; it is a precise historical claim.",
      "The Quinnipiac, Pequot, Mohegan, and Niantic peoples held the river valleys and coastline, and the lower Connecticut River — which gives the state its name, from the Algonquian quinnitukq-ut, meaning \"at the long tidal river\" — was already a major trade artery. The Pequot War of 1636–37, the first major colonial conflict in New England, cleared the way for English settlement on terms that would echo through every subsequent treaty. The Mohegan signatures on the 1659 deed for the town of Norwich are still legible in the state archives.",
      "The Charter Oak, an enormous white oak in Hartford, becomes the state's secular relic when, in 1687, colonists hide the colony's royal charter inside its hollow trunk to prevent its seizure by the king's representative, Sir Edmund Andros. The tree falls in a storm in 1856; cuttings of it have been planted in every region of the state, and one of them, descended from the original, stands today on the grounds of the State Capitol. The state seal still depicts three grapevines under the Latin motto Qui transtulit sustinet — He who transplanted still sustains — referencing both the colonial founders and, more obliquely, the trees themselves.",
    ],
    attribution: {
      author: "Constitution State Almanac",
      source: "https://example.com/states/connecticut",
      license: "Editorial — single-read",
    },
    // Avalanche Fuji — same testnet idea, different EVM chain to vary the rail
    accepts: [
      {
        scheme: "exact",
        network: "eip155:43113", // Avalanche Fuji testnet
        amount: "50000", // 0.05 USDC
        asset: "0x5425890298aed601595a70AB815c96711a31Bc65", // USDC.e on Avalanche Fuji
        payTo: DEMO_PAY_TO_EVM,
        maxTimeoutSeconds: 300,
        extra: { name: "USDC", version: "2" },
      },
    ],
    priceLabel: "$0.05 USDC on Avalanche Fuji",
    paymentExplainer:
      "Same dollar, different rail. This page asks for USDC on Avalanche Fuji rather than Base Sepolia — illustrating that x402 is chain-agnostic and the wallet picks the network it can sign on.",
  },
];

export const getState = (slug: string) =>
  STATES.find((s) => s.slug === slug);

// ---- HTML rendering ---------------------------------------------------

const SHARED_HEAD = `
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap" rel="stylesheet">
  <link rel="preconnect" href="https://images.pexels.com">
`;

const SHARED_STYLES = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'EB Garamond', 'Garamond', Georgia, serif;
    font-feature-settings: 'kern', 'liga', 'onum', 'pnum';
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    line-height: 1.55;
  }
  a { color: inherit; }
  a:hover { opacity: 0.85; }
  ::selection { background: rgba(255,255,255,0.25); }
`;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Mix two hex colors (used to derive a slightly-darker hero overlay). */
function darken(hex: string, amount = 0.35): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const dr = Math.round(r * (1 - amount));
  const dg = Math.round(g * (1 - amount));
  const db = Math.round(b * (1 - amount));
  return `rgb(${dr}, ${dg}, ${db})`;
}

/** The index page at /states. */
export function renderIndex(): string {
  const cards = STATES.map((s) => {
    const subtitle = s.priceLabel;
    return `
      <a class="card" href="/states/${s.slug}" style="--bg:${s.bg};--fg:${s.fg};--accent:${s.accent}">
        <div class="card-photo" style="background-image: url('${s.heroUrl}')"></div>
        <div class="card-overlay"></div>
        <div class="card-text">
          <div class="card-tag">${escapeHtml(subtitle)}</div>
          <div class="card-name">${escapeHtml(s.name)}</div>
          <div class="card-tagline">${escapeHtml(s.tagline)}</div>
        </div>
      </a>
    `;
  }).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  ${SHARED_HEAD}
  <title>Six States · paid-content demo</title>
  <style>
    ${SHARED_STYLES}
    body {
      background: #0a0c10;
      color: #e8e3d4;
      min-height: 100vh;
    }
    header.hero {
      padding: 14vh 8vw 8vh;
      text-align: left;
      max-width: 1300px;
      margin: 0 auto;
    }
    header.hero h1 {
      font-family: 'EB Garamond', serif;
      font-weight: 500;
      font-style: italic;
      font-size: clamp(3.5rem, 8vw, 7rem);
      letter-spacing: -0.015em;
      line-height: 1.0;
      margin: 0 0 0.6rem;
      color: #f3ecdc;
    }
    header.hero p {
      font-size: clamp(1.1rem, 1.5vw, 1.35rem);
      max-width: 60ch;
      color: #b8b1a1;
      line-height: 1.55;
      margin: 0;
    }
    header.hero .pretitle {
      font-family: 'EB Garamond', serif;
      font-size: 0.78rem;
      letter-spacing: 0.32em;
      text-transform: uppercase;
      color: #847e6f;
      margin: 0 0 1.4rem;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 24px;
      padding: 0 6vw 14vh;
      max-width: 1400px;
      margin: 0 auto;
    }
    .card {
      position: relative;
      display: block;
      aspect-ratio: 4 / 5;
      overflow: hidden;
      border-radius: 4px;
      text-decoration: none;
      color: var(--fg);
      background: var(--bg);
      box-shadow: 0 1px 0 rgba(255,255,255,0.04), 0 30px 60px -30px rgba(0,0,0,0.6);
      transition: transform 380ms ease, box-shadow 380ms ease;
    }
    .card:hover { transform: translateY(-4px); box-shadow: 0 1px 0 rgba(255,255,255,0.06), 0 50px 80px -30px rgba(0,0,0,0.8); }
    .card-photo {
      position: absolute; inset: 0;
      background-size: cover;
      background-position: center;
      filter: saturate(1.05) brightness(0.92);
      transition: transform 800ms ease;
    }
    .card:hover .card-photo { transform: scale(1.04); }
    .card-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.85) 100%);
    }
    .card-text {
      position: absolute;
      left: 28px; right: 28px; bottom: 26px;
      color: var(--fg);
    }
    .card-tag {
      display: inline-block;
      font-size: 0.72rem;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      padding: 5px 10px;
      border: 1px solid var(--accent);
      color: var(--accent);
      border-radius: 999px;
      background: rgba(0,0,0,0.4);
      margin-bottom: 14px;
    }
    .card-name {
      font-family: 'EB Garamond', serif;
      font-weight: 500;
      font-size: clamp(2.4rem, 4vw, 3.6rem);
      line-height: 0.95;
      letter-spacing: -0.012em;
      margin: 0 0 6px;
    }
    .card-tagline {
      font-style: italic;
      font-size: 1.05rem;
      opacity: 0.9;
      max-width: 28ch;
    }

    footer {
      padding: 4vh 8vw 8vh;
      text-align: left;
      max-width: 1300px;
      margin: 0 auto;
      color: #6f6a5f;
      font-size: 0.95rem;
      border-top: 1px solid #1f2128;
    }
    footer a { color: #b8b1a1; text-decoration: none; border-bottom: 1px solid #3a3a3a; }
  </style>
</head>
<body>
  <header class="hero">
    <p class="pretitle">An x402 demonstration · six states · six payment flows</p>
    <h1>Six States.</h1>
    <p>One page for each New England state. Each one charges a different way to read it — different chains, different assets, different prices, different walls. Open any of them and watch your wallet decide.</p>
  </header>
  <main class="grid">
    ${cards}
  </main>
  <footer>
    Photography: Pexels, hot-linked. Type: EB Garamond. Payment: x402 v2 — see <a href="/api/articles">/api/articles</a> for the catalog or open any state page directly.
  </footer>
</body>
</html>`;
}

/** Compose the actual paid content for a state. */
export function renderStateBody(s: StateDef): string {
  const heroDark = darken(s.bg, 0.5);
  const paragraphs = s.paragraphs
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  ${SHARED_HEAD}
  <title>${escapeHtml(s.name)} · Six States</title>
  <style>
    ${SHARED_STYLES}
    body {
      background: ${s.bg};
      color: ${s.fg};
      min-height: 100vh;
    }
    .topbar {
      position: absolute; top: 0; left: 0; right: 0; z-index: 10;
      display: flex; justify-content: space-between; align-items: center;
      padding: 24px 6vw;
      color: ${s.fg};
    }
    .topbar a { text-decoration: none; opacity: 0.85; font-size: 0.95rem; letter-spacing: 0.08em; }
    .topbar a:hover { opacity: 1; }
    .topbar .pretitle { font-size: 0.72rem; letter-spacing: 0.32em; text-transform: uppercase; opacity: 0.6; }

    .hero {
      position: relative;
      height: 80vh;
      min-height: 600px;
      overflow: hidden;
      background: ${heroDark};
    }
    .hero-photo {
      position: absolute; inset: 0;
      background-image: url('${s.heroUrl}');
      background-size: cover;
      background-position: center;
      filter: saturate(1.05);
    }
    .hero-veil {
      position: absolute; inset: 0;
      background: linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 35%, ${s.bg} 100%);
    }
    .hero-text {
      position: absolute;
      left: 6vw; right: 6vw; bottom: 8vh;
      color: ${s.fg};
    }
    .hero-pretitle {
      font-size: 0.85rem;
      letter-spacing: 0.32em;
      text-transform: uppercase;
      color: ${s.accent};
      margin: 0 0 1rem;
    }
    .hero-name {
      font-family: 'EB Garamond', serif;
      font-weight: 500;
      font-size: clamp(4rem, 14vw, 13rem);
      line-height: 0.9;
      letter-spacing: -0.025em;
      margin: 0;
      text-shadow: 0 2px 30px rgba(0,0,0,0.35);
    }
    .hero-tagline {
      font-style: italic;
      font-size: clamp(1.2rem, 1.8vw, 1.6rem);
      opacity: 0.92;
      margin: 0.6rem 0 0;
      max-width: 50ch;
    }

    article {
      max-width: 720px;
      margin: 0 auto;
      padding: 8vh 6vw 4vh;
    }
    article p {
      font-size: 1.28rem;
      line-height: 1.65;
      margin: 0 0 1.5em;
      color: ${s.fg};
    }
    article p:first-of-type::first-letter {
      font-family: 'EB Garamond', serif;
      font-weight: 500;
      font-size: 4.6em;
      line-height: 0.85;
      float: left;
      padding: 0.05em 0.12em 0 0;
      color: ${s.accent};
    }

    .receipt {
      max-width: 720px;
      margin: 4vh auto 0;
      padding: 22px 24px;
      border-top: 1px solid rgba(255,255,255,0.18);
      border-bottom: 1px solid rgba(255,255,255,0.18);
      display: flex;
      align-items: baseline;
      gap: 18px;
      font-size: 0.95rem;
      opacity: 0.85;
    }
    .receipt .label {
      font-size: 0.72rem;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: ${s.accent};
    }
    .receipt .x { font-family: 'IBM Plex Mono', ui-monospace, Menlo, monospace; opacity: 0.7; font-size: 0.85rem; }

    footer.attribution {
      max-width: 720px;
      margin: 0 auto;
      padding: 4vh 6vw 10vh;
      font-size: 0.92rem;
      opacity: 0.62;
    }
    footer.attribution a { border-bottom: 1px dotted rgba(255,255,255,0.4); text-decoration: none; }
    footer.attribution .photo-credit { display: block; margin-top: 12px; font-style: italic; }
  </style>
</head>
<body>
  <nav class="topbar">
    <a href="/states">← Six States</a>
    <span class="pretitle">x402 · paid</span>
  </nav>
  <section class="hero">
    <div class="hero-photo" role="img" aria-label="${escapeHtml(s.heroAlt)}"></div>
    <div class="hero-veil"></div>
    <div class="hero-text">
      <p class="hero-pretitle">${escapeHtml(s.tagline)}</p>
      <h1 class="hero-name">${escapeHtml(s.name)}</h1>
    </div>
  </section>
  <article>
    ${paragraphs}
    <div class="receipt">
      <span class="label">Receipt</span>
      <span>Paid · ${escapeHtml(s.priceLabel)} · x402 v2</span>
      <span class="x">X-PAYMENT settled</span>
    </div>
  </article>
  <footer class="attribution">
    Hero photograph by <a href="${s.heroPhotoPage}" target="_blank" rel="noopener">${escapeHtml(s.heroPhotographer)}</a> on Pexels.<br>
    <span class="photo-credit">Editorial © ${escapeHtml(s.attribution.author)} — single-read license issued via x402.</span>
  </footer>
</body>
</html>`;
}

/** The 402 paywall page — same aesthetic, different message. */
export function renderPaywall(s: StateDef, req: Request): string {
  const heroDark = darken(s.bg, 0.5);
  const acceptList = s.accepts
    .map((a) => {
      const network = humanNetwork(a.network);
      const asset = humanAsset(a);
      return `
        <li>
          <span class="net">${escapeHtml(network)}</span>
          <span class="amount">${escapeHtml(humanAmount(a))}</span>
          <span class="asset">${escapeHtml(asset)}</span>
        </li>
      `;
    })
    .join("\n");

  const resourceUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;

  return `<!doctype html>
<html lang="en">
<head>
  ${SHARED_HEAD}
  <title>${escapeHtml(s.name)} · payment required</title>
  <style>
    ${SHARED_STYLES}
    body {
      background: ${s.bg};
      color: ${s.fg};
      min-height: 100vh;
    }
    .topbar {
      position: absolute; top: 0; left: 0; right: 0; z-index: 10;
      display: flex; justify-content: space-between; align-items: center;
      padding: 24px 6vw;
      color: ${s.fg};
    }
    .topbar a { text-decoration: none; opacity: 0.85; font-size: 0.95rem; letter-spacing: 0.08em; }
    .topbar a:hover { opacity: 1; }
    .topbar .pretitle { font-size: 0.72rem; letter-spacing: 0.32em; text-transform: uppercase; opacity: 0.7; color: ${s.accent}; }

    .hero {
      position: relative;
      height: 70vh;
      min-height: 540px;
      overflow: hidden;
      background: ${heroDark};
    }
    .hero-photo {
      position: absolute; inset: 0;
      background-image: url('${s.heroUrl}');
      background-size: cover;
      background-position: center;
      filter: saturate(1.0) blur(2px) brightness(0.7);
    }
    .hero-veil {
      position: absolute; inset: 0;
      background: linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.55) 50%, ${s.bg} 100%);
    }
    .hero-text {
      position: absolute;
      left: 6vw; right: 6vw; bottom: 8vh;
      color: ${s.fg};
    }
    .hero-pretitle {
      font-size: 0.85rem;
      letter-spacing: 0.32em;
      text-transform: uppercase;
      color: ${s.accent};
      margin: 0 0 1rem;
    }
    .hero-name {
      font-family: 'EB Garamond', serif;
      font-weight: 500;
      font-size: clamp(4rem, 14vw, 13rem);
      line-height: 0.9;
      letter-spacing: -0.025em;
      margin: 0;
      text-shadow: 0 2px 30px rgba(0,0,0,0.35);
    }

    .paywall {
      max-width: 640px;
      margin: 75px auto 0;
      position: relative;
      z-index: 5;
      padding: 38px 38px 34px;
      background: rgba(0,0,0,0.32);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 6px;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    .paywall .stamp {
      display: inline-block;
      font-size: 0.7rem;
      letter-spacing: 0.32em;
      text-transform: uppercase;
      padding: 6px 12px;
      border: 1px solid ${s.accent};
      color: ${s.accent};
      border-radius: 999px;
      margin-bottom: 22px;
    }
    .paywall h2 {
      font-family: 'EB Garamond', serif;
      font-weight: 500;
      font-size: 2.2rem;
      line-height: 1.15;
      margin: 0 0 14px;
    }
    .paywall p {
      font-size: 1.13rem;
      line-height: 1.6;
      margin: 0 0 18px;
      color: ${s.fg};
      opacity: 0.92;
    }
    ul.accepts {
      list-style: none;
      padding: 0;
      margin: 22px 0;
      border-top: 1px solid rgba(255,255,255,0.14);
    }
    ul.accepts li {
      display: grid;
      grid-template-columns: 1fr auto auto;
      align-items: baseline;
      gap: 16px;
      padding: 14px 0;
      border-bottom: 1px solid rgba(255,255,255,0.14);
      font-size: 1.04rem;
    }
    ul.accepts .net { opacity: 0.85; }
    ul.accepts .amount { font-feature-settings: 'tnum'; font-weight: 600; color: ${s.accent}; }
    ul.accepts .asset { opacity: 0.75; font-style: italic; }

    .technical {
      margin-top: 24px;
      padding: 14px 16px;
      background: rgba(0,0,0,0.28);
      border-radius: 4px;
      font-family: 'IBM Plex Mono', ui-monospace, Menlo, monospace;
      font-size: 0.78rem;
      line-height: 1.55;
      opacity: 0.85;
      word-break: break-all;
    }
    .technical .k { color: ${s.accent}; }

    footer.attribution {
      max-width: 720px;
      margin: 5vh auto 0;
      padding: 0 6vw 10vh;
      font-size: 0.88rem;
      opacity: 0.55;
    }
    footer.attribution a { border-bottom: 1px dotted rgba(255,255,255,0.4); text-decoration: none; }
  </style>
</head>
<body>
  <nav class="topbar">
    <a href="/states">← Six States</a>
    <span class="pretitle">x402 · 402 payment required</span>
  </nav>
  <section class="hero">
    <div class="hero-photo" role="img" aria-label="${escapeHtml(s.heroAlt)}"></div>
    <div class="hero-veil"></div>
    <div class="hero-text">
      <p class="hero-pretitle">${escapeHtml(s.tagline)}</p>
      <h1 class="hero-name">${escapeHtml(s.name)}</h1>
    </div>
  </section>
  <section class="paywall">
    <span class="stamp">Payment required</span>
    <h2>This page is paywalled.</h2>
    <p>${escapeHtml(s.paymentExplainer)}</p>
    <ul class="accepts">
      ${acceptList}
    </ul>
    <p style="opacity:0.78;font-size:0.98rem;">Send your payment proof in an <code style="font-family:'IBM Plex Mono',ui-monospace,monospace">X-PAYMENT</code> header and request this URL again. Any non-empty value is accepted in demo mode.</p>
    <div class="technical">
      <div><span class="k">resource</span>: ${escapeHtml(resourceUrl)}</div>
      <div><span class="k">x402Version</span>: 1</div>
      <div><span class="k">accepts[]</span>: see Payment-Required header (full v2 payload)</div>
    </div>
  </section>
  <footer class="attribution">
    Hero by <a href="${s.heroPhotoPage}" target="_blank" rel="noopener">${escapeHtml(s.heroPhotographer)}</a> · Pexels.
  </footer>
</body>
</html>`;
}

// ---- helpers for paywall display --------------------------------------

function humanNetwork(caip: string): string {
  switch (caip) {
    case "eip155:84532": return "Base Sepolia";
    case "eip155:8453":  return "Base";
    case "eip155:43113": return "Avalanche Fuji";
    case "eip155:43114": return "Avalanche";
    case "eip155:1":     return "Ethereum";
    case "bip122:000000000019d6689c085ae165831e93": return "Bitcoin";
    default: return caip;
  }
}

function humanAsset(a: AcceptOption): string {
  if (a.asset === "BTC") return "BTC";
  if (a.extra && (a.extra as Record<string, unknown>).name) {
    return String((a.extra as Record<string, unknown>).name);
  }
  return a.asset;
}

function humanAmount(a: AcceptOption): string {
  if (a.asset === "BTC") return `${a.amount} sats`;
  // assume 6 decimals for USDC family
  const n = Number(a.amount) / 1_000_000;
  return n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`;
}
