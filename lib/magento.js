// Tilesbay catalog scraper.
//
// The Magento REST API is disabled on Tilesbay (Mage_Api2 stripped from the
// install), so we read the public catalog search page directly with cheerio.
// No OAuth needed — same data customers already see on the storefront.
//
// File named magento.js for compatibility with existing imports/tool handlers;
// it's a scraper now, but conceptually still our "catalog data source".
//
// IMPORTANT: env vars are read INSIDE functions (not at module load), so dotenv
// has time to populate process.env before we use it.

import * as cheerio from 'cheerio';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  // Sucuri sometimes returns 200 with a JavaScript challenge page instead of
  // actual content. Detect that and surface a clear error.
  const body = await res.text();
  if (body.includes('sucuri-firewall-block') || body.includes('Access Denied - Sucuri')) {
    throw new Error('Blocked by Sucuri WAF — Vercel/server IP not whitelisted');
  }
  if (!res.ok) {
    throw new Error(`Fetch ${url} -> ${res.status}`);
  }
  return body;
}

function parsePrice(text) {
  if (!text) return null;
  const cleaned = text.replace(/,/g, '').replace(/[^\d.]/g, ' ');
  const m = cleaned.match(/(\d+\.?\d*)/);
  return m ? parseFloat(m[1]) : null;
}

function truncate(s, n = 200) {
  if (!s) return '';
  s = s.replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

/**
 * Search the Tilesbay catalog via the public search URL.
 * Returns up to `limit` products, each with name, url, price, image.
 */
export async function searchProducts({ query, limit = 6 }) {
  const BASE = process.env.MAGENTO_BASE_URL;
  if (!BASE) throw new Error('MAGENTO_BASE_URL not set');

  const url = `${BASE}/catalogsearch/result/?q=${encodeURIComponent(query)}`;
  console.log(`[scraper] GET ${url}`);

  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  // Magento 1 ships product listings in one of a few container patterns
  // depending on theme. We try each and use the first one that yields hits.
  const candidates = [
    '.products-grid li.item',
    '.products-list li.item',
    'ul.products-grid > li',
    'ol.products-list > li',
    'li.product-item',
    '.product-item-info',
  ];

  let items = $();
  let matchedSelector = null;
  for (const sel of candidates) {
    items = $(sel);
    if (items.length > 0) {
      matchedSelector = sel;
      break;
    }
  }

  if (items.length === 0) {
    console.log(`[scraper] no items matched any selector. page size: ${html.length} chars`);
    return { products: [], count: 0, query, note: 'no products matched any known selector' };
  }
  console.log(`[scraper] matched ${items.length} items via selector "${matchedSelector}"`);

  const products = [];
  items.slice(0, limit).each((_, el) => {
    const $el = $(el);

    // Name + URL: the product-name link
    const nameLink = $el
      .find('h2.product-name a, .product-name a, h3.product-name a, a.product-item-link')
      .first();
    const name = nameLink.text().trim();
    let productUrl = nameLink.attr('href') || '';
    if (productUrl && !productUrl.startsWith('http')) {
      productUrl = `${BASE}${productUrl.startsWith('/') ? '' : '/'}${productUrl}`;
    }

    // Price: try several common Magento price classes in priority order
    const priceText =
      $el.find('.special-price .price').first().text().trim() ||
      $el.find('.regular-price .price').first().text().trim() ||
      $el.find('.price-box .price').first().text().trim() ||
      $el.find('span.price').first().text().trim() ||
      $el.find('.price').first().text().trim();
    const price = parsePrice(priceText);

    // Image: first <img> in the card, prefer data-src for lazy-loaded
    const $img = $el.find('img').first();
    const image = $img.attr('data-src') || $img.attr('src') || null;

    // Short blurb if available
    const description = truncate(
      $el.find('.short-description, .product-description, .desc').first().text(),
      200
    );

    if (!name) return; // skip rows without a name (probably ads/banners)

    products.push({
      name,
      url: productUrl,
      price,
      price_unit: '/sqft',
      image,
      ...(description ? { description } : {}),
    });
  });

  return { products, count: products.length, query };
}

/**
 * Kept as a stub so the existing tool handler in lib/tools.js doesn't break.
 * Product detail scraping is not in MVP scope — the bot should send
 * customers to the product URL returned by searchProducts.
 */
export async function getProductBySku(sku) {
  return {
    error: 'Product detail lookup is not supported in scraping mode. Direct the customer to the product URL returned by search_products.',
  };
}