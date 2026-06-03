// POST /api/chat
// Body: { messages: [{role, content}, ...] }
// Returns: { reply: string, messages: [...updated history...] }
//
// Runs the Claude tool-use loop: model -> tool_use -> execute -> tool_result -> model
// until the model returns a final text response.

import { config } from 'dotenv';
config({ path: '.env.local' });


import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from '../lib/system-prompt.js';
import { TOOLS, executeTool } from '../lib/tools.js';

console.log('DEBUG env check:', {
  ANTHROPIC: process.env.ANTHROPIC_API_KEY ? `SET (${process.env.ANTHROPIC_API_KEY.length} chars)` : 'MISSING',
  MAGENTO_BASE: process.env.MAGENTO_BASE_URL || 'MISSING',
  MAGENTO_KEY: process.env.MAGENTO_CONSUMER_KEY ? 'SET' : 'MISSING',
});


const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Cap tool-use iterations defensively to avoid runaway loops
const MAX_ITERATIONS = 6;

// Use Sonnet 4.6 for the recommender — better at nuanced tile matching than Haiku.
// Switch to claude-sonnet-4-6.
const MODEL = 'claude-haiku-4-5-20251001';

// Retry Anthropic 529 (overloaded) and 5xx errors with exponential backoff.
// Anthropic explicitly sets x-should-retry: true on transient capacity errors.
async function callWithRetry(fn, maxAttempts = 4) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const retriable = err?.status === 529 || err?.status === 429 || err?.status >= 500;
      if (!retriable || attempt === maxAttempts) throw err;
      const delay = Math.min(1000 * 2 ** (attempt - 1), 4000); // 1s, 2s, 4s, 4s
      console.log(`Anthropic ${err.status}, retry ${attempt}/${maxAttempts - 1} in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { messages = [] } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array required' });
    }

    // Working copy of conversation; we'll append assistant + tool_result blocks
    const conversation = [...messages];

    let iteration = 0;
    while (iteration < MAX_ITERATIONS) {
      iteration++;

      const response = await callWithRetry(() =>
        client.messages.create({
          model: MODEL,
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages: conversation,
        })
      );

      // Append assistant message (may contain text + tool_use blocks)
      conversation.push({ role: 'assistant', content: response.content });

      if (response.stop_reason === 'end_turn' || response.stop_reason === 'stop_sequence') {
        // Final answer — extract text
        const text = response.content
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('\n');
        return res.status(200).json({ reply: text, messages: conversation });
      }

      if (response.stop_reason === 'tool_use') {
        // Execute every tool_use block, collect tool_results
        const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use');
        const toolResults = [];

        for (const block of toolUseBlocks) {
          console.log(`[tool] ${block.name}(${JSON.stringify(block.input)})`);
          try {
            const result = await executeTool(block.name, block.input);
            console.log(`[tool] ${block.name} result:`, JSON.stringify(result).slice(0, 500));
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
        continue; // loop back for next model turn
      }

      // Unexpected stop reason — bail
      return res.status(500).json({
        error: `Unexpected stop_reason: ${response.stop_reason}`,
        messages: conversation,
      });
    }

    return res.status(500).json({
      error: 'Tool-use loop exceeded max iterations',
      messages: conversation,
    });
  } catch (err) {
    console.error('chat error:', err);
    return res.status(500).json({ error: err.message });
  }
}
