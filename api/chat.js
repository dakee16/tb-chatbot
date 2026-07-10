// POST /api/chat
// Body: { messages: [{role, content}, ...], brand?: "tilesbay" }
// Returns: { reply: string, messages: [...updated history...] }
//
// Runs the Claude tool-use loop: model -> tool_use -> execute -> tool_result -> model
// until the model returns a final text response. The `brand` slug scopes the
// system prompt, product feed, pricing, and contact info to the right store.

import { config } from 'dotenv';
config({ path: '.env.local' });

import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from '../lib/system-prompt.js';
import { TOOLS, executeTool } from '../lib/tools.js';
import { getBrand, brandOrigins } from '../brands.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_ITERATIONS = 6;
const MODEL = process.env.CHAT_MODEL || 'claude-haiku-4-5-20251001';

async function callWithRetry(fn, maxAttempts = 4) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const retriable = err?.status === 529 || err?.status === 429 || err?.status >= 500;
      if (!retriable || attempt === maxAttempts) throw err;
      const delay = Math.min(1000 * 2 ** (attempt - 1), 4000);
      console.log(`Anthropic ${err.status}, retry ${attempt}/${maxAttempts - 1} in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

// Reflect the request origin if it's one of our 9 storefronts; else allow *.
const ALLOWED = brandOrigins();
function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { messages = [], brand: brandSlug } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const brand = getBrand(brandSlug);
    const systemPrompt = buildSystemPrompt(brand);
    const ctx = { brand: brand.slug };

    const conversation = [...messages];
    let iteration = 0;

    while (iteration < MAX_ITERATIONS) {
      iteration++;

      const response = await callWithRetry(() =>
        client.messages.create({
          model: MODEL,
          max_tokens: 1024,
          system: systemPrompt,
          tools: TOOLS,
          messages: conversation,
        })
      );

      conversation.push({ role: 'assistant', content: response.content });

      if (response.stop_reason === 'end_turn' || response.stop_reason === 'stop_sequence') {
        const text = response.content
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('\n');
        return res.status(200).json({ reply: text, messages: conversation });
      }

      if (response.stop_reason === 'tool_use') {
        const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use');
        const toolResults = [];

        for (const block of toolUseBlocks) {
          console.log(`[tool] (${brand.slug}) ${block.name}(${JSON.stringify(block.input)})`);
          try {
            const result = await executeTool(block.name, block.input, ctx);
            console.log(`[tool] ${block.name} result:`, JSON.stringify(result).slice(0, 400));
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result),
            });
          } catch (err) {
            console.log(`[tool] ${block.name} ERROR:`, err.message);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: `Error: ${err.message}`,
              is_error: true,
            });
          }
        }

        conversation.push({ role: 'user', content: toolResults });
        continue;
      }

      return res.status(500).json({
        error: `Unexpected stop_reason: ${response.stop_reason}`,
        messages: conversation,
      });
    }

    return res.status(500).json({ error: 'Tool-use loop exceeded max iterations', messages: conversation });
  } catch (err) {
    console.error('chat error:', err);
    return res.status(500).json({ error: err.message });
  }
}