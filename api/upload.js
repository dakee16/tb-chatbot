// POST /api/upload
//
// Accepts a JPEG image upload and attaches it to the customer's chat ticket
// in Zammad. Works in both bot mode (uses chat-ticket's session map) and
// agent mode (attaches via ticket_id if provided).
//
// Expects multipart/form-data with:
//   file       – the JPEG image
//   client_id  – the widget's conversation id (to find the ticket)
//   ticket_id  – (optional) explicit ticket id to attach to

import { config } from 'dotenv';
config({ path: '.env.local' });
import { getTicketForClient } from './chat-ticket.js';

const ZAMMAD_API_URL = process.env.ZAMMAD_API_URL || 'http://localhost:8080/api/v1';
const ZAMMAD_API_TOKEN = process.env.ZAMMAD_API_TOKEN || '';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

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
    if (!ZAMMAD_API_TOKEN) {
      return res.status(500).json({ ok: false, error: 'Server missing ZAMMAD_API_TOKEN' });
    }

    // Parse multipart body — we receive raw body as base64 from the widget
    const { client_id, ticket_id, image_base64, filename } = req.body || {};

    if (!image_base64) {
      return res.status(400).json({ ok: false, error: 'image_base64 is required' });
    }

    // Resolve which ticket to attach to
    let targetTicketId = ticket_id || null;
    if (!targetTicketId && client_id) {
      targetTicketId = getTicketForClient(client_id);
    }

    if (!targetTicketId) {
      return res.status(400).json({ ok: false, error: 'No ticket found for this conversation. Send a message first.' });
    }

    // Validate it's a JPEG by checking the base64 header or trust the widget
    const cleanBase64 = image_base64.replace(/^data:image\/jpeg;base64,/, '');

    // Check size (base64 is ~1.37x the binary size)
    if (cleanBase64.length > MAX_SIZE * 1.37) {
      return res.status(400).json({ ok: false, error: 'File too large. Max 10MB.' });
    }

    const safeName = (filename || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');

    // Create an article with the image attachment on the ticket
    const article = {
      ticket_id: targetTicketId,
      subject: 'Photo attachment',
      body: 'Customer sent a photo.',
      content_type: 'text/html',
      type: 'web',
      internal: false,
      sender: 'Customer',
      attachments: [
        {
          filename: safeName,
          data: cleanBase64,
          'mime-type': 'image/jpeg',
        },
      ],
    };

    const r = await fetch(`${ZAMMAD_API_URL}/ticket_articles`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(article),
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error('upload: article create failed', r.status, errText.slice(0, 200));
      return res.status(502).json({ ok: false, error: 'Failed to attach image to ticket' });
    }

    return res.status(200).json({ ok: true, ticket_id: targetTicketId });
  } catch (err) {
    console.error('upload error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}