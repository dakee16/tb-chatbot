// Tilesbay catalog — Magento 1 REST API client (OAuth 1.0a).
//
// Uses the real backend API at /api/rest/products with OAuth-signed requests.
// This replaced the old cheerio-based frontend scraper once the Mage_Api2
// module was enabled on the Magento install.
//
// IMPORTANT: env vars are read INSIDE functions (not at module load), so dotenv
// has time to populate process.env before we use it.

import crypto from 'crypto';
import OAuth from 'oauth-1.0a';

// ---------- OAuth setup (lazy-init, reads env at call time) ----------

let _oauth = null;
let _token = null;

function getOAuth() {
  if (_oauth) return { oauth: _oauth, token: _token };

  const consumerKey = process.env.MAGENTO_CONSUMER_KEY;
  const consumerSecret = process.env.MAGENTO_CONSUMER_SECRET;
  const accessToken = process.env.MAGENTO_ACCESS_TOKEN;
  const accessSecret = process.env.MAGENTO_ACCESS_TOKEN_SECRET;

  if (!consumerKey || !consumerSecret || !accessToken || !accessSecret) {
    throw new Error(
      'Missing Magento OAuth credentials. Need: MAGENTO_CONSUMER_KEY, MAGENTO_CONSUMER_SECRET, MAGENTO_ACCESS_TOKEN, MAGENTO_ACCESS_TOKEN_SECRET'
    );
  }

  _oauth = new OAuth({
    consumer: { key: consumerKey, secret: consumerSecret },
    signature_method: 'HMAC-SHA1',
    hash_function(base_string, key) {
      return crypto.createHmac('sha1', key).update(base_string).digest('base64');
    },
  });

  _token = { key: accessToken, secret: accessSecret };

  return { oauth: _oauth, token: _token };
}

// ---------- Signed fetch ----------
// Key fix: pass query params via the `data` field to the OAuth library
// so it encodes them correctly for signature generation. Build the actual
// request URL separately with raw brackets (Magento expects unencoded
// brackets in the URL but encoded in the OAuth base string).

async function apiFetch(baseUrl, params = {}) {
  const { oauth, token } = getOAuth();

  // OAuth library receives the base URL (no query string) + params in `data`.
  // It will percent-encode them per RFC 5849 for the signature base string.
  const requestData = { url: baseUrl, method: 'GET', data: params };
  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  // Build the actual fetch URL with raw brackets (not percent-encoded).
  // Magento 1's routing expects filter[1][attribute]=... not filter%5B1%5D...
  let fetchUrl = baseUrl;
  const paramEntries = Object.entries(params);
  if (paramEntries.length > 0) {
    const qs = paramEntries
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    fetchUrl = `${baseUrl}?${qs}`;
  }

  console.log(`[magento-api] GET ${fetchUrl}`);

  const res = await fetch(fetchUrl, {
    method: 'GET',
    headers: {
      ...authHeader,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Magento API ${res.status}: ${body.slice(0, 500)}`);
  }

  return res.json();
}

// ---------- Product search ----------

/**
 * Search the Tilesbay catalog via the Magento 1 REST API.
 * Uses filter[n][attribute]=name&filter[n][like]=%term% for each search term.
 *
 * Magento 1 REST filters are ANDed together, so "white marble subway" searches
 * for products whose name contains ALL three words (in any order).
 *
 * Falls back to progressively fewer terms if no results are found.
 */
export async function searchProducts({ query, limit = 6 }) {
  const BASE = process.env.MAGENTO_BASE_URL;
  if (!BASE) throw new Error('MAGENTO_BASE_URL not set');

  // Split query into individual search terms
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1); // drop single-char noise

  if (terms.length === 0) {
    return { products: [], count: 0, query, note: 'empty query' };
  }

  // Try with all terms first, then drop one from the end until we get results
  for (let numTerms = terms.length; numTerms >= 1; numTerms--) {
    const subset = terms.slice(0, numTerms);
    const products = await _searchWithTerms(BASE, subset, limit);
    if (products.length > 0) {
      const usedQuery = subset.join(' ');
      if (numTerms < terms.length) {
        console.log(`[magento-api] broadened search from "${query}" to "${usedQuery}" (${products.length} results)`);
      }
      return { products, count: products.length, query: usedQuery };
    }
  }

  // Nothing at all — return empty
  console.log(`[magento-api] no results for any subset of "${query}"`);
  return { products: [], count: 0, query, note: 'no matching products found' };
}

async function _searchWithTerms(base, terms, limit) {
  // Build Magento 1 REST filter params as a flat object:
  //   'filter[1][attribute]' => 'name'
  //   'filter[1][like]'      => '%white%'
  //   'filter[2][attribute]' => 'name'
  //   'filter[2][like]'      => '%marble%'
  const params = {};
  terms.forEach((term, i) => {
    const n = i + 1;
    params[`filter[${n}][attribute]`] = 'name';
    params[`filter[${n}][like]`] = `%${term}%`;
  });
  params['limit'] = String(limit);
  params['order'] = 'name';
  params['dir'] = 'asc';

  const apiUrl = `${base}/api/rest/products`;

  let data;
  try {
    data = await apiFetch(apiUrl, params);
  } catch (err) {
    console.error(`[magento-api] search error: ${err.message}`);
    throw err;
  }

  // Magento 1 REST returns an object keyed by entity_id, not an array.
  // Example: { "123": { entity_id: "123", name: "...", ... }, "456": { ... } }
  // If empty, it might return an empty object, empty array, or sometimes a
  // "Messages" wrapper. Handle all cases.
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data)) {
    return data.slice(0, limit).map((p) => _normalizeProduct(base, p));
  }

  // If there's a "messages" key, it's an error/empty response
  if (data.messages) {
    console.log(`[magento-api] API message:`, JSON.stringify(data.messages));
    return [];
  }

  const entries = Object.values(data);
  return entries.slice(0, limit).map((p) => _normalizeProduct(base, p));
}

function _normalizeProduct(base, p) {
  // Build the frontend URL from url_key
  let productUrl = '';
  if (p.url_key) {
    productUrl = `${base}/${p.url_key}.html`;
  } else if (p.url_path) {
    productUrl = `${base}/${p.url_path}`;
  }

  // Build image URL — Magento stores relative paths like /w/h/white-tile.jpg
  let image = null;
  if (p.image && p.image !== 'no_selection') {
    image = p.image.startsWith('http')
      ? p.image
      : `${base}/media/catalog/product${p.image}`;
  }

  // Price: prefer special_price (sale price) over regular price
  const price = parseFloat(p.special_price || p.price) || null;

  return {
    name: p.name || '',
    sku: p.sku || '',
    url: productUrl,
    price,
    price_unit: '/sqft',
    image,
    ...(p.short_description ? { description: truncate(p.short_description, 200) } : {}),
  };
}

function truncate(s, n = 200) {
  if (!s) return '';
  // Strip HTML tags that Magento sometimes includes in descriptions
  s = s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// ---------- Product detail (stub — not in MVP scope) ----------

export async function getProductBySku(sku) {
  return {
    error:
      'Product detail lookup is not yet implemented. Direct the customer to the product URL returned by search_products.',
  };
}