// Tool definitions exposed to Claude, plus their handlers.
// Each tool follows the Anthropic tools schema.

import { searchProducts, getProductBySku } from './magento.js';

export const TOOLS = [
  {
    name: 'search_products',
    description:
      'Search the Tilesbay product catalog. Use this whenever the customer asks for tile recommendations or mentions a specific style, color, material, or use case. Returns up to 10 products with name, SKU, price, short description, and URL. Use specific search terms (e.g. "marble subway", "matte porcelain hexagon") rather than broad ones ("tile").',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Search query — material, style, color, shape, or finish. Examples: "white marble subway", "matte black hexagon", "rustic wood-look porcelain".',
        },
        limit: {
          type: 'integer',
          description: 'Max results to return. Default 10, max 20.',
          default: 10,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_product_details',
    description:
      'Currently unsupported. Do not call this tool — instead direct the customer to the product URL returned by search_products if they want full details.',
    input_schema: {
      type: 'object',
      properties: {
        sku: {
          type: 'string',
          description: 'Product SKU (returned by search_products).',
        },
      },
      required: ['sku'],
    },
  },
  {
    name: 'calculate_tile_coverage',
    description:
      'Calculate how much tile a customer needs for a room. Returns total square footage with a waste factor included, and an estimate of how many boxes to order. Use this whenever the customer mentions room dimensions or asks "how much do I need".',
    input_schema: {
      type: 'object',
      properties: {
        room_length_ft: {
          type: 'number',
          description: 'Room length in feet.',
        },
        room_width_ft: {
          type: 'number',
          description: 'Room width in feet.',
        },
        sqft_per_box: {
          type: 'number',
          description:
            'Square feet per box of tile. If not known, default to 10. Most tiles ship in boxes covering 8-15 sqft.',
          default: 10,
        },
        waste_factor: {
          type: 'number',
          description:
            'Waste factor as decimal. Default 0.10 (10%) for straight lay. Use 0.15 (15%) for diagonal or pattern lays like herringbone.',
          default: 0.1,
        },
      },
      required: ['room_length_ft', 'room_width_ft'],
    },
  },
];

// Handler dispatch
export async function executeTool(name, input) {
  switch (name) {
    case 'search_products':
      return searchProducts({ query: input.query, limit: input.limit || 10 });

    case 'get_product_details':
      return getProductBySku(input.sku);

    case 'calculate_tile_coverage': {
      const { room_length_ft, room_width_ft } = input;
      const sqftPerBox = input.sqft_per_box || 10;
      const wasteFactor = input.waste_factor ?? 0.1;

      const baseSqft = room_length_ft * room_width_ft;
      const totalSqftNeeded = baseSqft * (1 + wasteFactor);
      const boxesNeeded = Math.ceil(totalSqftNeeded / sqftPerBox);

      return {
        room_area_sqft: +baseSqft.toFixed(2),
        waste_factor_percent: wasteFactor * 100,
        total_sqft_to_order: +totalSqftNeeded.toFixed(2),
        sqft_per_box: sqftPerBox,
        boxes_to_order: boxesNeeded,
        note: `${baseSqft.toFixed(0)} sqft room + ${(wasteFactor * 100).toFixed(0)}% waste = ${totalSqftNeeded.toFixed(0)} sqft to order = ${boxesNeeded} boxes (assuming ${sqftPerBox} sqft per box).`,
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
