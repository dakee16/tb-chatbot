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
//   'contact'  -> enrich the Zammad customer record once the bot has captured
//                 name/email/phone mid-conversation (ticket already exists by
//                 then in the normal case, created on message 1 via guess:email)
//                 Body: { client_id, name?, email, phone? }

import { config } from 'dotenv';
config({ path: '.env.local' });

const ZAMMAD_API_URL = process.env.ZAMMAD_API_URL || 'http://localhost:8080/api/v1';
const ZAMMAD_API_TOKEN = process.env.ZAMMAD_API_TOKEN || '';
const DEFAULT_GROUP = process.env.ZAMMAD_GROUP || 'TB';

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

// Look up approximate location from an IP address using ip-api.com (free, no key).
async function geoLookup(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1') return null;
  try {
    const r = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,city,regionName,country`);
    const data = await r.json();
    if (data.status === 'success') {
      return [data.city, data.regionName, data.country].filter(Boolean).join(', ');
    }
  } catch (e) {}
  return null;
}

// Extract the real client IP from request headers (behind nginx proxy).
function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return xff.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.connection?.remoteAddress || null;
}

function splitName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] || '', last: parts.slice(1).join(' ') || '' };
}

async function createTicket({ customerMsg, botReply, name, email, url, location, deviceType, pageHistory }) {
  const customerField = email
    ? { customer_id: `guess:${email}` }
    : { customer_id: 'guess:guest@tilesbay-chat.local' };

  const displayName = name || 'Unknown visitor';

  // Visitor info block at the top of the ticket
  const infoLines = [];
  if (location) infoLines.push(`<b>Location:</b> ${esc(location)}`);
  if (deviceType) infoLines.push(`<b>Device:</b> ${esc(deviceType)}`);
  if (url) infoLines.push(`<b>Current page:</b> ${esc(url)}`);
  if (Array.isArray(pageHistory) && pageHistory.length > 0) {
    const pages = pageHistory.map(p => esc(p)).join('<br>');
    infoLines.push(`<b>Pages visited:</b><br>${pages}`);
  }
  const infoBlock = infoLines.length > 0
    ? infoLines.join('<br>') + '<br><hr><br>'
    : '';

  const bodyHtml =
    infoBlock +
    `<b>Customer:</b> ${esc(customerMsg)}<br><br>` +
    `<b>Bot:</b> ${esc(botReply)}`;

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

// Find the Zammad user for this email (created via guess:email during ticket
// creation, in the normal flow) and fill in firstname/lastname/phone if those
// are still blank. Never overwrites a value that's already set. Fully
// isolated: any failure here is logged and swallowed, never thrown — this is
// an enrichment step, not part of the core ticket flow, and must never be
// able to break message handling or ticket creation.
async function enrichZammadCustomer({ name, email, phone }) {
  if (!email) return null;
  try {
    const searchR = await fetch(
      `${ZAMMAD_API_URL}/users/search?query=${encodeURIComponent(email)}&limit=5`,
      { headers: authHeaders() }
    );
    if (!searchR.ok) {
      console.error('enrichZammadCustomer: search failed', searchR.status);
      return null;
    }
    const users = await searchR.json();
    const match = Array.isArray(users)
      ? users.find(u => (u.email || '').toLowerCase() === email.toLowerCase())
      : null;

    if (match) {
      const update = {};
      if (name && !match.firstname && !match.lastname) {
        const { first, last } = splitName(name);
        update.firstname = first;
        update.lastname = last;
      }
      if (phone && !match.phone) update.phone = phone;

      if (Object.keys(update).length > 0) {
        const putR = await fetch(`${ZAMMAD_API_URL}/users/${match.id}`, {
          method: 'PUT', headers: authHeaders(), body: JSON.stringify(update),
        });
        if (!putR.ok) {
          const t = await putR.text();
          console.error('enrichZammadCustomer: update failed', putR.status, t.slice(0, 200));
        }
      }
      return match.id;
    }

    // Rare fallback: no existing user found for this email (e.g. contact
    // captured before any ticket/guess-created user exists yet). Create one
    // directly. No explicit `roles` sent — let Zammad apply its default for
    // API-created users rather than risk a rejected roles format.
    const { first, last } = splitName(name);
    const createR = await fetch(`${ZAMMAD_API_URL}/users`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ firstname: first, lastname: last, email, phone: phone || '' }),
    });
    if (!createR.ok) {
      const t = await createR.text();
      console.error('enrichZammadCustomer: create failed', createR.status, t.slice(0, 200));
      return null;
    }
    const created = await createR.json();
    return created.id;
  } catch (e) {
    console.error('enrichZammadCustomer error:', e.message);
    return null;
  }
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

    if (action === 'contact') {
      const { name, email, phone } = req.body;
      if (!email) return res.status(400).json({ ok: false, error: 'email required' });

      const customerId = await enrichZammadCustomer({ name, email, phone });

      // Leave a visible note on the ticket so agents see captured contact
      // info without having to open the customer profile separately.
      if (existing && existing.ticketId) {
        const lines = [];
        if (name) lines.push(`<b>Name:</b> ${esc(name)}`);
        lines.push(`<b>Email:</b> ${esc(email)}`);
        if (phone) lines.push(`<b>Phone:</b> ${esc(phone)}`);
        await fetch(`${ZAMMAD_API_URL}/ticket_articles`, {
          method: 'POST', headers: authHeaders(),
          body: JSON.stringify({
            ticket_id: existing.ticketId,
            subject: 'Contact info captured',
            body: lines.join('<br>'),
            type: 'note', internal: true, sender: 'Agent',
          }),
        }).catch(() => {});
        existing.lastSeen = Date.now();
      }

      return res.status(200).json({ ok: true, customer_id: customerId, ticket_id: existing ? existing.ticketId : null });
    }

    // default action: 'message'
    const { customerMsg, botReply, name, email, url, deviceType, pageHistory } = req.body;
    if (!customerMsg) return res.status(400).json({ ok: false, error: 'customerMsg required' });

    if (existing && existing.ticketId) {
      await appendExchange(existing.ticketId, customerMsg, botReply || '');
      existing.lastSeen = Date.now();
      return res.status(200).json({ ok: true, ticket_id: existing.ticketId, created: false });
    }

    // First message — look up visitor's location from their IP
    const clientIp = getClientIp(req);
    const location = await geoLookup(clientIp);

    const ticketId = await createTicket({
      customerMsg, botReply: botReply || '', name, email, url,
      location, deviceType, pageHistory,
    });
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