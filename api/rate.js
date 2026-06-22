// POST /api/rate
// Body: { session_id, rating }   rating = 'up' | 'down'
//
// Finds the Zammad chat ticket for the given chat session and adds an internal
// note recording the customer's thumbs up/down rating.
//
// Env (reuses the same Zammad creds as leave-message):
//   ZAMMAD_API_URL    e.g. http://localhost:8080/api/v1
//   ZAMMAD_API_TOKEN  token with ticket.agent permission

import { config } from 'dotenv';
config({ path: '.env.local' });
import { getTicketForClient } from './chat-ticket.js';

const ZAMMAD_API_URL = process.env.ZAMMAD_API_URL || 'http://localhost:8080/api/v1';
const ZAMMAD_API_TOKEN = process.env.ZAMMAD_API_TOKEN || '';

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

// Resolve the ticket id for a Zammad chat session id.
async function findTicketForSession(sessionId) {
  // Zammad chat sessions are exposed at /api/v1/chat_sessions/{id} but the id
  // there is the numeric session id, not the UUID the widget holds. The widget's
  // session_id is the chat session's "session_id" string. We search chat sessions.
  try {
    const r = await fetch(`${ZAMMAD_API_URL}/chat_sessions`, { headers: authHeaders() });
    if (!r.ok) return null;
    const sessions = await r.json();
    if (!Array.isArray(sessions)) return null;
    const match = sessions.find((s) => s.session_id === sessionId);
    return match && match.ticket_id ? match.ticket_id : null;
  } catch (e) {
    console.error('findTicketForSession error:', e.message);
    return null;
  }
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { session_id, client_id, rating } = req.body || {};
    if (!rating || (rating !== 'up' && rating !== 'down')) {
      return res.status(400).json({ ok: false, error: 'rating must be up or down' });
    }
    if (!ZAMMAD_API_TOKEN) {
      return res.status(500).json({ ok: false, error: 'Server missing ZAMMAD_API_TOKEN' });
    }

    const label = rating === 'up' ? '👍 Positive' : '👎 Negative';
    const noteBody = `Customer chat rating: ${label}`;

    // Prefer the in-memory client_id -> ticket map (reliable). Fall back to the
    // chat-session lookup if we only have a session_id.
    let ticketId = null;
    if (client_id) ticketId = getTicketForClient(client_id);
    if (!ticketId && session_id) ticketId = await findTicketForSession(session_id);

    if (!ticketId) {
      console.warn('rate: could not resolve ticket for session', session_id, '- rating was', rating);
      return res.status(200).json({ ok: true, attached: false });
    }

    const article = {
      ticket_id: ticketId,
      subject: 'Chat rating',
      body: noteBody,
      type: 'note',
      internal: true,
      sender: 'Agent',
    };

    const ar = await fetch(`${ZAMMAD_API_URL}/ticket_articles`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(article),
    });

    if (!ar.ok) {
      const errText = await ar.text();
      console.error('rate: note create failed', ar.status, errText.slice(0, 200));
      return res.status(200).json({ ok: true, attached: false });
    }

    return res.status(200).json({ ok: true, attached: true });
  } catch (err) {
    console.error('rate error:', err);
    return res.status(200).json({ ok: true, attached: false });
  }
}