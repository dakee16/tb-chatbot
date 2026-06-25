// GET /api/agent-alias?name=Shashank%20Awasthi
//
// Looks up a Zammad agent by name and returns their alias_name custom field.
// Used by the chat widget to display the agent's alias instead of their real
// name when a live chat starts.

import { config } from 'dotenv';
config({ path: '.env.local' });

const ZAMMAD_API_URL = process.env.ZAMMAD_API_URL || 'http://localhost:8080/api/v1';
const ZAMMAD_API_TOKEN = process.env.ZAMMAD_API_TOKEN || '';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const name = req.query?.name || '';
  if (!name) return res.status(400).json({ alias: null });

  try {
    const r = await fetch(
      `${ZAMMAD_API_URL}/users/search?query=${encodeURIComponent(name)}&limit=5`,
      { headers: { Authorization: `Token token=${ZAMMAD_API_TOKEN}` } }
    );
    const users = await r.json();
    if (!Array.isArray(users) || users.length === 0) {
      return res.status(200).json({ alias: null });
    }

    // Find the best match by full name
    const match = users.find((u) => {
      const full = [u.firstname, u.lastname].filter(Boolean).join(' ').trim();
      return full.toLowerCase() === name.toLowerCase();
    }) || users[0];

    const alias = match.alias_name || null;
    return res.status(200).json({ alias });
  } catch (e) {
    console.error('agent-alias error:', e.message);
    return res.status(200).json({ alias: null });
  }
}