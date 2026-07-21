// lib/catalog.js — product catalog backed by each brand's XML feed.
//
// Priority chain for product data:
//   1. This feed (fast, in-memory, has coverage + box weight for shipping math)
//   2. chatbot-api.php via lib/magento.js (live Magento) — fallback
//   3. caller decides to defer to a human
//
// The feed is fetched per brand on first use and cached for FEED_TTL_MS. Each
// brand's feed url + accent etc. live in brands.js.
//
// Feed quirks handled here (from the real tilesbay feed):
//   - coverage_per_box / pieces_per_box are EMPTY -> derive from price_unit
//     ("10.00 sqft" -> 10 sqft per box; "1.00 ct" -> 1 piece per unit)
//   - numbers use comma thousands separators ("1,307.35")
//   - box_weight of 1999 is Magento's "unset" default -> treat as unknown
//   - CDATA values have padding spaces -> trimmed
//   - <price>/<special_price> are per-BOX totals; we divide by pu.qty to get
//     a true per-unit (per-sqft or per-piece) price so downstream code doesn't
//     multiply a box price by sqft and blow up the cost estimate.
//   - <thick> is thickness in inches, e.g. 0.37" — parsed to a numeric field
//     so search can filter by thickness without letting the model guess.

import fs from 'fs';
import path from 'path';
import { getBrand } from '../brands.js';
import { WEIGHT_SENTINEL } from './shipping.js';

const FEED_TTL_MS = 1000 * 60 * 60; // re-read each brand's feed hourly
// Cache by resolved file path. Each brand now has its own file, so this is
// effectively per-brand -- keying by path (not slug) just means if two
// brands ever point at the same file, it's only parsed once.
const _fileCache = {}; // absPath -> { products, ts }

// Where feed files live. Override with FEED_DIR if needed.
const FEED_DIR = process.env.FEED_DIR || path.join(process.cwd(), 'data');

function localFeedPath(brand) {
  // Default: data/<slug>-feed.xml. Override per-brand with `feedFile` if a
  // file is named differently.
  const file = brand.feedFile || (brand.slug + '-feed.xml');
  return path.isAbsolute(file) ? file : path.join(FEED_DIR, file);
}

// ---------- tiny value helpers ----------

function num(s) {
  if (s == null || s === '') return null;
  const n = parseFloat(String(s).replace(/,/g, '').trim());
  return isNaN(n) ? null : n;
}

// Extract one field from a <product> body. Handles <tag>..</tag>, <tag/>, CDATA.
function field(body, tag) {
  const re = new RegExp('<' + tag + '\\s*/>|<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + tag + '>', 'i');
  const m = body.match(re);
  if (!m || m[1] == null) return '';
  let v = m[1];
  const cd = v.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  if (cd) v = cd[1];
  return v.replace(/\s+/g, ' ').trim();
}

// "10.00 sqft" -> { qty: 10, unit: 'sqft' }; "1,307.35 sqft" -> {1307.35,'sqft'}
function parsePriceUnit(s) {
  if (!s) return { qty: null, unit: null };
  const m = s.match(/([\d,]+(?:\.\d+)?)\s*([a-zA-Z]+)/);
  if (!m) return { qty: null, unit: null };
  let unit = m[2].toLowerCase();
  if (unit === 'ct' || unit === 'pc' || unit === 'pcs' || unit === 'piece' || unit === 'pieces' || unit === 'each') unit = 'ct';
  if (unit === 'sqft' || unit === 'sf' || unit === 'sqfeet') unit = 'sqft';
  return { qty: num(m[1]), unit };
}

// ---------- parse one product ----------

function parseProduct(body) {
  const name = field(body, 'name');
  if (!name) return null;

  const pu = parsePriceUnit(field(body, 'price_unit'));
  let boxWeight = num(field(body, 'box_weight'));
  if (boxWeight === WEIGHT_SENTINEL) boxWeight = null; // "unset" default

  const price = num(field(body, 'price'));
  const special = num(field(body, 'special_price'));

  // price/special in the feed are per-BOX totals. pu.qty is how many base
  // units (sqft, or count for 'ct') that box covers. Divide down to a true
  // per-unit price. Guard against qty 0/null so we never divide by zero.
  const qty = (pu.qty && pu.qty > 0) ? pu.qty : 1;
  const perUnitPrice = price != null ? price / qty : null;
  const perUnitSpecial = (special != null && special > 0) ? special / qty : special;

  // <thick> is inches, e.g. "0.37\"". num() strips the trailing inch mark fine.
  const thicknessIn = num(field(body, 'thick'));

  return {
    id: field(body, 'id'),         // this is the product code / MPN — the identifier we prefer
    sku: field(body, 'sku'),       // separate internal SKU
    name,
    url: field(body, 'url'),
    price: perUnitPrice,
    specialPrice: perUnitSpecial,
    unitPrice: (perUnitSpecial != null && perUnitSpecial > 0) ? perUnitSpecial : perUnitPrice, // per 1 base unit
    unitQty: pu.qty,        // sqft per box, or pieces per unit
    unitType: pu.unit,      // 'sqft' | 'ct' | null
    boxWeight,              // weight per price_unit quantity (null if unknown)
    thicknessIn,            // numeric thickness in inches; null if not parseable
    minOrderQty: num(field(body, 'min_order_qty')),
    size: field(body, 'size'),
    material: field(body, 'material'),
    color: field(body, 'color'),
    finish: field(body, 'finish'),
    category: field(body, 'category'),
    availability: field(body, 'availability'),
    description: field(body, 'description').slice(0, 280),
    image: field(body, 'image'),
  };
}

function parseFeed(xml) {
  const out = [];
  let idx = 0;
  while (true) {
    const start = xml.indexOf('<product>', idx);
    if (start === -1) break;
    const end = xml.indexOf('</product>', start);
    if (end === -1) break;
    const body = xml.slice(start + 9, end);
    const p = parseProduct(body);
    if (p) out.push(p);
    idx = end + 10;
  }
  return out;
}

// ---------- fetch + cache ----------

async function fetchFeed(url) {
  // The feed is a static file under /media/, so Sucuri normally lets it through.
  // Allow a mismatched cert in case we ever point at the origin IP directly.
  const prevTLS = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/xml' } });
    clearTimeout(t);
    if (!res.ok) throw new Error('feed HTTP ' + res.status);
    const xml = await res.text();
    return parseFeed(xml);
  } finally {
    if (prevTLS === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prevTLS;
  }
}

async function getCatalog(slug) {
  const brand = getBrand(slug);
  const localPath = localFeedPath(brand);
  const now = Date.now();

  // Cached by file path -> shared across all brands pointing at the same file
  // (i.e. all 9, right now), so the feed is parsed once, not 9 times.
  if (_fileCache[localPath] && now - _fileCache[localPath].ts < FEED_TTL_MS) {
    return _fileCache[localPath].products;
  }

  // 1) local file first — no network, avoids the Sucuri/Varnish path entirely.
  try {
    if (fs.existsSync(localPath)) {
      const xml = fs.readFileSync(localPath, 'utf-8');
      const products = parseFeed(xml);
      _fileCache[localPath] = { products, ts: now };
      console.log('[catalog] loaded ' + products.length + ' products from ' + localPath + ' (used by ' + slug + ')');
      return products;
    }
  } catch (e) {
    console.error('[catalog] local read error (' + localPath + '): ' + e.message);
  }

  // 2) fall back to fetching a feed url, only if the brand still has one set.
  if (brand.feedUrl) {
    try {
      const products = await fetchFeed(brand.feedUrl);
      _fileCache[localPath] = { products, ts: now };
      console.log('[catalog] ' + slug + ': ' + products.length + ' products from feed url');
      return products;
    } catch (e) {
      console.error('[catalog] ' + slug + ' feed url error: ' + e.message);
    }
  }

  if (_fileCache[localPath]) return _fileCache[localPath].products; // serve stale on error
  console.error('[catalog] no feed available for ' + slug + ' (expected at ' + localPath + ')');
  return [];
}

// ---------- search ----------

function haystack(p) {
  // Include id (product code) and sku so a customer typing either can match.
  return (p.id + ' ' + p.sku + ' ' + p.name + ' ' + p.material + ' ' + p.color + ' ' +
    p.size + ' ' + p.finish + ' ' + p.category).toLowerCase();
}

function publicProduct(p) {
  return {
    code: p.id,                    // product code / MPN — the identifier we prefer
    sku: p.sku || undefined,       // separate internal SKU
    name: p.name,
    url: p.url,
    price: p.unitPrice,
    price_unit: p.unitType === 'sqft' ? '/sqft' : (p.unitType === 'ct' ? '/piece' : ''),
    thickness_in: p.thicknessIn != null ? p.thicknessIn : undefined,
    size: p.size || undefined,
    material: p.material || undefined,
    color: p.color || undefined,
    finish: p.finish || undefined,
    availability: p.availability || undefined,
    image: p.image || undefined,
    description: p.description || undefined,
  };
}

/**
 * Rank products in a brand's feed against a free-text query.
 * Requires all terms to match when possible; otherwise returns best partials.
 * Optional minThicknessCm applies a hard numeric filter — only products with
 * confirmed thickness data meeting the constraint are returned. We do NOT
 * text-match thickness because the model will happily hallucinate otherwise.
 */
export async function searchFeed(slug, query, limit = 6, minThicknessCm) {
  const products = await getCatalog(slug);
  if (!products.length) return { products: [], count: 0, source: 'feed-empty' };

  const terms = String(query || '').toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  if (!terms.length) return { products: [], count: 0, source: 'feed' };

  // Hard numeric thickness filter — never keyword-matched. Products with no
  // thickness data are dropped rather than assumed to satisfy the constraint.
  let pool = products;
  if (minThicknessCm != null && minThicknessCm > 0) {
    pool = products.filter((p) => p.thicknessIn != null && (p.thicknessIn * 2.54) >= minThicknessCm);
  }

  const scored = [];
  for (const p of pool) {
    const hay = haystack(p);
    let score = 0;
    for (const t of terms) if (hay.includes(t)) score++;
    if (score > 0) {
      // prefer in-stock and prefer name matches
      const inStock = /in ?stock/i.test(p.availability) ? 0.5 : 0;
      const nameHit = terms.every((t) => p.name.toLowerCase().includes(t)) ? 0.5 : 0;
      scored.push({ p, score: score + inStock + nameHit });
    }
  }
  scored.sort((a, b) => b.score - a.score);

  const allTerms = scored.filter((s) => Math.floor(s.score) >= terms.length);
  const chosen = (allTerms.length ? allTerms : scored).slice(0, limit).map((s) => s.p);
  return { products: chosen.map(publicProduct), count: chosen.length, source: 'feed' };
}

/**
 * Find the single best-matching product (raw object, not public-shaped) so the
 * estimate tool can read coverage + box weight. Returns null if no good match.
 */
export async function findProduct(slug, query) {
  const products = await getCatalog(slug);
  if (!products.length) return null;
  const terms = String(query || '').toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  if (!terms.length) return null;

  let best = null;
  let bestScore = 0;
  for (const p of products) {
    const hay = haystack(p);
    let score = 0;
    for (const t of terms) if (hay.includes(t)) score++;
    if (terms.every((t) => p.name.toLowerCase().includes(t))) score += 2; // strong name match
    if (score > bestScore) { bestScore = score; best = p; }
  }
  // require at least half the terms to match to avoid garbage matches
  return bestScore >= Math.max(1, Math.ceil(terms.length / 2)) ? best : null;
}

// exported for tests
export const __test = { parseFeed, parseProduct, parsePriceUnit, num };