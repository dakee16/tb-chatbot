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
    .tbc-bubble {
      position: fixed; bottom: 24px; right: 24px; z-index: 99999;
      width: 56px; height: 56px; border-radius: 50%;
      background: #1a1a1a; color: white;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      transition: transform 0.15s;
    }
    .tbc-bubble:hover { transform: scale(1.05); }
    .tbc-bubble svg { width: 26px; height: 26px; }
    .tbc-panel {
      position: fixed; bottom: 96px; right: 24px; z-index: 99999;
      width: 380px; max-width: calc(100vw - 48px);
      height: 560px; max-height: calc(100vh - 120px);
      background: white; border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      display: none; flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      overflow: hidden;
    }
    .tbc-panel.open { display: flex; }
    .tbc-header {
      padding: 16px; background: #1a1a1a; color: white;
      font-weight: 600; display: flex; justify-content: space-between; align-items: center;
    }
    .tbc-header-title { display: flex; align-items: center; gap: 8px; }
    .tbc-status-dot { width: 8px; height: 8px; border-radius: 50%; background: #888; }
    .tbc-status-dot.online { background: #2ecc71; }
    .tbc-close { cursor: pointer; background: none; border: none; color: white; font-size: 20px; line-height: 1; }
    .tbc-messages {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 10px;
    }
    .tbc-msg { padding: 10px 14px; border-radius: 14px; max-width: 85%; line-height: 1.4; font-size: 14px; word-wrap: break-word; }
    .tbc-msg.user { align-self: flex-end; background: #1a1a1a; color: white; border-bottom-right-radius: 4px; }
    .tbc-msg.bot { align-self: flex-start; background: #f1f1f1; color: #1a1a1a; border-bottom-left-radius: 4px; }
    .tbc-msg.agent { align-self: flex-start; background: #e7f0ff; color: #1a1a1a; border-bottom-left-radius: 4px; }
    .tbc-msg.system { align-self: center; background: transparent; color: #999; font-size: 12px; text-align: center; max-width: 100%; padding: 4px 8px; }
    .tbc-msg.bot a, .tbc-msg.agent a { color: #1a4fa0; text-decoration: underline; }
    .tbc-typing { align-self: flex-start; color: #888; font-size: 13px; font-style: italic; padding: 0 14px; }
    .tbc-input-row { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #eee; }
    .tbc-input {
      flex: 1; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px;
      font-size: 14px; outline: none; font-family: inherit;
    }
    .tbc-input:focus { border-color: #1a1a1a; }
    .tbc-send {
      padding: 10px 16px; background: #1a1a1a; color: white;
      border: none; border-radius: 8px; cursor: pointer; font-weight: 600;
    }
    .tbc-send:disabled { opacity: 0.5; cursor: not-allowed; }
    .tbc-handoff-row { padding: 0 12px 12px; }
    .tbc-handoff-btn {
      width: 100%; padding: 9px; background: white; color: #1a1a1a;
      border: 1px solid #1a1a1a; border-radius: 8px; cursor: pointer;
      font-weight: 600; font-size: 13px; font-family: inherit;
    }
    .tbc-handoff-btn:hover { background: #1a1a1a; color: white; }
    .tbc-handoff-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .tbc-leave-form { padding: 12px 16px; border-top: 1px solid #eee; display: flex; flex-direction: column; gap: 8px; }
    .tbc-leave-form input, .tbc-leave-form textarea {
      padding: 9px 11px; border: 1px solid #ddd; border-radius: 8px; font-size: 13px; font-family: inherit; outline: none;
    }
    .tbc-leave-form textarea { resize: vertical; min-height: 60px; }
    .tbc-leave-form button {
      padding: 10px; background: #1a1a1a; color: white; border: none; border-radius: 8px;
      cursor: pointer; font-weight: 600; font-size: 14px;
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
      <span class="tbc-header-title"><span class="tbc-status-dot"></span><span class="tbc-title-text">Tilesbay Assistant</span></span>
      <button class="tbc-close" aria-label="Close">&times;</button>
    </div>
    <div class="tbc-messages"></div>
    <div class="tbc-handoff-row">
      <button class="tbc-handoff-btn">Talk to a human</button>
    </div>
    <div class="tbc-input-row">
      <input class="tbc-input" type="text" placeholder="Ask about tile, sizing, or your project..." />
      <button class="tbc-send">Send</button>
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
  const titleText = panel.querySelector('.tbc-title-text');
  const statusDot = panel.querySelector('.tbc-status-dot');

  // ---------- State ----------
  const MODE = { BOT: 'bot', CONNECTING: 'connecting', AGENT: 'agent', LEAVE: 'leave' };
  let mode = MODE.BOT;
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

  function addMessage(kind, text, recordInTranscript) {
    const div = document.createElement('div');
    div.className = `tbc-msg ${kind}`;
    if (kind === 'system') {
      div.textContent = text;
    } else {
      div.innerHTML = linkify(text);
    }
    messagesEl.appendChild(div);
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
    div.textContent = label || 'typing...';
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
    // Zammad chat renders HTML and collapses plain \n, so use <br> for line breaks.
    var lines = transcript.map(function (t) {
      return '<b>' + t.who + ':</b> ' + stripMarkdown(t.text);
    });
    return 'Chatbot conversation before handoff:<br><br>' + lines.join('<br><br>');
  }

  // ---------- BOT MODE ----------
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
          var clean = stripMarkdown(reply);
          addMessage('bot', clean);
          history.push({ role: 'assistant', content: reply });
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
        debug: false,
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
          titleText.textContent = agent && agent.name ? agent.name : 'Live Agent';
          statusDot.classList.add('online');
          addMessage('system', `You're now chatting with ${agent && agent.name ? agent.name : 'a team member'}.`, false);
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
    statusDot.classList.remove('online');
    handoffRow.style.display = '';
    if (zw) { try { zw.close(); } catch (e) {} zw = null; }
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
          addMessage('system', 'Sorry, we could not send your message. Please email csr@tilesbay.com.', false);
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
  bubble.addEventListener('click', () => {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) {
      if (transcript.length === 0 && mode === MODE.BOT) {
        addMessage('bot', "Hi! I can help you find the right tile or calculate how much you need. What are you working on?");
      }
      inputEl.focus();
    }
  });
  closeBtn.addEventListener('click', () => panel.classList.remove('open'));
  sendBtn.addEventListener('click', send);
  handoffBtn.addEventListener('click', beginHandoff);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  inputEl.addEventListener('input', () => {
    if (mode === MODE.AGENT && zw) zw.sendTyping();
  });
})();