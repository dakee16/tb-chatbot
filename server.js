// server.js — Express entry point for the Tilesbay chatbot.
//
// This is the file PM2 runs in production. It does three things:
//   1. Loads .env.local (so dotenv is set before any handler imports run)
//   2. Serves /public/ as static files (widget.js, test.html)
//   3. Mounts the existing chat handler from api/chat.js as POST /api/chat
//
// Locally:  node server.js
// On VPS:   pm2 start server.js --name tilesbay-chatbot
//
// We bind to 127.0.0.1 only — nginx reverse-proxies public traffic to us.
// This means the chatbot can never be reached directly from the internet,
// even by accident (the IP allowlist + SSL termination both live in nginx).

import { config } from 'dotenv';
config({ path: '.env.local' });

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import handler from './api/chat.js';
import leaveMessageHandler from './api/leave-message.js';
import rateHandler from './api/rate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust the X-Forwarded-For header from nginx so req.ip is the real client IP
// (we don't use this for auth — nginx enforces the IP allowlist — but it's
// useful for logging).
app.set('trust proxy', 1);

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Health check — used by PM2 and any external monitoring
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Chat endpoint — delegates to the existing Vercel-style handler
app.post('/api/chat', handler);
app.options('/api/chat', handler);

// Offline leave-a-message — creates a Zammad ticket when no agent is online
app.post('/api/leave-message', leaveMessageHandler);
app.options('/api/leave-message', leaveMessageHandler);

// Chat rating — thumbs up/down added as a note on the chat ticket
app.post('/api/rate', rateHandler);
app.options('/api/rate', rateHandler);

// Catch-all error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '127.0.0.1';

app.listen(PORT, HOST, () => {
  console.log(`Tilesbay chatbot listening on http://${HOST}:${PORT}`);
  console.log(`  Health: http://${HOST}:${PORT}/health`);
  console.log(`  Chat:   POST http://${HOST}:${PORT}/api/chat`);
  console.log(`  Widget: http://${HOST}:${PORT}/widget.js`);
});