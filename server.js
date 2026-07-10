// server.js — Express entry point for the multi-brand chatbot backend.
//
// One backend serves all 9 storefronts. Each site loads the same widget.js with
// a data-brand attribute; the widget fetches its brand config from
// /api/brand-config and sends { brand } with every /api/chat request.

import { config } from 'dotenv';
config({ path: '.env.local' });

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import handler from './api/chat.js';
import { publicBrandConfig, brandOrigins } from './brands.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const ALLOWED = brandOrigins();
function corsFor(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

app.get('/health', (req, res) => {
  res.json({ ok: true, uptime: Math.round(process.uptime()), timestamp: new Date().toISOString() });
});

// Public per-brand config for the widget (accent color, header, greeting, contact).
app.get('/api/brand-config', (req, res) => {
  corsFor(req, res);
  res.json(publicBrandConfig(req.query.brand));
});
app.options('/api/brand-config', (req, res) => { corsFor(req, res); res.status(204).end(); });

app.post('/api/chat', handler);
app.options('/api/chat', handler);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '127.0.0.1';

app.listen(PORT, HOST, () => {
  console.log(`Chatbot backend listening on http://${HOST}:${PORT}`);
  console.log(`  Health:       http://${HOST}:${PORT}/health`);
  console.log(`  Chat:         POST http://${HOST}:${PORT}/api/chat`);
  console.log(`  Brand config: http://${HOST}:${PORT}/api/brand-config?brand=tilesbay`);
});