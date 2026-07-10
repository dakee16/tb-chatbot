// lib/shipping.js — flat nationwide weight-tiered shipping.
//
// Reads data/tablerates.csv (the same file used in Magento's table-rate config)
// and looks up a price for a given total order weight. The CSV is "weight and
// above" tiered: the price for a weight is the highest tier whose threshold is
// <= that weight.
//
// If the CSV file isn't found on disk, we fall back to an embedded copy of the
// current rates so the bot still works. To update rates, drop a new
// tablerates.csv into ./data/ (or set SHIPPING_CSV) and restart.

import fs from 'fs';
import path from 'path';

// ---- Guardrail constants (see estimate.js) ----
// Above this weight, orders enter freight/negotiated territory (the table jumps
// 200 -> 1000 lb). The bot must hand these to a human instead of quoting.
export const FREIGHT_THRESHOLD_LB = 200;

// Magento's "weight not set" default shows up as this value in the feed. Treat
// it as unknown weight, not a real 1999 lb box.
export const WEIGHT_SENTINEL = 1999;

// Embedded fallback (mirrors tablerates.csv). [weightThreshold, price]
const EMBEDDED = [
  [0, 10], [9, 20], [17, 30], [25, 40], [33, 50], [50, 80], [75, 125],
  [100, 150], [149, 275], [200, 310], [1000, 450], [2000, 600], [3000, 700],
  [5000, 825], [6000, 950], [7000, 1050], [8000, 1200], [9000, 1300],
  [10000, 1500], [11000, 1575], [12000, 1650], [13000, 1785], [14000, 1925],
  [15000, 2050], [16000, 2160], [17000, 2300], [18000, 2425], [19000, 2550],
  [20000, 2675],
];

let _tiers = null;

function num(s) {
  if (s == null) return NaN;
  return parseFloat(String(s).replace(/,/g, '').trim());
}

function parseCsv(raw) {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const tiers = [];
  // Expected header: Country,Region/State,Zip,Weight (and above),Shipping Price
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 5) continue;
    const weight = num(cols[cols.length - 2]);
    const price = num(cols[cols.length - 1]);
    if (!isNaN(weight) && !isNaN(price)) tiers.push({ weight, price });
  }
  tiers.sort((a, b) => a.weight - b.weight);
  return tiers;
}

function loadTiers() {
  if (_tiers) return _tiers;
  const csvPath = process.env.SHIPPING_CSV || path.join(process.cwd(), 'data', 'tablerates.csv');
  try {
    const raw = fs.readFileSync(csvPath, 'utf-8');
    const parsed = parseCsv(raw);
    if (parsed.length) {
      _tiers = parsed;
      console.log(`[shipping] loaded ${_tiers.length} tiers from ${csvPath}`);
      return _tiers;
    }
    throw new Error('empty/unparseable CSV');
  } catch (e) {
    _tiers = EMBEDDED.map(([weight, price]) => ({ weight, price }));
    console.log(`[shipping] using ${_tiers.length} embedded tiers (${e.message})`);
    return _tiers;
  }
}

/**
 * Look up the shipping price for a total order weight in pounds.
 * Returns a number, or null if weight is invalid.
 */
export function quoteShipping(weightLb) {
  if (weightLb == null || isNaN(weightLb) || weightLb < 0) return null;
  const tiers = loadTiers();
  let price = tiers[0] ? tiers[0].price : null;
  for (const t of tiers) {
    if (weightLb >= t.weight) price = t.price;
    else break;
  }
  return price;
}

// Largest weight the table covers — beyond this we can't quote.
export function maxTierWeight() {
  const tiers = loadTiers();
  return tiers.length ? tiers[tiers.length - 1].weight : 0;
}