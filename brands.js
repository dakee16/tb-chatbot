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
// PRODUCT CATALOG: all 9 brands share ONE Magento backend and ONE product
// feed — /opt/chat/data/tilesbay-feed.xml. It is NOT split per brand: category
// paths use tilesbay's own taxonomy, and every product URL points at
// tilesbay.com regardless of which storefront actually sells it. Two known
// limitations from this, until/unless the owner adds a per-product website
// tag to the feed template:
//   1. Product links shown on a non-tilesbay site's chat will point to
//      tilesbay.com, not that site's own domain.
//   2. Nothing in the data prevents a brand's bot from surfacing a product
//      that isn't really sold on that storefront — the catalog has no
//      per-brand partition, only category/material/name text to go on.
export const SHARED_FEED_FILE = 'tilesbay-feed.xml'; // lives in /opt/chat/data/

const DEFAULT = {
  // fallbacks used if a brand omits a field
  accent: '#e11d2e',
  accentSoft: 'rgba(225,29,46,0.10)',
  contact: { email: 'csr@tilesbay.com', phone: '(855) 740-5157' },
};

export const BRANDS = {
  tilesbay: {
    slug: 'tilesbay',
    name: 'Tilesbay',
    header: 'Tilesbay Assistant',
    greeting: "Hi! I can help you find the right tile or work out how much you need. What are you working on?",
    accent: '#e11d2e',
    accentSoft: 'rgba(225,29,46,0.10)',
    domain: 'https://www.tilesbay.com',
    contact: { email: 'csr@tilesbay.com', phone: '(855) 740-5157' },
    zammadChatId: 1,
    blurb: 'wholesale natural stone, porcelain and ceramic tile',
  },

  findstone: {
    slug: 'findstone',
    name: 'Findstone',
    header: 'Findstone Assistant',
    greeting: "Hi! Looking for the right stone? Tell me your project and I'll help you find it and size it up.",
    accent: '#6f7a4a',
    accentSoft: 'rgba(111,122,74,0.12)',
    domain: 'https://www.findstone.us',
    contact: { email: 'csr@findstone.us', phone: '(855) 740-5157' },
    zammadChatId: 2,
    blurb: 'natural stone, tile, mosaics and moldings',
  },

  flooringntile: {
    slug: 'flooringntile',
    name: 'FlooringnTile',
    header: 'FlooringnTile Assistant',
    greeting: "Hi! I can help you pick flooring or tile and figure out how much you'll need. What's the project?",
    accent: '#2f6ca6',
    accentSoft: 'rgba(47,108,166,0.10)',
    domain: 'https://www.flooringntile.com',
    contact: { email: 'csr@flooringntile.com', phone: '(855) 740-5157' },
    zammadChatId: 3,
    blurb: 'natural stone, porcelain, ceramic and landscape tile',
  },

  backsplash: {
    slug: 'backsplash',
    name: 'Backsplash Tile',
    header: 'Backsplash Tile Assistant',
    greeting: "Hi! Redoing a backsplash? Tell me the look you're after and I'll help you find it.",
    accent: '#3a8dd8',
    accentSoft: 'rgba(58,141,216,0.10)',
    domain: 'https://www.backsplash-tile.us',
    contact: { email: 'csr@backsplash-tile.us', phone: '(855) 740-5157' },
    zammadChatId: 4,
    blurb: 'kitchen backsplash, subway, mosaic and decorative tile',
  },

  floortiles: {
    slug: 'floortiles',
    name: 'Floor Tiles',
    header: 'Floor Tiles Assistant',
    greeting: "Hi! I can help you find floor tile and calculate how much you need. What room are you doing?",
    accent: '#2f5f5b',
    accentSoft: 'rgba(47,95,91,0.11)',
    domain: 'https://www.floor-tiles.us',
    contact: { email: 'csr@floor-tiles.us', phone: '(855) 740-5157' },
    zammadChatId: 5,
    blurb: 'natural stone, porcelain, ceramic and luxury vinyl flooring',
  },

  patiopavers: {
    slug: 'patiopavers',
    name: 'Patio Pavers',
    header: 'Patio Pavers Assistant',
    greeting: "Hi! Planning a patio or walkway? Tell me about it and I'll help you find the right pavers.",
    accent: '#3f7d9e',
    accentSoft: 'rgba(63,125,158,0.11)',
    domain: 'https://www.patio-pavers.us',
    contact: { email: 'csr@patio-pavers.us', phone: '(855) 740-5157' },
    zammadChatId: 6,
    blurb: 'natural stone and porcelain pavers, coping and hardscape',
  },

  porcelaintile: {
    slug: 'porcelaintile',
    name: 'Porcelain Tile',
    header: 'Porcelain Tile Assistant',
    greeting: "Hi! I can help you find porcelain tile and size up your order. What are you working on?",
    accent: '#00a9c7',
    accentSoft: 'rgba(0,169,199,0.10)',
    domain: 'https://www.porcelain-tile.us',
    contact: { email: 'csr@porcelain-tile.us', phone: '(855) 740-5157' },
    zammadChatId: 7,
    blurb: 'porcelain and ceramic flooring, mosaics and wall tile',
  },

  stackedstone: {
    slug: 'stackedstone',
    name: 'Stacked Stone',
    header: 'Stacked Stone Assistant',
    greeting: "Hi! Working on a stone feature wall? Tell me about it and I'll help you find the right panels.",
    accent: '#4f8a86',
    accentSoft: 'rgba(79,138,134,0.11)',
    domain: 'https://www.stacked-stone.us',
    contact: { email: 'csr@stacked-stone.us', phone: '(404) 905-9675' },
    zammadChatId: 8,
    blurb: 'stacked stone, ledger panels and stone veneer',
  },

  lvp: {
    slug: 'lvp',
    name: 'Luxury Vinyl Plank Flooring',
    header: 'LVP Flooring Assistant',
    greeting: "Hi! I can help you find luxury vinyl plank flooring and calculate coverage. What's the space?",
    accent: '#8a6d43',
    accentSoft: 'rgba(138,109,67,0.12)',
    domain: 'https://www.luxury-vinyl-plank-flooring.com',
    contact: { email: 'csr@luxury-vinyl-plank-flooring.com', phone: '(855) 740-5157' },
    zammadChatId: 9,
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