// Tilesbay chatbot widget — bot + live-agent handoff in one window (Architecture A1).
//
// Modes:
//   BOT    — talks to /api/chat (Claude). Default mode.
//   AGENT  — talks to Zammad over WebSocket (via window.ZammadWS).
//
// Handoff: a persistent "Talk to a human" button, OR the bot can request
// handoff by including the token [[HANDOFF]] anywhere in a reply.
//
// When the customer asks for a human but no agent is online, we show an
// email-capture form that posts a ticket to Zammad via /api/leave-message.
//
// Requires zammad-ws.js to be loaded first (widget.js loads it automatically).
//
// SHADOW DOM: The entire widget lives inside a Shadow DOM so that the host
// page's CSS (Magento, Bootstrap, etc.) cannot bleed into the widget styles.

(function () {
  // ---- Resolve backend + zammad host from this script's own URL ----
  const scriptEl = document.currentScript || (function () {
    const all = document.getElementsByTagName('script');
    return all[all.length - 1];
  })();
  const scriptUrl = new URL(scriptEl.src, window.location.href);
  const BACKEND_ORIGIN = scriptUrl.origin;          // e.g. https://chat.tilesbay.net
  const BACKEND_URL = `${BACKEND_ORIGIN}/api/chat`;
  // Which storefront is this? Set via data-brand on the script tag.
  const BRAND = scriptEl.getAttribute('data-brand') || 'tilesbay';
  const BRAND_CONFIG_URL = `${BACKEND_ORIGIN}/api/brand-config?brand=${encodeURIComponent(BRAND)}`;
  const LEAVE_MSG_URL = `${BACKEND_ORIGIN}/api/leave-message`;
  const RATE_URL = `${BACKEND_ORIGIN}/api/rate`;
  const CHAT_TICKET_URL = `${BACKEND_ORIGIN}/api/chat-ticket`;
  const UPLOAD_URL = `${BACKEND_ORIGIN}/api/upload`;
  const ALIAS_URL = `${BACKEND_ORIGIN}/api/agent-alias`;

  // Stable id for THIS conversation
  const CLIENT_ID = 'tbc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);

  // ---------- Visitor tracking ----------
  var pageHistory = [];
  try {
    var saved = window.sessionStorage.getItem('tbc_pages');
    if (saved) pageHistory = JSON.parse(saved);
  } catch (e) {}
  if (pageHistory.indexOf(window.location.href) === -1) {
    pageHistory.push(window.location.href);
    try { window.sessionStorage.setItem('tbc_pages', JSON.stringify(pageHistory)); } catch (e) {}
  }

  // Detect device type
  var deviceType = /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop';

  const ZAMMAD_WSS = scriptEl.getAttribute('data-zammad') || 'wss://crm.tilesbay.net/ws';
  const ZAMMAD_CHAT_ID = parseInt(scriptEl.getAttribute('data-chat-id') || '1', 10);

  // ---- Load the WebSocket module if not already present ----
  function ensureZammadWS(cb) {
    if (window.ZammadWS) return cb();
    const s = document.createElement('script');
    s.src = `${BACKEND_ORIGIN}/zammad-ws.js`;
    s.onload = cb;
    s.onerror = () => { console.error('[tbc] failed to load zammad-ws.js'); cb(); };
    document.head.appendChild(s);
  }

  // ---------- Styles ----------
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    /* Reset — undo any inherited styles from the host page.
       This is the key benefit of Shadow DOM: these rules only apply inside
       the shadow root, and no host-page rules can reach in. We add a
       minimal reset here to be extra safe. */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    /* ===== Design tokens ===== */
    :host {
      --tbc-bg: #ffffff;
      --tbc-surface: rgba(255, 255, 255, 0.72);
      --tbc-surface-strong: rgba(255, 255, 255, 0.92);
      --tbc-ink: #0a0a0a;
      --tbc-ink-2: #1a1a1a;
      --tbc-muted: rgba(10, 10, 10, 0.55);
      --tbc-soft: rgba(10, 10, 10, 0.06);
      --tbc-line: rgba(10, 10, 10, 0.08);
      --tbc-accent: #e11d2e;
      --tbc-accent-soft: rgba(225, 29, 46, 0.10);
      --tbc-shadow-lg: 0 24px 60px -20px rgba(10, 10, 10, 0.28), 0 8px 20px -8px rgba(10, 10, 10, 0.16);
      --tbc-shadow-md: 0 8px 24px -6px rgba(10, 10, 10, 0.18), 0 2px 6px rgba(10, 10, 10, 0.06);
      --tbc-shadow-sm: 0 2px 8px rgba(10, 10, 10, 0.06);
      --tbc-radius-pill: 999px;
      --tbc-radius-card: 22px;
      --tbc-ease: cubic-bezier(0.22, 1, 0.36, 1);

      /* Ensure the host element itself doesn't interfere with page layout */
      all: initial;
      display: block;
      position: fixed;
      bottom: 0;
      right: 0;
      z-index: 99999;
      pointer-events: none;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    /* ===== Floating launcher (the bubble) ===== */
    .tbc-bubble {
      position: fixed; bottom: 24px; right: 24px; z-index: 99999;
      width: 60px; height: 60px; border-radius: 50%;
      background: radial-gradient(120% 120% at 30% 20%, #1f1f1f 0%, #0a0a0a 60%);
      color: white;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      pointer-events: auto;
      box-shadow:
        0 10px 30px -8px rgba(10, 10, 10, 0.55),
        0 2px 8px rgba(10, 10, 10, 0.25),
        inset 0 1px 0 rgba(255, 255, 255, 0.12);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      transition: transform 0.35s var(--tbc-ease), box-shadow 0.3s var(--tbc-ease);
      overflow: hidden;
    }
    .tbc-bubble::before {
      content: ''; position: absolute; inset: -40%;
      background: radial-gradient(circle at 30% 30%, rgba(225, 29, 46, 0.55), transparent 55%);
      filter: blur(18px); opacity: 0.6;
      animation: tbc-breathe 4.5s ease-in-out infinite;
      pointer-events: none;
    }
    .tbc-bubble::after {
      content: ''; position: absolute; top: 6px; right: 6px;
      width: 12px; height: 12px; border-radius: 50%;
      background: var(--tbc-accent);
      box-shadow: 0 0 0 3px #ffffff, 0 0 12px rgba(225, 29, 46, 0.6);
      animation: tbc-pulse 2.4s ease-in-out infinite;
    }
    @keyframes tbc-breathe {
      0%, 100% { transform: scale(1); opacity: 0.5; }
      50% { transform: scale(1.15); opacity: 0.75; }
    }
    @keyframes tbc-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(0.85); opacity: 0.7; }
    }
    .tbc-bubble:hover {
      transform: translateY(-2px) scale(1.05);
      box-shadow:
        0 18px 40px -10px rgba(225, 29, 46, 0.35),
        0 6px 18px rgba(10, 10, 10, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.16);
    }
    .tbc-bubble:active { transform: translateY(0) scale(0.97); }
    .tbc-bubble svg { width: 26px; height: 26px; position: relative; z-index: 1; }

    /* ===== The panel (liquid glass card) ===== */
    .tbc-panel {
      position: fixed; bottom: 100px; right: 24px; z-index: 99999;
      width: 400px; max-width: calc(100vw - 32px);
      height: 640px; max-height: calc(100vh - 130px);
      background: linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.78) 100%);
      backdrop-filter: blur(28px) saturate(180%);
      -webkit-backdrop-filter: blur(28px) saturate(180%);
      border-radius: 28px;
      border: 1px solid rgba(255, 255, 255, 0.6);
      box-shadow:
        var(--tbc-shadow-lg),
        inset 0 1px 0 rgba(255, 255, 255, 0.7);
      display: none; flex-direction: column;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      overflow: hidden;
      animation: tbc-panelIn 0.4s var(--tbc-ease);
      color: var(--tbc-ink);
      pointer-events: auto;
    }
    .tbc-panel::before {
      content: ''; position: absolute; top: -120px; right: -80px;
      width: 280px; height: 280px; border-radius: 50%;
      background: radial-gradient(circle, rgba(225, 29, 46, 0.22), transparent 65%);
      filter: blur(40px); pointer-events: none; z-index: 0;
    }
    .tbc-panel::after {
      content: ''; position: absolute; bottom: -100px; left: -60px;
      width: 240px; height: 240px; border-radius: 50%;
      background: radial-gradient(circle, rgba(10, 10, 10, 0.10), transparent 70%);
      filter: blur(30px); pointer-events: none; z-index: 0;
    }
    @keyframes tbc-panelIn {
      from { opacity: 0; transform: translateY(16px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .tbc-panel.open { display: flex; }
    .tbc-panel > * { position: relative; z-index: 1; }

    /* ===== Header ===== */
    .tbc-header {
      padding: 18px 20px;
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
      color: white;
      display: flex; justify-content: space-between; align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      position: relative;
      overflow: hidden;
    }
    .tbc-header::before {
      content: ''; position: absolute; top: 0; right: -40px;
      width: 160px; height: 160px; border-radius: 50%;
      background: radial-gradient(circle, rgba(225, 29, 46, 0.35), transparent 70%);
      filter: blur(24px); pointer-events: none;
    }
    .tbc-header-title {
      font-weight: 600; font-size: 15px; letter-spacing: -0.01em;
      display: inline-flex; align-items: center; gap: 10px;
      position: relative; z-index: 1;
    }
    .tbc-header-title::before {
      content: ''; width: 8px; height: 8px; border-radius: 50%;
      background: var(--tbc-accent);
      box-shadow: 0 0 0 3px rgba(225, 29, 46, 0.2), 0 0 12px rgba(225, 29, 46, 0.7);
      animation: tbc-pulse 2.4s ease-in-out infinite;
    }
    .tbc-close {
      cursor: pointer; background: none; border: none;
      color: #ffffff; font-size: 22px; line-height: 1;
      padding: 0 4px; transition: opacity 0.15s var(--tbc-ease);
      position: relative; z-index: 1; opacity: 0.85;
    }
    .tbc-close:hover { opacity: 1; }

    /* ===== Messages area ===== */
    .tbc-messages {
      flex: 1; overflow-y: auto; padding: 22px 20px 16px;
      display: flex; flex-direction: column; gap: 18px;
      background: transparent;
      scroll-behavior: smooth;
    }
    .tbc-messages::-webkit-scrollbar { width: 5px; }
    .tbc-messages::-webkit-scrollbar-track { background: transparent; }
    .tbc-messages::-webkit-scrollbar-thumb {
      background: rgba(10, 10, 10, 0.12); border-radius: 999px;
    }
    .tbc-messages::-webkit-scrollbar-thumb:hover { background: rgba(10, 10, 10, 0.22); }

    /* ===== Message rows ===== */
    .tbc-row {
      display: flex; gap: 10px; align-items: flex-start;
      animation: tbc-rowIn 0.35s var(--tbc-ease) both;
    }
    @keyframes tbc-rowIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .tbc-row.user { flex-direction: column; align-items: flex-end; }
    .tbc-row.bot, .tbc-row.agent { flex-direction: row; align-items: flex-start; }
    .tbc-row-avatar {
      width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 11px; margin-top: 2px;
      letter-spacing: 0.02em;
    }
    .tbc-row.bot .tbc-row-avatar {
      background: linear-gradient(135deg, #0a0a0a, #2a2a2a);
      color: white;
      box-shadow: 0 4px 12px -2px rgba(10, 10, 10, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15);
    }
    .tbc-row.agent .tbc-row-avatar {
      background: linear-gradient(135deg, var(--tbc-accent), #b81020);
      color: white;
      box-shadow: 0 4px 12px -2px rgba(225, 29, 46, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
    }
    .tbc-row.user .tbc-row-avatar { display: none; }
    .tbc-row-main { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .tbc-row-label { display: none; }

    /* ===== Message bubbles ===== */
    .tbc-msg {
      line-height: 1.6; font-size: 13.5px; word-wrap: break-word;
      letter-spacing: -0.005em;
    }
    .tbc-msg.user {
      max-width: 100%; padding: 11px 16px;
      background: linear-gradient(135deg, #0a0a0a 0%, #1f1f1f 100%);
      color: #ffffff;
      border-radius: 20px 20px 6px 20px;
      box-shadow: 0 6px 16px -6px rgba(10, 10, 10, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08);
    }
    .tbc-msg.bot, .tbc-msg.agent {
      max-width: 100%; padding: 11px 16px;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      color: var(--tbc-ink-2);
      border: 1px solid var(--tbc-line);
      border-radius: 20px 20px 20px 6px;
      box-shadow: var(--tbc-shadow-sm);
    }
    .tbc-msg.agent {
      border-color: rgba(225, 29, 46, 0.25);
      box-shadow: 0 4px 14px -6px rgba(225, 29, 46, 0.18), inset 0 0 0 1px rgba(225, 29, 46, 0.05);
    }
    .tbc-msg.system {
      align-self: center; color: var(--tbc-muted); font-size: 11.5px;
      text-align: center; padding: 6px 14px; font-weight: 500;
      background: rgba(10, 10, 10, 0.04);
      border-radius: 999px;
      letter-spacing: 0.01em;
    }
    .tbc-msg a { color: var(--tbc-accent); text-decoration: none; font-weight: 600; }
    .tbc-msg a:hover { text-decoration: underline; }
    .tbc-msg.user a { color: #ff8a98; }

    /* ===== Typing indicator ===== */
    .tbc-typing {
      display: inline-flex; gap: 4px; align-items: center;
      padding: 12px 16px; margin-left: 40px;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--tbc-line);
      border-radius: 20px 20px 20px 6px;
      width: fit-content;
      box-shadow: var(--tbc-shadow-sm);
    }
    .tbc-typing span {
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--tbc-accent);
      animation: tbc-dot 1.3s infinite ease-in-out;
    }
    .tbc-typing span:nth-child(2) { animation-delay: 0.15s; }
    .tbc-typing span:nth-child(3) { animation-delay: 0.3s; }
    @keyframes tbc-dot {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
      30% { transform: translateY(-5px); opacity: 1; }
    }

    /* ===== Composer (input area) ===== */
    .tbc-composer {
      padding: 12px 16px 16px; background: transparent;
    }
    .tbc-composer-card {
      border: 1px solid transparent;
      border-radius: var(--tbc-radius-card);
      background: transparent;
      transition: box-shadow 0.25s var(--tbc-ease), border-color 0.25s, transform 0.25s;
      display: flex; flex-direction: column;
    }
    .tbc-composer-card:focus-within {
      box-shadow:
        0 8px 28px -8px rgba(225, 29, 46, 0.25),
        0 0 0 3px rgba(225, 29, 46, 0.10);
      border-color: rgba(225, 29, 46, 0.45);
    }
    .tbc-input {
      width: 100%; padding: 14px 18px 8px; border: none; background: transparent;
      font-size: 13.5px; outline: none; font-family: inherit; color: var(--tbc-ink);
      resize: none; line-height: 1.55; box-sizing: border-box;
    }
    .tbc-input::placeholder { color: rgba(10, 10, 10, 0.35); }
    .tbc-composer-footer {
      display: flex; align-items: center; justify-content: space-between;
      padding: 4px 14px 10px;
    }
    .tbc-composer-tools { display: flex; align-items: center; gap: 6px; }
    .tbc-attach {
      background: none; border: none; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      color: rgba(10, 10, 10, 0.5);
      padding: 4px;
      transition: color 0.2s var(--tbc-ease);
    }
    .tbc-attach:hover { color: var(--tbc-accent); }
    .tbc-attach svg { width: 18px; height: 18px; }
    .tbc-send {
      background: none; border: none; padding: 4px 2px; cursor: pointer;
      font-family: inherit; font-size: 13px; font-weight: 600;
      letter-spacing: 0.01em;
      color: var(--tbc-accent);
      transition: opacity 0.15s var(--tbc-ease), transform 0.15s;
    }
    .tbc-send:disabled {
      color: rgba(10, 10, 10, 0.25); cursor: default;
    }
    .tbc-send:not(:disabled):hover { opacity: 0.75; }
    .tbc-send:not(:disabled):active { transform: scale(0.95); }
    .tbc-send svg { display: none; }
    .tbc-img-preview {
      max-width: 200px; border-radius: 16px; margin-top: 4px;
      box-shadow: var(--tbc-shadow-md);
    }

    /* ===== Handoff row ===== */
    .tbc-handoff-row { padding: 0 16px 6px; }
    .tbc-handoff-btn {
      width: 100%; padding: 11px 14px;
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      color: var(--tbc-ink-2);
      border: 1px solid var(--tbc-line);
      border-radius: var(--tbc-radius-pill); cursor: pointer;
      font-weight: 600; font-size: 12.5px; font-family: inherit;
      letter-spacing: 0.005em;
      transition: all 0.25s var(--tbc-ease);
      display: flex; align-items: center; justify-content: center; gap: 8px;
      box-shadow: var(--tbc-shadow-sm);
    }
    .tbc-handoff-btn::before {
      content: ''; width: 8px; height: 8px; border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.18), 0 0 8px rgba(34, 197, 94, 0.6);
      animation: tbc-pulse 2.4s ease-in-out infinite;
    }
    .tbc-handoff-btn:hover {
      background: rgba(10, 10, 10, 0.92); color: white;
      border-color: transparent;
      transform: translateY(-1px);
      box-shadow: 0 8px 20px -6px rgba(10, 10, 10, 0.35);
    }
    .tbc-handoff-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

    /* ===== Leave-a-message form ===== */
    .tbc-leave-form {
      padding: 16px; background: transparent;
      display: flex; flex-direction: column; gap: 10px;
    }
    .tbc-leave-form input, .tbc-leave-form textarea {
      padding: 12px 16px; border: 1px solid var(--tbc-line); border-radius: 16px;
      font-size: 13px; font-family: inherit; outline: none;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      color: var(--tbc-ink);
      transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    }
    .tbc-leave-form input::placeholder, .tbc-leave-form textarea::placeholder {
      color: rgba(10, 10, 10, 0.35);
    }
    .tbc-leave-form input:focus, .tbc-leave-form textarea:focus {
      border-color: rgba(225, 29, 46, 0.4);
      box-shadow: 0 0 0 3px rgba(225, 29, 46, 0.08);
      background: rgba(255, 255, 255, 0.95);
    }
    .tbc-leave-form textarea { resize: vertical; min-height: 72px; }
    .tbc-leave-form button {
      padding: 12px; background: linear-gradient(135deg, var(--tbc-accent) 0%, #b81020 100%);
      color: white; border: none;
      border-radius: var(--tbc-radius-pill); cursor: pointer;
      font-weight: 600; font-size: 13px;
      letter-spacing: 0.01em;
      transition: transform 0.2s var(--tbc-ease), box-shadow 0.2s;
      box-shadow: 0 6px 18px -4px rgba(225, 29, 46, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.18);
    }
    .tbc-leave-form button:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 24px -6px rgba(225, 29, 46, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.22);
    }
    .tbc-leave-form button:active { transform: translateY(0) scale(0.98); }

    /* ===== Rating ===== */
    .tbc-rating {
      align-self: center; text-align: center; padding: 16px 8px;
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--tbc-line);
      border-radius: 20px;
      box-shadow: var(--tbc-shadow-sm);
      min-width: 200px;
    }
    .tbc-rating-q { color: var(--tbc-ink-2); font-size: 13px; margin-bottom: 12px; font-weight: 600; }
    .tbc-rating-btns { display: flex; gap: 10px; justify-content: center; }
    .tbc-rating-btns button {
      font-size: 22px;
      background: rgba(255, 255, 255, 0.85);
      border: 1px solid var(--tbc-line);
      border-radius: 50%; width: 48px; height: 48px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.25s var(--tbc-ease), border-color 0.2s, box-shadow 0.2s;
    }
    .tbc-rating-btns button:hover {
      transform: scale(1.12) translateY(-2px);
      border-color: rgba(225, 29, 46, 0.35);
      box-shadow: 0 8px 18px -4px rgba(225, 29, 46, 0.25);
    }

    /* ===== Quick-reply chips ===== */
    .tbc-buttons {
      display: flex; flex-wrap: wrap; gap: 6px;
      padding: 4px 0 8px; margin-left: 40px;
    }
    .tbc-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 14px;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
      border: 1px solid var(--tbc-line);
      border-radius: var(--tbc-radius-pill); cursor: pointer; font-size: 12.5px; font-family: inherit;
      color: var(--tbc-ink-2); font-weight: 500;
      transition: background 0.2s var(--tbc-ease), border-color 0.2s, color 0.2s, transform 0.2s, box-shadow 0.2s;
      box-shadow: var(--tbc-shadow-sm);
    }
    .tbc-chip::before {
      content: ''; width: 5px; height: 5px; border-radius: 50%;
      background: var(--tbc-accent);
    }
    .tbc-chip:hover {
      background: var(--tbc-ink); color: white;
      border-color: transparent;
      transform: translateY(-1px);
      box-shadow: 0 6px 16px -4px rgba(10, 10, 10, 0.3);
    }
    .tbc-chip:hover::before { background: var(--tbc-accent); box-shadow: 0 0 8px var(--tbc-accent); }

    /* ===== Mobile tuning ===== */
    @media (max-width: 480px) {
      .tbc-panel {
        bottom: 92px; right: 12px; left: 12px;
        width: auto; max-width: none;
        height: calc(100vh - 120px);
        border-radius: 24px;
      }
      .tbc-bubble { bottom: 18px; right: 18px; }
    }

    /* ===== Reduced motion ===== */
    @media (prefers-reduced-motion: reduce) {
      .tbc-bubble::before, .tbc-bubble::after,
      .tbc-header-title::before, .tbc-handoff-btn::before {
        animation: none;
      }
      .tbc-panel, .tbc-row { animation: none; }
      .tbc-bubble, .tbc-send, .tbc-handoff-btn, .tbc-chip,
      .tbc-close, .tbc-attach, .tbc-rating-btns button,
      .tbc-leave-form button, .tbc-composer-card {
        transition: none;
      }
    }
  `;

  // ---------- Shadow DOM host ----------
  const host = document.createElement('div');
  host.id = 'tilesbay-chatbot-host';
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = css;
  shadow.appendChild(style);

  // ---------- DOM ----------
  const bubble = document.createElement('div');
  bubble.className = 'tbc-bubble';
  bubble.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/><circle cx="9" cy="11.5" r="0.9" fill="currentColor" stroke="none"/><circle cx="12.5" cy="11.5" r="0.9" fill="currentColor" stroke="none"/><circle cx="16" cy="11.5" r="0.9" fill="currentColor" stroke="none"/></svg>`;
  shadow.appendChild(bubble);

  const panel = document.createElement('div');
  panel.className = 'tbc-panel';
  panel.innerHTML = `
    <div class="tbc-header">
      <span class="tbc-header-title">
        <span class="tbc-title-text">Tilesbay Assistant</span>
      </span>
      <button class="tbc-close" aria-label="Close">&times;</button>
    </div>
    <div class="tbc-messages"></div>
    <div class="tbc-handoff-row">
      <button class="tbc-handoff-btn">Talk to an Agent</button>
    </div>
    <div class="tbc-composer">
      <div class="tbc-composer-card">
        <input class="tbc-input" type="text" placeholder="Chat with Tilesbay..." />
        <input class="tbc-file-input" type="file" accept="image/jpeg" style="display:none;" />
        <div class="tbc-composer-footer">
          <div class="tbc-composer-tools">
            <button class="tbc-attach" aria-label="Attach photo" title="Send a photo (JPEG)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg></button>
          </div>
          <button class="tbc-send" aria-label="Send">Send</button>
        </div>
      </div>
    </div>
  `;
  shadow.appendChild(panel);


  const messagesEl = panel.querySelector('.tbc-messages');
  const inputEl = panel.querySelector('.tbc-input');
  const sendBtn = panel.querySelector('.tbc-send');
  const closeBtn = panel.querySelector('.tbc-close');
  const handoffRow = panel.querySelector('.tbc-handoff-row');
  const handoffBtn = panel.querySelector('.tbc-handoff-btn');
  const inputRow = panel.querySelector('.tbc-composer');
  const attachBtn = panel.querySelector('.tbc-attach');
  const fileInput = panel.querySelector('.tbc-file-input');
  const titleText = panel.querySelector('.tbc-title-text');
  const statusDot = panel.querySelector('.tbc-status-dot'); // may be null

  // ---------- State ----------
  const MODE = { BOT: 'bot', CONNECTING: 'connecting', AGENT: 'agent', LEAVE: 'leave' };
  let mode = MODE.BOT;
  let hadAgentChat = false;
  let chatSessionId = null;
  let ratingShown = false;
  const history = [];
  const transcript = [];
  let isLoading = false;
  let zw = null;
  let agentTypingTimer = null;
  // Brand-specific bits, overridden by /api/brand-config on load.
  let brandGreeting = "Hi! I can help you find the right product or work out how much you need. What are you working on?";

  // Fetch this store's config and apply its accent color, header, and greeting.
  (function loadBrandConfig() {
    fetch(BRAND_CONFIG_URL)
      .then(function (r) { return r.json(); })
      .then(function (cfg) {
        if (!cfg) return;
        if (cfg.accent) host.style.setProperty('--tbc-accent', cfg.accent);
        if (cfg.accentSoft) host.style.setProperty('--tbc-accent-soft', cfg.accentSoft);
        if (cfg.header && titleText) titleText.textContent = cfg.header;
        if (cfg.greeting) {
          brandGreeting = cfg.greeting;
          // If the panel is already open on the default greeting, update it.
          var firstBot = messagesEl.querySelector('.tbc-row.bot .tbc-msg.bot');
          if (firstBot && transcript.length <= 1) firstBot.textContent = cfg.greeting;
        }
      })
      .catch(function () { /* keep defaults if config can't load */ });
  })();

  // ---------- Helpers ----------
  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function linkify(s) {
    return escapeHtml(s)
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/\n/g, '<br>');
  }

  function nowTime() {
    var d = new Date();
    var h = d.getHours();
    var m = d.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;
    return h + ':' + (m < 10 ? '0' + m : m) + ' ' + ampm;
  }

  var agentDisplayName = 'Agent';
  function labelFor(kind) {
    if (kind === 'user') return 'You';
    if (kind === 'agent') return agentDisplayName;
    return 'Tilesbay Assistant';
  }
  function avatarFor(kind) {
    if (kind === 'user') return 'Y';
    if (kind === 'agent') return (agentDisplayName[0] || 'A').toUpperCase();
    return 'T';
  }

  function addMessage(kind, text, recordInTranscript) {
    if (kind === 'system') {
      const sys = document.createElement('div');
      sys.className = 'tbc-msg system';
      sys.textContent = text;
      messagesEl.appendChild(sys);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return;
    }

    const row = document.createElement('div');
    row.className = `tbc-row ${kind}`;

    const avatar = document.createElement('div');
    avatar.className = 'tbc-row-avatar';
    avatar.textContent = avatarFor(kind);

    const main = document.createElement('div');
    main.className = 'tbc-row-main';

    const label = document.createElement('div');
    label.className = 'tbc-row-label';
    label.innerHTML = labelFor(kind) + ' <span class="tbc-row-time">\u00B7 ' + nowTime() + '</span>';

    const msgBubble = document.createElement('div');
    msgBubble.className = `tbc-msg ${kind}`;
    msgBubble.innerHTML = linkify(text);

    main.appendChild(label);
    main.appendChild(msgBubble);
    row.appendChild(avatar);
    row.appendChild(main);
    messagesEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    if (recordInTranscript !== false && kind !== 'system') {
      const who = kind === 'user' ? 'Customer' : (kind === 'agent' ? 'Agent' : 'Bot');
      transcript.push({ who, text });
    }
  }

  function showTyping(label) {
    hideTyping();
    const div = document.createElement('div');
    div.className = 'tbc-typing';
    div.id = 'tbc-typing-indicator';
    div.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  function hideTyping() {
    // Shadow DOM: can't use document.getElementById — query inside shadow root
    const el = shadow.querySelector('#tbc-typing-indicator');
    if (el) el.remove();
  }

  function stripMarkdown(s) {
    if (!s) return s;
    return s
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/(^|\s)\*(.+?)\*(?=\s|$)/g, '$1$2')
      .replace(/(^|\s)_(.+?)_(?=\s|$)/g, '$1$2')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^\s*[-*]\s+/gm, '• ');
  }

  function buildTranscriptText() {
    if (transcript.length === 0) return '(no prior conversation)';
    var lines = transcript.map(function (t) {
      return '<b>' + t.who + ':</b> ' + stripMarkdown(t.text);
    });
    return 'Chatbot conversation before handoff:<br><br>' + lines.join('<br><br>');
  }

  // ---------- INTERACTIVE BUTTONS ----------
  function parseButtons(reply) {
    var match = reply.match(/\[\[BUTTONS:\s*(.+?)\]\]/i);
    if (!match) return { text: reply, buttons: null };
    var text = reply.replace(/\[\[BUTTONS:\s*.+?\]\]/i, '').trim();
    var buttons = match[1].split('|').map(function (b) { return b.trim(); }).filter(Boolean);
    return { text: text, buttons: buttons.length > 0 ? buttons : null };
  }

  function renderButtons(buttons) {
    var wrap = document.createElement('div');
    wrap.className = 'tbc-buttons';
    buttons.forEach(function (label) {
      var chip = document.createElement('button');
      chip.className = 'tbc-chip';
      chip.textContent = label;
      chip.addEventListener('click', function () {
        wrap.remove();
        inputEl.value = label;
        send();
      });
      wrap.appendChild(chip);
    });
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // ---------- IMAGE UPLOAD ----------
  function handleImageUpload(file) {
    if (!file || !file.type.match(/image\/jpeg/)) {
      addMessage('system', 'Only JPEG images are allowed.', false);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      addMessage('system', 'Image too large. Max 10MB.', false);
      return;
    }

    var reader = new FileReader();
    reader.onload = function (e) {
      var base64 = e.target.result;
      var row = document.createElement('div');
      row.className = 'tbc-row user';
      var avatar = document.createElement('div');
      avatar.className = 'tbc-row-avatar';
      avatar.textContent = 'Y';
      var main = document.createElement('div');
      main.className = 'tbc-row-main';
      var img = document.createElement('img');
      img.src = base64;
      img.className = 'tbc-img-preview';
      img.alt = 'Photo';
      main.appendChild(img);
      row.appendChild(avatar);
      row.appendChild(main);
      messagesEl.appendChild(row);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      transcript.push({ who: 'Customer', text: '[sent a photo]' });

      addMessage('system', 'Uploading photo\u2026', false);
      fetch(UPLOAD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          image_base64: base64,
          filename: file.name || 'photo.jpg',
        }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var msgs = messagesEl.querySelectorAll('.tbc-msg.system');
          var last = msgs[msgs.length - 1];
          if (last && last.textContent.indexOf('Uploading') !== -1) last.remove();
          if (data && data.ok) {
            addMessage('system', 'Photo sent.', false);
          } else {
            addMessage('system', 'Could not upload photo: ' + (data.error || 'unknown error'), false);
          }
        })
        .catch(function () {
          addMessage('system', 'Failed to upload photo. Please try again.', false);
        });
    };
    reader.readAsDataURL(file);
  }

  // ---------- BOT MODE ----------
  let capturedContact = { name: null, email: null, phone: null };

  // Send captured contact info to Zammad once (or again if it's updated later).
  function sendContactUpdate(contact) {
    if (!contact || !contact.email) return;
    try {
      fetch(CHAT_TICKET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'contact',
          client_id: CLIENT_ID,
          name: contact.name || null,
          email: contact.email,
          phone: contact.phone || null,
        }),
      }).catch(function () {});
    } catch (e) {}
  }
  function recordExchange(customerMsg, botReply) {
    try {
      fetch(CHAT_TICKET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'message',
          client_id: CLIENT_ID,
          customerMsg: customerMsg,
          botReply: botReply,
          name: capturedContact.name,
          email: capturedContact.email,
          phone: capturedContact.phone,
          url: window.location.href,
          deviceType: deviceType,
          pageHistory: pageHistory,
        }),
      }).catch(function () {});
    } catch (e) {}
  }

  function notifyHandoff(group, agentName) {
    try {
      fetch(CHAT_TICKET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'handoff',
          client_id: CLIENT_ID,
          group: group || null,
          agentName: agentName || null,
        }),
      }).catch(function () {});
    } catch (e) {}
  }

  async function sendToBot(text) {
    isLoading = true;
    sendBtn.disabled = true;
    handoffBtn.disabled = true;
    showTyping();

    try {
      const res = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, brand: BRAND }),
      });
      const data = await res.json();
      hideTyping();

      if (data.error) {
        addMessage('bot', `Sorry, something went wrong: ${data.error}`);
      } else {
        if (data.contact && data.contact.email) {
          capturedContact = {
            name: data.contact.name || capturedContact.name,
            email: data.contact.email,
            phone: data.contact.phone || capturedContact.phone,
          };
          sendContactUpdate(capturedContact);
        }
        let reply = data.reply || '';
        const wantsHandoff = /\[\[HANDOFF\]\]/i.test(reply);
        reply = reply.replace(/\[\[HANDOFF\]\]/gi, '').trim();
        if (reply) {
          var parsed = parseButtons(reply);
          var clean = stripMarkdown(parsed.text);
          addMessage('bot', clean);
          history.push({ role: 'assistant', content: reply });
          recordExchange(text, clean);
          if (parsed.buttons) {
            renderButtons(parsed.buttons);
          }
        }
        if (wantsHandoff) {
          beginHandoff();
        }
      }
    } catch (err) {
      hideTyping();
      addMessage('bot', `Connection error: ${err.message}`);
    } finally {
      isLoading = false;
      sendBtn.disabled = false;
      handoffBtn.disabled = false;
      inputEl.focus();
    }
  }

  // ---------- HANDOFF / AGENT MODE ----------
  function beginHandoff() {
    if (mode === MODE.AGENT || mode === MODE.CONNECTING) return;
    mode = MODE.CONNECTING;
    handoffRow.style.display = 'none';
    addMessage('system', 'Connecting you to a team member\u2026', false);
    showTyping('connecting\u2026');

    ensureZammadWS(function () {
      if (!window.ZammadWS) {
        hideTyping();
        addMessage('system', 'Live chat is unavailable right now.', false);
        showLeaveForm();
        return;
      }

      zw = new window.ZammadWS({
        host: ZAMMAD_WSS,
        chatId: ZAMMAD_CHAT_ID,
        debug: true,
        onStatus: function (state) {
          if (mode !== MODE.CONNECTING) return;
          if (state === 'online') {
            zw.startSession(window.location.href);
          } else {
            hideTyping();
            addMessage('system', 'No agents are online right now.', false);
            showLeaveForm();
            try { zw.close(); } catch (e) {}
          }
        },
        onQueue: function (position) {
          showTyping(position ? `waiting in queue (#${position})\u2026` : 'waiting for an agent\u2026');
        },
        onStart: function (agent) {
          hideTyping();
          mode = MODE.AGENT;
          hadAgentChat = true;
          chatSessionId = zw.sessionId || null;
          var realName = agent && agent.name ? agent.name : 'Live Agent';
          titleText.textContent = realName;
          agentDisplayName = realName;
          if (statusDot) statusDot.classList.add('online');
          var statusTextEl = panel.querySelector('.tbc-status-text');
          if (statusTextEl) statusTextEl.textContent = 'Live agent';
          addMessage('system', 'You\'re now chatting with ' + realName + '.', false);
          fetch(ALIAS_URL + '?name=' + encodeURIComponent(realName))
            .then(function (r) { return r.json(); })
            .then(function (data) {
              if (data && data.alias) {
                titleText.textContent = data.alias;
                agentDisplayName = data.alias;
                var msgs = messagesEl.querySelectorAll('.tbc-msg.system');
                for (var i = msgs.length - 1; i >= 0; i--) {
                  if (msgs[i].textContent.indexOf(realName) !== -1) {
                    msgs[i].textContent = 'You\'re now chatting with ' + data.alias + '.';
                    break;
                  }
                }
              }
            })
            .catch(function () {});
          notifyHandoff(null, realName);
          const dump = buildTranscriptText();
          zw.sendMessage(dump);
        },
        onAgentMsg: function (content) {
          hideTyping();
          addMessage('agent', content);
        },
        onAgentTyping: function () {
          showTyping('agent is typing\u2026');
          if (agentTypingTimer) clearTimeout(agentTypingTimer);
          agentTypingTimer = setTimeout(hideTyping, 3000);
        },
        onClosed: function () {
          addMessage('system', 'The agent has ended the chat.', false);
          endAgentMode();
          showRating();
        },
        onError: function (state) {
          if (mode === MODE.AGENT) return;
          hideTyping();
          addMessage('system', 'No agents are available right now.', false);
          showLeaveForm();
        },
        onConnectionError: function () {
          if (mode === MODE.AGENT) return;
          hideTyping();
          addMessage('system', 'Could not reach live chat.', false);
          showLeaveForm();
        },
      });

      zw.connect();
    });
  }

  function endAgentMode() {
    mode = MODE.BOT;
    titleText.textContent = 'Tilesbay Assistant';
    agentDisplayName = 'Agent';
    if (statusDot) statusDot.classList.remove('online');
    var statusTextEl = panel.querySelector('.tbc-status-text');
    if (statusTextEl) statusTextEl.textContent = 'Ready to help';
    handoffRow.style.display = '';
    if (zw) { try { zw.close(); } catch (e) {} zw = null; }
  }

  // ---------- RATING ----------
  function showRating() {
    if (ratingShown || !hadAgentChat) return;
    ratingShown = true;

    const wrap = document.createElement('div');
    wrap.className = 'tbc-rating';
    wrap.innerHTML = `
      <div class="tbc-rating-q">How was your chat?</div>
      <div class="tbc-rating-btns">
        <button class="tbc-rate-up" aria-label="Thumbs up">👍</button>
        <button class="tbc-rate-down" aria-label="Thumbs down">👎</button>
      </div>
    `;
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    function sendRating(value) {
      wrap.innerHTML = '<div class="tbc-rating-q">Thanks for your feedback!</div>';
      fetch(RATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: chatSessionId, client_id: CLIENT_ID, rating: value }),
      }).catch(function () {});
    }

    wrap.querySelector('.tbc-rate-up').addEventListener('click', function () { sendRating('up'); });
    wrap.querySelector('.tbc-rate-down').addEventListener('click', function () { sendRating('down'); });
  }

  // ---------- LEAVE-A-MESSAGE ----------
  function showLeaveForm() {
    mode = MODE.LEAVE;
    inputRow.style.display = 'none';
    handoffRow.style.display = 'none';

    const form = document.createElement('div');
    form.className = 'tbc-leave-form';
    form.innerHTML = `
      <input class="tbc-lm-name" type="text" placeholder="Your name" />
      <input class="tbc-lm-email" type="email" placeholder="Your email" />
      <input class="tbc-lm-phone" type="text" placeholder="Phone (optional)" />
      <textarea class="tbc-lm-msg" placeholder="How can we help? We'll email you back."></textarea>
      <button class="tbc-lm-send">Send message</button>
    `;
    panel.appendChild(form);

    const btn = form.querySelector('.tbc-lm-send');
    btn.addEventListener('click', async function () {
      const name = form.querySelector('.tbc-lm-name').value.trim();
      const email = form.querySelector('.tbc-lm-email').value.trim();
      const phone = form.querySelector('.tbc-lm-phone').value.trim();
      const msg = form.querySelector('.tbc-lm-msg').value.trim();
      if (!email || !msg) {
        alert('Please enter your email and a message.');
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Sending\u2026';
      try {
        const res = await fetch(LEAVE_MSG_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name, email, phone, message: msg,
            transcript: buildTranscriptText(),
            url: window.location.href,
          }),
        });
        const data = await res.json();
        form.remove();
        if (data && data.ok) {
          addMessage('system', "Thanks \u2014 we've got your message and will email you back soon.", false);
        } else {
          var detail = data && (data.zammad_error || data.error) ? ' (' + (data.zammad_error || data.error) + ')' : '';
          addMessage('system', 'Sorry, we could not send your message. Please email csr@tilesbay.com.' + detail, false);
        }
      } catch (e) {
        form.remove();
        addMessage('system', 'Sorry, we could not send your message. Please email csr@tilesbay.com.', false);
      }
    });
  }

  // ---------- Unified send ----------
  function send() {
    const text = inputEl.value.trim();
    if (!text || isLoading) return;
    inputEl.value = '';
    addMessage('user', text);

    if (mode === MODE.AGENT) {
      if (zw) zw.sendMessage(text);
    } else if (mode === MODE.BOT) {
      history.push({ role: 'user', content: text });
      sendToBot(text);
    }
  }

  // ---------- Events ----------
  function openPanel() {
    panel.classList.add('open');
    if (transcript.length === 0 && mode === MODE.BOT) {
      addMessage('bot', brandGreeting);
    }
    inputEl.focus();
  }

  bubble.addEventListener('click', () => {
    if (panel.classList.contains('open')) {
      panel.classList.remove('open');
    } else {
      openPanel();
    }
  });

  closeBtn.addEventListener('click', () => {
    panel.classList.remove('open');
    if (hadAgentChat && mode === MODE.BOT && !ratingShown) {
      showRating();
    }
  });
  sendBtn.addEventListener('click', send);
  handoffBtn.addEventListener('click', beginHandoff);
  attachBtn.addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () {
    if (fileInput.files && fileInput.files[0]) {
      handleImageUpload(fileInput.files[0]);
      fileInput.value = '';
    }
  });
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  inputEl.addEventListener('input', () => {
    if (mode === MODE.AGENT && zw) zw.sendTyping();
  });

  // ---------- Auto-open after 8 page views ----------
  try {
    const PAGES_KEY = 'tbc_pageviews';
    const OPENED_KEY = 'tbc_autoopened';
    if (window.localStorage.getItem(OPENED_KEY) !== '1') {
      const count = parseInt(window.localStorage.getItem(PAGES_KEY) || '0', 10) + 1;
      window.localStorage.setItem(PAGES_KEY, String(count));
      if (count >= 8) {
        window.localStorage.setItem(OPENED_KEY, '1');
        setTimeout(openPanel, 1200);
      }
    }
  } catch (e) {}
})();