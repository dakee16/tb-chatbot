// POST /api/chat-ticket
//
// Auto-creates and maintains a Zammad ticket for every chat conversation so no
// lead is lost — even bot-only chats where the visitor never hands off.
//
// Actions (field `action` in the body):
//   'message'  -> create the ticket on first exchange, then append each exchange
//                 Body: { client_id, customerMsg, botReply, name?, email?, url? }
//   'handoff'  -> upgrade the existing ticket when a live agent takes over
//                 Body: { client_id, group?, agentName? }
//
// `client_id` is a stable id the widget generates per conversation (NOT the
// Zammad chat session id, which only exists after handoff). We map
// client_id -> zammad ticket id in memory so subsequent calls append to the
// same ticket. Single-process PM2 (fork) makes the in-memory map safe.

import { config } from 'dotenv';
config({ path: '.env.local' });

const ZAMMAD_API_URL = process.env.ZAMMAD_API_URL || 'http://localhost:8080/api/v1';
const ZAMMAD_API_TOKEN = process.env.ZAMMAD_API_TOKEN || '';
const DEFAULT_GROUP = process.env.ZAMMAD_GROUP || 'Tilesbay';

// client_id -> { ticketId, lastSeen }
const sessionTickets = new Map();

// purge stale entries every 30 min (entries older than 6h)
setInterval(() => {
  const cutoff = Date.now() - 6 * 60 * 60 * 1000;
  for (const [k, v] of sessionTickets.entries()) {
    if ((v.lastSeen || 0) < cutoff) sessionTickets.delete(k);
  }
}, 30 * 60 * 1000);

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
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function createTicket({ customerMsg, botReply, name, email, url }) {
  // Identify the customer: use email if given (guess: finds-or-creates),
  // otherwise an anonymous guest. 'guess:<email>' tells Zammad to
  // find-or-create the customer rather than requiring it to pre-exist.
  const customerField = email
    ? { customer_id: `guess:${email}` }
    : { customer_id: 'guess:guest@tilesbay-chat.local' };

  const displayName = name || 'Unknown visitor';
  const bodyHtml =
    `<b>Customer:</b> ${esc(customerMsg)}<br><br>` +
    `<b>Bot:</b> ${esc(botReply)}` +
    (url ? `<br><br><i>Page: ${esc(url)}</i>` : '');

  const payload = {
    title: `Website chat — ${displayName}`,
    group: DEFAULT_GROUP,
    ...customerField,
    tags: 'website-chat,bot',
    article: {
      subject: 'Website chat',
      body: bodyHtml,
      content_type: 'text/html',
      type: 'web',
      internal: false,
      sender: 'Customer',
    },
  };

  const r = await fetch(`${ZAMMAD_API_URL}/tickets`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const t = await r.text();
    console.error('chat-ticket create failed:', r.status, t.slice(0, 200));
    return null;
  }
  const ticket = await r.json();
  return ticket.id;
}

async function appendExchange(ticketId, customerMsg, botReply) {
  const bodyHtml =
    `<b>Customer:</b> ${esc(customerMsg)}<br><br>` +
    `<b>Bot:</b> ${esc(botReply)}`;
  const article = {
    ticket_id: ticketId,
    subject: 'Website chat',
    body: bodyHtml,
    content_type: 'text/html',
    type: 'web',
    internal: false,
    sender: 'Customer',
  };
  const r = await fetch(`${ZAMMAD_API_URL}/ticket_articles`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(article),
  });
  return r.ok;
}

// Find a Zammad agent's user id by display name (to set as owner on handoff).
async function findAgentIdByName(agentName) {
  if (!agentName) return null;
  try {
    const r = await fetch(
      `${ZAMMAD_API_URL}/users/search?query=${encodeURIComponent(agentName)}&limit=5`,
      { headers: authHeaders() }
    );
    const users = await r.json();
    if (!Array.isArray(users)) return null;
    const match = users.find((u) => {
      const full = [u.firstname, u.lastname].filter(Boolean).join(' ').trim();
      return full.toLowerCase() === agentName.toLowerCase();
    }) || users[0];
    return match ? match.id : null;
  } catch (e) {
    return null;
  }
}

async function upgradeTicketForHandoff(ticketId, group, agentName) {
  const update = { tags: 'website-chat,agent' };
  if (group) update.group = group;
  const ownerId = await findAgentIdByName(agentName);
  if (ownerId) update.owner_id = ownerId;
  // add an internal note marking the escalation
  await fetch(`${ZAMMAD_API_URL}/ticket_articles`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({
      ticket_id: ticketId,
      subject: 'Escalated to live agent',
      body: `Chat handed off to live agent${agentName ? ' (' + esc(agentName) + ')' : ''}.`,
      type: 'note', internal: true, sender: 'Agent',
    }),
  });
  const r = await fetch(`${ZAMMAD_API_URL}/tickets/${ticketId}`, {
    method: 'PUT', headers: authHeaders(), body: JSON.stringify(update),
  });
  return r.ok;
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    if (!ZAMMAD_API_TOKEN) {
      return res.status(500).json({ ok: false, error: 'Server missing ZAMMAD_API_TOKEN' });
    }

    const { action, client_id } = req.body || {};
    if (!client_id) return res.status(400).json({ ok: false, error: 'client_id required' });

    const existing = sessionTickets.get(client_id);

    if (action === 'handoff') {
      const { group, agentName } = req.body;
      if (existing && existing.ticketId) {
        await upgradeTicketForHandoff(existing.ticketId, group, agentName);
        existing.lastSeen = Date.now();
        return res.status(200).json({ ok: true, ticket_id: existing.ticketId });
      }
      // no prior ticket (rare) — nothing to upgrade
      return res.status(200).json({ ok: true, ticket_id: null });
    }

    // default action: 'message'
    const { customerMsg, botReply, name, email, url } = req.body;
    if (!customerMsg) return res.status(400).json({ ok: false, error: 'customerMsg required' });

    if (existing && existing.ticketId) {
      await appendExchange(existing.ticketId, customerMsg, botReply || '');
      existing.lastSeen = Date.now();
      return res.status(200).json({ ok: true, ticket_id: existing.ticketId, created: false });
    }

    const ticketId = await createTicket({ customerMsg, botReply: botReply || '', name, email, url });
    if (!ticketId) return res.status(502).json({ ok: false, error: 'create failed' });

    sessionTickets.set(client_id, { ticketId, lastSeen: Date.now() });
    return res.status(200).json({ ok: true, ticket_id: ticketId, created: true });
  } catch (err) {
    console.error('chat-ticket error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

// Exported so /api/rate can resolve the ticket for a client conversation too.
export function getTicketForClient(clientId) {
  const e = sessionTickets.get(clientId);
  return e ? e.ticketId : null;
}