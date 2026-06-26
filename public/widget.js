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

(function () {
  // ---- Resolve backend + zammad host from this script's own URL ----
  const scriptEl = document.currentScript || (function () {
    const all = document.getElementsByTagName('script');
    return all[all.length - 1];
  })();
  const scriptUrl = new URL(scriptEl.src, window.location.href);
  const BACKEND_ORIGIN = scriptUrl.origin;          // e.g. https://chat.tilesbay.net
  const BACKEND_URL = `${BACKEND_ORIGIN}/api/chat`;
  const LEAVE_MSG_URL = `${BACKEND_ORIGIN}/api/leave-message`;
  const RATE_URL = `${BACKEND_ORIGIN}/api/rate`;
  const CHAT_TICKET_URL = `${BACKEND_ORIGIN}/api/chat-ticket`;
  const UPLOAD_URL = `${BACKEND_ORIGIN}/api/upload`;
  const ALIAS_URL = `${BACKEND_ORIGIN}/api/agent-alias`;

  // Stable id for THIS conversation
  const CLIENT_ID = 'tbc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);

  // ---------- Visitor tracking ----------
  // Track pages visited across the session (persists in sessionStorage)
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

  // Zammad host can be overridden via data-zammad attr on the script tag;
  // defaults to the CRM behind the same root domain.
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

    .tbc-bubble {
      position: fixed; bottom: 24px; right: 24px; z-index: 99999;
      width: 64px; height: 64px; border-radius: 50%;
      background: linear-gradient(145deg, #1a1a1a, #0a0a0a);
      color: white;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease;
      animation: tbc-float 3s ease-in-out infinite;
    }
    @keyframes tbc-float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }
    .tbc-bubble::before {
      content: ''; position: absolute; inset: -4px; border-radius: 50%;
      background: conic-gradient(from 0deg, #e0322c, transparent 60%, #e0322c);
      opacity: 0; transition: opacity 0.35s ease; z-index: -1;
      animation: tbc-ring-spin 3s linear infinite paused;
    }
    @keyframes tbc-ring-spin { to { transform: rotate(360deg); } }
    .tbc-bubble:hover {
      transform: translateY(-4px) scale(1.08);
      box-shadow: 0 16px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1);
      animation: none;
    }
    .tbc-bubble:hover::before { opacity: 0.6; animation-play-state: running; }
    .tbc-bubble svg { width: 28px; height: 28px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2)); }

    .tbc-panel {
      position: fixed; bottom: 102px; right: 24px; z-index: 99999;
      width: 400px; max-width: calc(100vw - 32px);
      height: 620px; max-height: calc(100vh - 130px);
      background: rgba(255,255,255,0.92);
      backdrop-filter: blur(20px) saturate(1.4);
      -webkit-backdrop-filter: blur(20px) saturate(1.4);
      border-radius: 28px;
      border: 1px solid rgba(255,255,255,0.6);
      box-shadow: 0 24px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.03), 0 2px 8px rgba(0,0,0,0.06);
      display: none; flex-direction: column;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      overflow: hidden;
      animation: tbc-panelIn 0.35s cubic-bezier(0.22,1,0.36,1);
    }
    @keyframes tbc-panelIn {
      from { opacity: 0; transform: translateY(20px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .tbc-panel.open { display: flex; }

    .tbc-header {
      padding: 22px 24px 20px; color: white; position: relative;
      background: linear-gradient(135deg, #111 0%, #1a1a1a 50%, #222 100%);
      display: flex; justify-content: space-between; align-items: center;
      border-radius: 28px 28px 0 0;
      overflow: hidden;
    }
    .tbc-header::before {
      content: ''; position: absolute; top: -40%; right: -20%;
      width: 180px; height: 180px; border-radius: 50%;
      background: radial-gradient(circle, rgba(224,50,44,0.15) 0%, transparent 70%);
    }
    .tbc-header::after {
      content: ''; position: absolute; left: 0; right: 0; bottom: 0;
      height: 3px;
      background: linear-gradient(90deg, #e0322c 0%, rgba(224,50,44,0.3) 60%, transparent 100%);
    }
    .tbc-header-title {
      display: flex; align-items: center; gap: 14px;
      font-weight: 700; font-size: 16px; letter-spacing: -0.02em;
      position: relative; z-index: 1;
    }
    .tbc-close {
      cursor: pointer; border: none; position: relative; z-index: 1;
      background: transparent;
      color: rgba(255,255,255,0.6); font-size: 22px; line-height: 1;
      width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
      transition: color 0.2s, transform 0.2s;
    }
    .tbc-close:hover { color: white; transform: rotate(90deg); }

    .tbc-messages {
      flex: 1; overflow-y: auto; padding: 22px 18px 14px;
      display: flex; flex-direction: column; gap: 18px;
      background: linear-gradient(180deg, rgba(250,250,250,0.6) 0%, rgba(245,245,245,0.4) 100%);
    }
    .tbc-messages::-webkit-scrollbar { width: 4px; }
    .tbc-messages::-webkit-scrollbar-track { background: transparent; }
    .tbc-messages::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 4px; }

    .tbc-row {
      display: flex; gap: 10px; align-items: flex-start;
      animation: tbc-msgIn 0.35s cubic-bezier(0.22,1,0.36,1);
      max-width: 92%;
    }
    .tbc-row.user { align-self: flex-end; flex-direction: row-reverse; max-width: 82%; }
    .tbc-row.bot, .tbc-row.agent { align-self: flex-start; }
    @keyframes tbc-msgIn {
      from { opacity: 0; transform: translateY(12px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .tbc-row-avatar {
      width: 30px; height: 30px; border-radius: 10px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 11px; margin-top: 20px;
    }
    .tbc-row.bot .tbc-row-avatar, .tbc-row.agent .tbc-row-avatar {
      background: linear-gradient(135deg, #e0322c, #c0271f); color: white;
      box-shadow: 0 3px 8px rgba(224,50,44,0.25);
    }
    .tbc-row.user .tbc-row-avatar {
      background: linear-gradient(135deg, #1a1a1a, #111); color: white;
      box-shadow: 0 3px 8px rgba(0,0,0,0.15);
    }
    .tbc-row-main { display: flex; flex-direction: column; min-width: 0; }
    .tbc-row-label {
      font-size: 11px; font-weight: 600; color: #999; margin: 0 4px 5px;
      letter-spacing: 0.02em;
    }
    .tbc-row.user .tbc-row-label { text-align: right; }
    .tbc-row-time { color: #bbb; font-weight: 500; }

    .tbc-msg {
      padding: 13px 17px; line-height: 1.55; font-size: 13.5px; word-wrap: break-word;
    }
    .tbc-msg.user {
      background: linear-gradient(135deg, #1a1a1a, #111);
      color: white; border-radius: 20px 20px 6px 20px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.1);
    }
    .tbc-msg.bot {
      background: rgba(255,255,255,0.85);
      backdrop-filter: blur(12px);
      color: #1a1a1a; border-radius: 20px 20px 20px 6px;
      border: 1px solid rgba(0,0,0,0.06);
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
    }
    .tbc-msg.agent {
      background: rgba(255,255,255,0.85);
      backdrop-filter: blur(12px);
      color: #1a1a1a; border-radius: 20px 20px 20px 6px;
      border: 1px solid rgba(0,0,0,0.06);
      border-left: 3px solid #e0322c;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
    }
    .tbc-msg.system {
      align-self: center;
      background: rgba(0,0,0,0.04);
      backdrop-filter: blur(8px);
      color: #888; font-size: 11.5px; text-align: center; max-width: 85%;
      padding: 7px 16px; font-weight: 500; border-radius: 20px;
      letter-spacing: 0.01em;
    }
    .tbc-msg.bot a, .tbc-msg.agent a { color: #e0322c; text-decoration: none; font-weight: 600; }
    .tbc-msg.bot a:hover, .tbc-msg.agent a:hover { text-decoration: underline; }

    .tbc-typing {
      align-self: flex-start; display: flex; gap: 5px; align-items: center;
      padding: 6px 18px; margin-top: -10px; margin-left: 40px;
    }
    .tbc-typing span {
      width: 7px; height: 7px; border-radius: 50%; background: #ccc;
      animation: tbc-bounce 1.3s infinite ease-in-out;
    }
    .tbc-typing span:nth-child(2) { animation-delay: 0.16s; }
    .tbc-typing span:nth-child(3) { animation-delay: 0.32s; }
    @keyframes tbc-bounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-6px); opacity: 1; }
    }

    .tbc-input-row {
      display: flex; gap: 10px; padding: 16px 18px; align-items: center;
      background: rgba(255,255,255,0.6);
      backdrop-filter: blur(16px);
      border-top: 1px solid rgba(0,0,0,0.04);
    }
    .tbc-input {
      flex: 1; padding: 12px 18px; border: none;
      background: rgba(245,245,245,0.6);
      backdrop-filter: blur(10px);
      border-radius: 50px; font-size: 13.5px; outline: none;
      font-family: inherit; color: #1a1a1a;
      transition: background 0.2s, box-shadow 0.2s;
    }
    .tbc-input:focus {
      background: rgba(255,255,255,0.85);
      box-shadow: 0 0 0 3px rgba(224,50,44,0.06);
    }
    .tbc-input::placeholder { color: #aaa; }
    .tbc-send {
      padding: 0; width: 46px; height: 46px; flex-shrink: 0;
      background: linear-gradient(135deg, #e0322c 0%, #c4271f 100%);
      color: white; border: none; border-radius: 50%; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 16px rgba(224,50,44,0.3);
      transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s;
    }
    .tbc-send:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 20px rgba(224,50,44,0.4);
    }
    .tbc-send:active { transform: scale(0.92); }
    .tbc-send:disabled { opacity: 0.3; cursor: not-allowed; transform: none; box-shadow: none; }
    .tbc-send svg { width: 20px; height: 20px; }

    .tbc-attach {
      background: none; border: none; cursor: pointer; padding: 4px;
      display: flex; align-items: center; color: #aaa; flex-shrink: 0;
      transition: color 0.2s, transform 0.2s;
    }
    .tbc-attach:hover { color: #e0322c; transform: scale(1.15); }
    .tbc-attach svg { width: 16px; height: 16px; }
    .tbc-img-preview { max-width: 180px; border-radius: 16px; margin-top: 4px; }

    .tbc-handoff-row { padding: 0 18px 14px; }
    .tbc-handoff-btn {
      width: 100%; padding: 12px;
      background: rgba(255,255,255,0.7);
      backdrop-filter: blur(8px);
      color: #111; border: 1.5px solid rgba(0,0,0,0.08);
      border-radius: 50px; cursor: pointer;
      font-weight: 600; font-size: 13px; font-family: inherit;
      transition: all 0.25s cubic-bezier(0.22,1,0.36,1);
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .tbc-handoff-btn::before {
      content: ''; width: 7px; height: 7px; border-radius: 50%;
      background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,0.4);
    }
    .tbc-handoff-btn:hover {
      background: #111; color: white; border-color: #111;
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }
    .tbc-handoff-btn:disabled { opacity: 0.25; cursor: not-allowed; transform: none; }

    .tbc-leave-form {
      padding: 16px 18px;
      border-top: 1px solid rgba(0,0,0,0.04);
      background: rgba(255,255,255,0.6);
      backdrop-filter: blur(12px);
      display: flex; flex-direction: column; gap: 10px;
    }
    .tbc-leave-form input, .tbc-leave-form textarea {
      padding: 12px 18px;
      border: 1.5px solid rgba(0,0,0,0.06);
      border-radius: 50px; font-size: 13px; font-family: inherit; outline: none;
      background: rgba(250,250,250,0.7);
      backdrop-filter: blur(8px);
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .tbc-leave-form input:focus, .tbc-leave-form textarea:focus {
      border-color: rgba(0,0,0,0.15);
      box-shadow: 0 0 0 3px rgba(224,50,44,0.06);
    }
    .tbc-leave-form textarea { resize: vertical; min-height: 64px; border-radius: 20px; }
    .tbc-leave-form button {
      padding: 12px;
      background: linear-gradient(135deg, #e0322c, #c4271f);
      color: white; border: none; border-radius: 50px;
      cursor: pointer; font-weight: 600; font-size: 14px;
      box-shadow: 0 4px 12px rgba(224,50,44,0.25);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .tbc-leave-form button:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(224,50,44,0.35);
    }

    .tbc-rating { align-self: center; text-align: center; padding: 18px 8px; }
    .tbc-rating-q { color: #555; font-size: 13px; margin-bottom: 14px; font-weight: 600; }
    .tbc-rating-btns { display: flex; gap: 14px; justify-content: center; }
    .tbc-rating-btns button {
      font-size: 26px;
      background: rgba(255,255,255,0.7);
      backdrop-filter: blur(8px);
      border: 1.5px solid rgba(0,0,0,0.06);
      border-radius: 18px;
      width: 62px; height: 54px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.25s cubic-bezier(0.22,1,0.36,1);
    }
    .tbc-rating-btns button:hover {
      transform: scale(1.12) translateY(-3px);
      border-color: #e0322c;
      box-shadow: 0 6px 20px rgba(224,50,44,0.15);
    }

    .tbc-buttons {
      display: flex; flex-direction: column; gap: 8px;
      padding: 4px 18px 12px; align-self: flex-start; max-width: 90%;
      margin-left: 40px;
    }
    .tbc-chip {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 18px;
      background: rgba(255,255,255,0.75);
      backdrop-filter: blur(10px);
      border: 1.5px solid rgba(0,0,0,0.05);
      border-radius: 18px; cursor: pointer; font-size: 13px; font-family: inherit;
      color: #1a1a1a; font-weight: 500; text-align: left;
      box-shadow: 0 2px 8px rgba(0,0,0,0.03);
      transition: all 0.25s cubic-bezier(0.22,1,0.36,1);
    }
    .tbc-chip::before {
      content: '\\21B3'; color: #e0322c; font-weight: 700; font-size: 15px;
      flex-shrink: 0;
    }
    .tbc-chip:hover {
      background: rgba(255,255,255,0.95);
      border-color: rgba(224,50,44,0.2);
      transform: translateX(4px) scale(1.01);
      box-shadow: 0 4px 16px rgba(224,50,44,0.08);
    }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ---------- DOM ----------
  const bubble = document.createElement('div');
  bubble.className = 'tbc-bubble';
  bubble.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`;
  document.body.appendChild(bubble);

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
      <button class="tbc-handoff-btn">Talk to a human</button>
    </div>
    <div class="tbc-input-row">
      <input class="tbc-file-input" type="file" accept="image/jpeg" style="display:none;" />
      <button class="tbc-attach" aria-label="Attach photo" title="Send a photo (JPEG)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg></button>
      <input class="tbc-input" type="text" placeholder="Ask about tile, sizing, or your project..." />
      <button class="tbc-send"><svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94l18.04-8.01a.75.75 0 000-1.36L3.478 2.405z"/></svg></button>
    </div>
  `;
  document.body.appendChild(panel);

  const messagesEl = panel.querySelector('.tbc-messages');
  const inputEl = panel.querySelector('.tbc-input');
  const sendBtn = panel.querySelector('.tbc-send');
  const closeBtn = panel.querySelector('.tbc-close');
  const handoffRow = panel.querySelector('.tbc-handoff-row');
  const handoffBtn = panel.querySelector('.tbc-handoff-btn');
  const inputRow = panel.querySelector('.tbc-input-row');
  const attachBtn = panel.querySelector('.tbc-attach');
  const fileInput = panel.querySelector('.tbc-file-input');
  const titleText = panel.querySelector('.tbc-title-text');
  const statusDot = panel.querySelector('.tbc-status-dot'); // may be null

  // ---------- State ----------
  const MODE = { BOT: 'bot', CONNECTING: 'connecting', AGENT: 'agent', LEAVE: 'leave' };
  let mode = MODE.BOT;
  let hadAgentChat = false;     // did this conversation reach a live agent?
  let chatSessionId = null;     // Zammad chat session id (for rating)
  let ratingShown = false;      // guard so rating UI shows once
  const history = [];          // bot conversation [{role, content}]
  const transcript = [];       // full visible transcript [{who, text}] for handoff
  let isLoading = false;
  let zw = null;               // ZammadWS instance
  let agentTypingTimer = null;

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

  // Display name shown next to each message
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

    const bubble = document.createElement('div');
    bubble.className = `tbc-msg ${kind}`;
    bubble.innerHTML = linkify(text);

    main.appendChild(label);
    main.appendChild(bubble);
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
    const el = document.getElementById('tbc-typing-indicator');
    if (el) el.remove();
  }

  // Convert/strip basic markdown so it doesn't show literal ** _ etc.
  function stripMarkdown(s) {
    if (!s) return s;
    return s
      .replace(/\*\*(.+?)\*\*/g, '$1')   // **bold** -> bold
      .replace(/(^|\s)\*(.+?)\*(?=\s|$)/g, '$1$2') // *italic* -> italic
      .replace(/(^|\s)_(.+?)_(?=\s|$)/g, '$1$2')   // _italic_ -> italic
      .replace(/`([^`]+)`/g, '$1')        // `code` -> code
      .replace(/^#{1,6}\s+/gm, '')        // # headings
      .replace(/^\s*[-*]\s+/gm, '• ');    // - bullets -> •
  }

  function buildTranscriptText() {
    if (transcript.length === 0) return '(no prior conversation)';
    // Zammad chat renders HTML, and plain \n get collapsed. Use <br> so the
    // agent sees each turn on its own line.
    var lines = transcript.map(function (t) {
      return '<b>' + t.who + ':</b> ' + stripMarkdown(t.text);
    });
    return 'Chatbot conversation before handoff:<br><br>' + lines.join('<br><br>');
  }

  // ---------- INTERACTIVE BUTTONS ----------
  // Parse [[BUTTONS: opt1 | opt2 | opt3]] from bot reply.
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
  // Send each bot exchange to the backend so a Zammad ticket is created (on the
  // first message) and appended (subsequent messages). Fire-and-forget.
  let capturedContact = { name: null, email: null };
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
          url: window.location.href,
          deviceType: deviceType,
          pageHistory: pageHistory,
        }),
      }).catch(function () {});
    } catch (e) {}
  }

  // On handoff, upgrade the existing ticket (group + owner = agent).
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
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      hideTyping();

      if (data.error) {
        addMessage('bot', `Sorry, something went wrong: ${data.error}`);
      } else {
        let reply = data.reply || '';
        // Bot-triggered handoff: reply contains [[HANDOFF]]
        const wantsHandoff = /\[\[HANDOFF\]\]/i.test(reply);
        reply = reply.replace(/\[\[HANDOFF\]\]/gi, '').trim();
        if (reply) {
          // Parse interactive buttons if present
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
          // Show real name initially, then swap to alias if one exists
          titleText.textContent = realName;
          agentDisplayName = realName;
          if (statusDot) statusDot.classList.add('online');
          var statusTextEl = panel.querySelector('.tbc-status-text');
          if (statusTextEl) statusTextEl.textContent = 'Live agent';
          addMessage('system', 'You\'re now chatting with ' + realName + '.', false);
          // Look up alias asynchronously
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
          // Upgrade the existing bot ticket: set owner to this agent.
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

  // ---------- RATING (after a live-agent chat) ----------
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
      // optimistic UI: replace with a thank-you immediately
      wrap.innerHTML = '<div class="tbc-rating-q">Thanks for your feedback!</div>';
      fetch(RATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: chatSessionId, client_id: CLIENT_ID, rating: value }),
      }).catch(function () { /* non-fatal */ });
    }

    wrap.querySelector('.tbc-rate-up').addEventListener('click', function () { sendRating('up'); });
    wrap.querySelector('.tbc-rate-down').addEventListener('click', function () { sendRating('down'); });
  }

  // ---------- LEAVE-A-MESSAGE (offline fallback) ----------
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
      addMessage('bot', "Hi! I can help you find the right tile or calculate how much you need. What are you working on?");
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
    // If they spoke to an agent and the chat is over, prompt for a rating.
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

  // ---------- Auto-open after 8 page views (persistent across visits) ----------
  // Counts page views in localStorage. At the 8th view, auto-opens the panel
  // ONCE. After that it never auto-opens again (flag persisted), it just sits
  // as the bubble in the corner.
  try {
    const PAGES_KEY = 'tbc_pageviews';
    const OPENED_KEY = 'tbc_autoopened';
    if (window.localStorage.getItem(OPENED_KEY) !== '1') {
      const count = parseInt(window.localStorage.getItem(PAGES_KEY) || '0', 10) + 1;
      window.localStorage.setItem(PAGES_KEY, String(count));
      if (count >= 8) {
        window.localStorage.setItem(OPENED_KEY, '1');
        // small delay so it doesn't fight with page load
        setTimeout(openPanel, 1200);
      }
    }
  } catch (e) {
    // localStorage unavailable (private mode etc.) — skip auto-open silently
  }
})();