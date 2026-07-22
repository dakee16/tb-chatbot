// lib/geoip.js — shared geo-IP lookup used by both /api/chat and /api/chat-ticket.
//
// Uses ip-api.com free tier (no key, ~45 req/min per source IP). Results are
// cached in memory per IP for GEO_TTL_MS so the same visitor's IP doesn't hit
// the external API on every single message exchange — chat.js and chat-ticket.js
// both call this, so caching also deduplicates across those two endpoints.
//
// Failure mode is soft: any error returns null and the caller proceeds without
// location context. Never throws.

const GEO_TTL_MS = 1000 * 60 * 30; // 30 min per IP
const _cache = new Map(); // ip -> { data, ts }

// Extract the real client IP from a Node request, accounting for nginx.
export function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return xff.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.connection?.remoteAddress || null;
}

/**
 * Look up city / region / country / lat / lng from an IP.
 * Returns null for private/loopback IPs or on any failure.
 * Shape: { city, region, country, lat, lng, label }
 *   label = "City, Region, Country" formatted string (for ticket display)
 */
export async function geoLookup(ip) {
  if (!ip) return null;
  // Skip loopback + obviously private ranges (they resolve to nothing useful).
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.') ||
      ip.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[01])\./.test(ip)) {
    return null;
  }

  const now = Date.now();
  const cached = _cache.get(ip);
  if (cached && now - cached.ts < GEO_TTL_MS) return cached.data;

  try {
    const url = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,city,regionName,country,lat,lon`;
    const r = await fetch(url);
    const data = await r.json();
    if (data.status !== 'success') {
      _cache.set(ip, { data: null, ts: now });
      return null;
    }
    const result = {
      city: data.city || null,
      region: data.regionName || null,
      country: data.country || null,
      lat: typeof data.lat === 'number' ? data.lat : null,
      lng: typeof data.lon === 'number' ? data.lon : null,
      label: [data.city, data.regionName, data.country].filter(Boolean).join(', '),
    };
    _cache.set(ip, { data: result, ts: now });
    return result;
  } catch (e) {
    _cache.set(ip, { data: null, ts: now });
    return null;
  }
}
