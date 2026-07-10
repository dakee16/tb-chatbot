// lib/tools.js — tool definitions exposed to Claude, plus their handlers.
//
// Product data priority chain:
//   1. searchFeed()  — the brand's XML feed (fast, has coverage + box weight)
//   2. magentoSearch() — live chatbot-api.php (tilesbay only, as a safety net)
//   3. empty result   — the model then offers a human / contact
//
// executeTool now takes a ctx = { brand } so every call is scoped to the right
// storefront (feed, pricing, contact all come from that brand).

import { searchFeed } from './catalog.js';
import { searchProducts as magentoSearch } from './magento.js';
import { estimateOrder } from './estimate.js';

export const TOOLS = [
  {
    name: 'search_products',
    description:
      'Search this store\'s product catalog. Use whenever the customer asks for recommendations or mentions a style, color, material, size, or use case. Returns products with name, price, unit, and URL. Use specific terms ("white marble subway", "matte black hexagon"), not broad ones ("tile").',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Material, style, color, shape, or finish to search for.' },
        limit: { type: 'integer', description: 'Max results. Default 6, max 12.', default: 6 },
      },
      required: ['query'],
    },
  },
  {
    name: 'calculate_tile_coverage',
    description:
      'Calculate how much tile a customer needs for a room: total square footage with a waste factor, plus how many boxes. Use whenever the customer gives room dimensions or asks "how much do I need". If you know the product\'s coverage per box from search_products, pass it as sqft_per_box.',
    input_schema: {
      type: 'object',
      properties: {
        room_length_ft: { type: 'number', description: 'Room length in feet.' },
        room_width_ft: { type: 'number', description: 'Room width in feet.' },
        sqft_per_box: { type: 'number', description: 'Square feet per box. Default 10 if unknown.', default: 10 },
        waste_factor: { type: 'number', description: 'Waste as a decimal. Default 0.10; use 0.15 for diagonal/herringbone.', default: 0.1 },
      },
      required: ['room_length_ft', 'room_width_ft'],
    },
  },
  {
    name: 'estimate_order_cost',
    description:
      'Estimate product cost PLUS shipping for a SINGLE product and a given quantity. Use when the customer asks "how much will it cost", "what\'s shipping", or "total for X sqft". Provide the product name and the amount (square_feet for tile/flooring sold by area, or pieces for items sold each). The tool applies shipping rules and will tell you when an order is too large/complex to quote — in that case, do NOT invent a number; offer to connect them with a person. Always present the result as an estimate and mention a human can check for discounts.',
    input_schema: {
      type: 'object',
      properties: {
        product: { type: 'string', description: 'Product name (as returned by search_products).' },
        square_feet: { type: 'number', description: 'Square feet the customer wants (for area-based products).' },
        pieces: { type: 'number', description: 'Number of pieces (for items sold each / by count).' },
      },
      required: ['product'],
    },
  },
];

// Handler dispatch. ctx = { brand }
export async function executeTool(name, input, ctx = {}) {
  const brand = ctx.brand || 'tilesbay';

  switch (name) {
    case 'search_products': {
      const limit = Math.min(input.limit || 6, 12);
      // 1) feed
      const fromFeed = await searchFeed(brand, input.query, limit);
      if (fromFeed.count > 0) return fromFeed;

      // 2) live fallback — only tilesbay has chatbot-api.php wired to its env
      if (brand === 'tilesbay') {
        try {
          const live = await magentoSearch({ query: input.query, limit });
          if (live && live.count > 0) return { ...live, source: 'live' };
        } catch (e) {
          console.log('[tools] live fallback failed:', e.message);
        }
      }

      // 3) nothing
      return {
        products: [],
        count: 0,
        source: fromFeed.source,
        note: 'No matching products found. Ask the customer to rephrase, or offer to connect them with a person / share the contact page.',
      };
    }

    case 'calculate_tile_coverage': {
      const { room_length_ft, room_width_ft } = input;
      const sqftPerBox = input.sqft_per_box || 10;
      const wasteFactor = input.waste_factor == null ? 0.1 : input.waste_factor;
      const baseSqft = room_length_ft * room_width_ft;
      const totalSqftNeeded = baseSqft * (1 + wasteFactor);
      const boxesNeeded = Math.ceil(totalSqftNeeded / sqftPerBox);
      return {
        room_area_sqft: +baseSqft.toFixed(2),
        waste_factor_percent: wasteFactor * 100,
        total_sqft_to_order: +totalSqftNeeded.toFixed(2),
        sqft_per_box: sqftPerBox,
        boxes_to_order: boxesNeeded,
        note: `${baseSqft.toFixed(0)} sqft + ${(wasteFactor * 100).toFixed(0)}% waste = ${totalSqftNeeded.toFixed(0)} sqft = ${boxesNeeded} boxes (at ${sqftPerBox} sqft/box).`,
      };
    }

    case 'estimate_order_cost':
      return estimateOrder(brand, {
        productQuery: input.product,
        squareFeet: input.square_feet,
        pieces: input.pieces,
      });

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}