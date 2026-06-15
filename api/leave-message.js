// POST /api/leave-message
// Body: { name, email, phone, message, transcript, url }
//
// Creates a ticket in Zammad via its REST API when no agent is online,
// so the offline customer's message + bot transcript reach the team.
//
// Requires these env vars in .env.local:
//   ZAMMAD_API_URL    e.g. http://localhost:8080/api/v1   (internal, bypasses nginx allowlist)
//   ZAMMAD_API_TOKEN  a Zammad token with ticket.agent permission
//   ZAMMAD_GROUP      destination group, e.g. "Tilesbay"

import { config } from 'dotenv';
config({ path: '.env.local' });

const ZAMMAD_API_URL = process.env.ZAMMAD_API_URL || 'http://localhost:8080/api/v1';
const ZAMMAD_API_TOKEN = process.env.ZAMMAD_API_TOKEN || '';
const ZAMMAD_GROUP = process.env.ZAMMAD_GROUP || 'Tilesbay';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Token token=${ZAMMAD_API_TOKEN}`,
  };
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { name, email, phone, message, transcript, url } = req.body || {};
    if (!email || !message) {
      return res.status(400).json({ error: 'email and message are required' });
    }

    const customerName = (name && name.trim()) || email.split('@')[0];

    // Build the ticket body: customer message + phone + page + bot transcript
    const bodyLines = [
      message,
      '',
      phone ? `Phone: ${phone}` : null,
      url ? `Page: ${url}` : null,
      '',
      '--- Chatbot conversation ---',
      transcript || '(none)',
    ].filter((l) => l !== null);

    const ticketPayload = {
      title: `Live chat (offline) — ${customerName}`,
      group: ZAMMAD_GROUP,
      customer: email, // Zammad finds-or-creates the customer by email
      article: {
        subject: 'Offline chat message',
        body: bodyLines.join('\n'),
        type: 'web',
        internal: false,
        sender: 'Customer',
      },
    };

    const r = await fetch(`${ZAMMAD_API_URL}/tickets`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(ticketPayload),
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error('Zammad ticket create failed:', r.status, errText);
      return res.status(502).json({ ok: false, error: 'Could not create ticket' });
    }

    // Best-effort: update the customer's phone number if provided
    if (phone) {
      try {
        const search = await fetch(
          `${ZAMMAD_API_URL}/users/search?query=${encodeURIComponent(email)}&limit=1`,
          { headers: authHeaders() }
        );
        const users = await search.json();
        if (Array.isArray(users) && users.length > 0) {
          await fetch(`${ZAMMAD_API_URL}/users/${users[0].id}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ phone }),
          });
        }
      } catch (e) {
        // non-fatal
        console.warn('phone update skipped:', e.message);
      }
    }

    const ticket = await r.json();
    return res.status(200).json({ ok: true, ticket_number: ticket.number });
  } catch (err) {
    console.error('leave-message error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}