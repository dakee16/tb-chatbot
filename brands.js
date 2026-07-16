// brands.js — the registry for all 9 storefronts.
//
// ONE backend (chat.tilesbay.net) serves every site. Each site's <script> tag
// carries data-brand="tilesbay" (etc.). The widget sends that slug with every
// request, and the backend uses it to pick the right accent color, contact
// info, and Zammad chat.
//
// To add or change a brand: edit this file, git push, git pull on the VPS,
// pm2 restart. Nothing else needs to change.
//
// PRODUCT CATALOG: the owner is generating one XML feed PER SITE from the
// same template (9 files total), each with that site's own product URLs and
// only the products that site actually sells. Each file goes on the VPS at:
//   /opt/chat/data/<slug>-feed.xml
// e.g. tilesbay-feed.xml, findstone-feed.xml, stackedstone-feed.xml, etc.
// lib/catalog.js reads data/<brand.slug>-feed.xml by default — no per-brand
// config needed here unless a brand's file is named differently, in which
// case set `feedFile: 'whatever.xml'` on that brand below.

const DEFAULT = {
  // fallbacks used if a brand omits a field
  accent: '#e11d2e',
  accentSoft: 'rgba(225,29,46,0.10)',
  contact: { email: 'csr@tilesbay.com', phone: '(855) 740-5157' },
  teaserHook: "👋 Got a project in mind?",
  teaserSub: "I can help you find the right product and figure out how much you need.",
  cta: 'Need Help?',
};

export const BRANDS = {
  tilesbay: {
    slug: 'tilesbay',
    name: 'Tilesbay',
    header: 'Tilesbay Assistant',
    greeting: "Hi! I can help you find the right tile or work out how much you need. What are you working on?",
    teaserHook: "👋 Need the right tile for your project?",
    teaserSub: "I can help you find it and figure out how much you need.",
    accent: '#e11d2e',
    accentSoft: 'rgba(225,29,46,0.10)',
    domain: 'https://www.tilesbay.com',
    contact: { email: 'csr@tilesbay.com', phone: '(855) 740-5157' },
    zammadChatId: 1,
    zammadGroup: 'Tilesbay',
    blurb: 'wholesale natural stone, porcelain and ceramic tile',
  },

  findstone: {
    slug: 'findstone',
    name: 'Findstone',
    header: 'Findstone Assistant',
    greeting: "Hi! Looking for the right stone? Tell me your project and I'll help you find it and size it up.",
    teaserHook: "👋 Looking for the right stone?",
    teaserSub: "Tell me your project and I'll help you find it and size it up.",
    accent: '#6f7a4a',
    accentSoft: 'rgba(111,122,74,0.12)',
    domain: 'https://www.findstone.us',
    contact: { email: 'csr@findstone.us', phone: '(855) 740-5157' },
    zammadChatId: 2,
    zammadGroup: 'Findstone',
    blurb: 'natural stone, tile, mosaics and moldings',
  },

  flooringntile: {
    slug: 'flooringntile',
    name: 'FlooringnTile',
    header: 'FlooringnTile Assistant',
    greeting: "Hi! I can help you pick flooring or tile and figure out how much you'll need. What's the project?",
    teaserHook: "👋 Picking flooring or tile?",
    teaserSub: "I can help you choose and figure out how much you'll need.",
    accent: '#2f6ca6',
    accentSoft: 'rgba(47,108,166,0.10)',
    domain: 'https://www.flooringntile.com',
    contact: { email: 'csr@flooringntile.com', phone: '(855) 740-5157' },
    zammadChatId: 3,
    zammadGroup: 'FlooringnTile',
    blurb: 'natural stone, porcelain, ceramic and landscape tile',
  },

  backsplash: {
    slug: 'backsplash',
    name: 'Backsplash Tile',
    header: 'Backsplash Tile Assistant',
    greeting: "Hi! Redoing a backsplash? Tell me the look you're after and I'll help you find it.",
    teaserHook: "👋 Redoing your backsplash?",
    teaserSub: "Tell me the look you're after and I'll help you find it.",
    accent: '#3a8dd8',
    accentSoft: 'rgba(58,141,216,0.10)',
    domain: 'https://www.backsplash-tile.us',
    contact: { email: 'csr@backsplash-tile.us', phone: '(855) 740-5157' },
    zammadChatId: 4,
    zammadGroup: 'Backsplash',
    blurb: 'kitchen backsplash, subway, mosaic and decorative tile',
  },

  floortiles: {
    slug: 'floortiles',
    name: 'Floor Tiles',
    header: 'Floor Tiles Assistant',
    greeting: "Hi! I can help you find floor tile and calculate how much you need. What room are you doing?",
    teaserHook: "👋 Need floor tile?",
    teaserSub: "I can help you find it and calculate how much you need.",
    accent: '#2f5f5b',
    accentSoft: 'rgba(47,95,91,0.11)',
    domain: 'https://www.floor-tiles.us',
    contact: { email: 'csr@floor-tiles.us', phone: '(855) 740-5157' },
    zammadChatId: 5,
    zammadGroup: 'Floor Tiles',
    blurb: 'natural stone, porcelain, ceramic and luxury vinyl flooring',
  },

  patiopavers: {
    slug: 'patiopavers',
    name: 'Patio Pavers',
    header: 'Patio Pavers Assistant',
    greeting: "Hi! Planning a patio or walkway? Tell me about it and I'll help you find the right pavers.",
    teaserHook: "👋 Planning a patio or walkway?",
    teaserSub: "Tell me about it and I'll help you find the right pavers.",
    accent: '#3f7d9e',
    accentSoft: 'rgba(63,125,158,0.11)',
    domain: 'https://www.patio-pavers.us',
    contact: { email: 'csr@patio-pavers.us', phone: '(855) 740-5157' },
    zammadChatId: 6,
    zammadGroup: 'Patio Pavers',
    blurb: 'natural stone and porcelain pavers, coping and hardscape',
  },

  porcelaintile: {
    slug: 'porcelaintile',
    name: 'Porcelain Tile',
    header: 'Porcelain Tile Assistant',
    greeting: "Hi! I can help you find porcelain tile and size up your order. What are you working on?",
    teaserHook: "👋 Looking for porcelain tile?",
    teaserSub: "I can help you find it and size up your order.",
    accent: '#00a9c7',
    accentSoft: 'rgba(0,169,199,0.10)',
    domain: 'https://www.porcelain-tile.us',
    contact: { email: 'csr@porcelain-tile.us', phone: '(855) 740-5157' },
    zammadChatId: 7,
    zammadGroup: 'Porcelain Tile',
    blurb: 'porcelain and ceramic flooring, mosaics and wall tile',
  },

  stackedstone: {
    slug: 'stackedstone',
    name: 'Stacked Stone',
    header: 'Stacked Stone Assistant',
    greeting: "Hi! Working on a stone feature wall? Tell me about it and I'll help you find the right panels.",
    teaserHook: "👋 Working on a stone feature wall?",
    teaserSub: "Tell me about it and I'll help you find the right panels.",
    accent: '#4f8a86',
    accentSoft: 'rgba(79,138,134,0.11)',
    domain: 'https://www.stacked-stone.us',
    contact: { email: 'csr@stacked-stone.us', phone: '(404) 905-9675' },
    zammadChatId: 8,
    zammadGroup: 'Stacked Stone',
    blurb: 'stacked stone, ledger panels and stone veneer',
  },

  lvp: {
    slug: 'lvp',
    name: 'Luxury Vinyl Plank Flooring',
    header: 'LVP Flooring Assistant',
    greeting: "Hi! I can help you find luxury vinyl plank flooring and calculate coverage. What's the space?",
    teaserHook: "👋 Need luxury vinyl plank flooring?",
    teaserSub: "I can help you calculate coverage and find the right plank.",
    accent: '#8a6d43',
    accentSoft: 'rgba(138,109,67,0.12)',
    domain: 'https://www.luxury-vinyl-plank-flooring.com',
    contact: { email: 'csr@luxury-vinyl-plank-flooring.com', phone: '(855) 740-5157' },
    zammadChatId: 9,
    zammadGroup: 'Luxury Vinyl Plank Flooring',
    blurb: 'luxury vinyl plank and rigid-core flooring',
  },
};

// Resolve a slug to a brand, defaulting to tilesbay for unknown/missing slugs.
export function getBrand(slug) {
  if (slug && BRANDS[slug]) return BRANDS[slug];
  return BRANDS.tilesbay;
}

// Only the fields the widget/browser is allowed to see (no api keys, no feed url).
export function publicBrandConfig(slug) {
  const b = getBrand(slug);
  return {
    slug: b.slug,
    name: b.name,
    header: b.header,
    greeting: b.greeting,
    accent: b.accent || DEFAULT.accent,
    accentSoft: b.accentSoft || DEFAULT.accentSoft,
    contact: b.contact || DEFAULT.contact,
    zammadChatId: b.zammadChatId || 1,
    teaserHook: b.teaserHook || DEFAULT.teaserHook,
    teaserSub: b.teaserSub || DEFAULT.teaserSub,
    cta: b.cta || DEFAULT.cta,
  };
}

// The set of allowed browser origins (used for CORS). Includes www + apex.
export function brandOrigins() {
  const origins = new Set();
  for (const slug of Object.keys(BRANDS)) {
    const d = BRANDS[slug].domain;
    if (!d) continue;
    origins.add(d);                                   // https://www.foo.com
    origins.add(d.replace('://www.', '://'));         // https://foo.com
  }
  return origins;
}