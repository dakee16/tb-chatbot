// Tilesbay catalog — calls chatbot-api.php on the Magento origin server.
//
// This is a simple API-key-secured PHP endpoint that bootstraps Magento
// internally and searches products using Magento's own models.
// No OAuth signatures — just an X-Api-Key header.
//
// Env vars needed:
//   MAGENTO_BASE_URL   – e.g. https://www.tilesbay.com
//   MAGENTO_API_KEY    – shared secret matching chatbot-api.php on the server
//
// NOTE: NODE_TLS_REJECT_UNAUTHORIZED is set to '0' because the VPS hits the
// origin IP directly (via /etc/hosts) and the TLS cert is for the domain, not
// the IP. This is safe because we control both endpoints.

// ---------- API fetch ----------

async function apiFetch(query, limit) {
  const BASE = process.env.MAGENTO_BASE_URL;
  const API_KEY = process.env.MAGENTO_API_KEY;

  if (!BASE) throw new Error('MAGENTO_BASE_URL not set');
  if (!API_KEY) throw new Error('MAGENTO_API_KEY not set');

  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const url = `${BASE}/chatbot-api.php?${params.toString()}`;

  console.log(`[magento-api] GET ${url}`);

  // Allow self-signed / mismatched cert when hitting origin IP directly
  const prevTLS = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Api-Key': API_KEY,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(function () { return ''; });
      throw new Error('Magento API ' + res.status + ': ' + body.slice(0, 300));
    }

    return await res.json();
  } finally {
    // Restore original TLS setting
    if (prevTLS === undefined) {
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    } else {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = prevTLS;
    }
  }
}

// ---------- Product search ----------

/**
 * Search the Tilesbay catalog via chatbot-api.php.
 * The PHP endpoint handles the Magento collection query internally.
 */
export async function searchProducts({ query, limit = 6 }) {
  if (!query || !query.trim()) {
    return { products: [], count: 0, query: query, note: 'empty query' };
  }

  try {
    var data = await apiFetch(query.trim(), limit);
  } catch (err) {
    console.error('[magento-api] search error: ' + err.message);
    throw err;
  }

  // Normalize products to match what the rest of the bot expects
  var products = (data.products || []).map(function (p) {
    return {
      name: p.name || '',
      sku: p.sku || '',
      url: p.url || '',
      price: p.price || null,
      price_unit: '/sqft',
      image: p.image || null,
      description: p.description || '',
    };
  });

  console.log('[magento-api] "' + query + '" → ' + products.length + ' results');

  return {
    products: products,
    count: products.length,
    query: data.query || query,
  };
}

// ---------- Product detail (stub) ----------

export async function getProductBySku(sku) {
  return {
    error: 'Product detail lookup is not yet implemented. Direct the customer to the product URL returned by search_products.',
  };
}