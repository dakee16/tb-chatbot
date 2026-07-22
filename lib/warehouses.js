// lib/warehouses.js — warehouse list + nearest-warehouse lookup.
//
// Data lives in data/warehouses.json (shared across all brands). Loaded once
// per process and cached in memory. To update: edit the JSON file on disk and
// pm2 restart tilesbay-chatbot.

import fs from 'fs';
import path from 'path';

const WAREHOUSE_FILE = process.env.WAREHOUSES_FILE ||
  path.join(process.cwd(), 'data', 'warehouses.json');

let _cache = null;

function loadWarehouses() {
  if (_cache) return _cache;
  try {
    const raw = fs.readFileSync(WAREHOUSE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    _cache = Array.isArray(parsed.warehouses) ? parsed.warehouses : [];
    console.log('[warehouses] loaded ' + _cache.length + ' from ' + WAREHOUSE_FILE);
  } catch (e) {
    console.error('[warehouses] load failed: ' + e.message);
    _cache = [];
  }
  return _cache;
}

// Haversine distance in miles between two lat/lng points.
function distanceMiles(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Return the full warehouse list (for the system prompt). */
export function getAllWarehouses() {
  return loadWarehouses();
}

/**
 * Find the warehouse nearest to the given lat/lng.
 * Returns { warehouse, distanceMiles } or null if we have no coords or no list.
 */
export function findNearest(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  const list = loadWarehouses();
  if (!list.length) return null;

  let best = null;
  let bestDist = Infinity;
  for (const w of list) {
    if (typeof w.lat !== 'number' || typeof w.lng !== 'number') continue;
    const d = distanceMiles(lat, lng, w.lat, w.lng);
    if (d < bestDist) { bestDist = d; best = w; }
  }
  return best ? { warehouse: best, distanceMiles: Math.round(bestDist) } : null;
}
