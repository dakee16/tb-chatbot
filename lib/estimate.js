// lib/estimate.js — turn a product + quantity into a cost + shipping estimate,
// applying the guardrails the owner asked for.
//
// Model (matches the owner's rule "1 sqft = $X, so N sqft = $X*N; weight scales"):
//   cost   = unitPrice * amount            (amount in the product's base unit)
//   weight = boxWeight * (amount / unitQty)  (boxWeight is per price_unit qty)
//
// The bot may quote ONLY simple, single-product, domestic orders under the
// freight threshold. Everything else returns needsHuman:true with a reason, and
// the system prompt turns that into "let me connect you / email us".

import { findProduct } from './catalog.js';
import { quoteShipping, FREIGHT_THRESHOLD_LB } from './shipping.js';

const DISCLAIMER =
  'Estimate only — confirm with our team. They may be able to offer a better shipping rate or a bulk discount.';

export async function estimateOrder(slug, { productQuery, squareFeet, pieces }) {
  const p = await findProduct(slug, productQuery);
  if (!p) {
    return { found: false, reason: 'product_not_found',
      message: 'No matching product found. Ask the customer to confirm the product name, or offer to connect them with a person.' };
  }

  // Which base unit does this product use?
  let amount = null;
  let unit = null;
  if (p.unitType === 'sqft') { amount = num(squareFeet); unit = 'sqft'; }
  else if (p.unitType === 'ct') { amount = num(pieces); unit = 'piece'; }
  else {
    return { found: true, needsHuman: true, product: p.name, url: p.url, reason: 'unknown_unit',
      message: 'This product is not sold by a unit the bot can quote. Defer to a human.' };
  }

  if (amount == null || amount <= 0) {
    return { found: true, needClarify: true, product: p.name, unit, reason: 'need_amount',
      message: unit === 'sqft'
        ? 'Ask the customer how many square feet they need.'
        : 'Ask the customer how many pieces they need.' };
  }

  const productCost = round2(p.unitPrice * amount);

  // Weight + whole-box count (only if we have both weight and coverage)
  let totalWeight = null;
  let boxes = null;
  if (p.boxWeight != null && p.unitQty) {
    totalWeight = round2(p.boxWeight * (amount / p.unitQty));
    boxes = Math.ceil(amount / p.unitQty);
  }

  // --- guardrails ---
  if (totalWeight == null) {
    return { found: true, needsHuman: true, product: p.name, url: p.url, productCost,
      reason: 'weight_unknown',
      message: 'Shipping weight is not available for this product. Give the product price if useful, but defer the shipping quote to a human.' };
  }
  if (totalWeight > FREIGHT_THRESHOLD_LB) {
    return { found: true, needsHuman: true, product: p.name, url: p.url, productCost,
      totalWeight, boxes, reason: 'freight',
      message: 'This order ships as a freight/pallet shipment, which needs special handling equipment to unload — do NOT quote a shipping price. Tell the customer plainly why (freight/pallet shipment, needs special equipment, so an exact cost can\'t be calculated here) and offer to connect them with a person for an accurate freight quote.' };
  }

  const shipping = quoteShipping(totalWeight);
  if (shipping == null) {
    return { found: true, needsHuman: true, product: p.name, url: p.url, productCost, totalWeight,
      reason: 'no_rate', message: 'No shipping rate available for this weight. Defer to a human.' };
  }

  return {
    found: true,
    needsHuman: false,
    product: p.name,
    url: p.url,
    unit,
    amount,
    unitPrice: p.unitPrice,
    coveragePerBox: p.unitQty,
    boxes,
    productCost,
    totalWeightLb: totalWeight,
    shipping,
    estimatedTotal: round2(productCost + shipping),
    disclaimer: DISCLAIMER,
  };
}

function num(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(String(v).replace(/,/g, '').trim());
  return isNaN(n) ? null : n;
}
function round2(n) { return Math.round(n * 100) / 100; }