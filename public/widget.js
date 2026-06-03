// Tilesbay chatbot widget - vanilla JS, no dependencies.
// Drop into the storefront with: <script src="https://your-backend.vercel.app/widget.js" async></script>
// Or paste into a CMS Static Block.

(function () {
  // BACKEND_URL is auto-derived from wherever this script was loaded from.
  // Local dev: served from http://localhost:3000/widget.js -> backend = http://localhost:3000/api/chat
  // Production: served from https://your-backend.vercel.app/widget.js -> backend = https://your-backend.vercel.app/api/chat
  const scriptEl = document.currentScript || (function () {
    const all = document.getElementsByTagName('script');
    return all[all.length - 1];
  })();
  const scriptUrl = new URL(scriptEl.src, window.location.href);
  const BACKEND_URL = `${scriptUrl.origin}/api/chat`;

  // ---------- Styles ----------
  const css = `
    .tbc-bubble {
      position: fixed; bottom: 24px; right: 24px; z-index: 9999;
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
      position: fixed; bottom: 96px; right: 24px; z-index: 9999;
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
    .tbc-close { cursor: pointer; background: none; border: none; color: white; font-size: 20px; }
    .tbc-messages {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 10px;
    }
    .tbc-msg { padding: 10px 14px; border-radius: 14px; max-width: 85%; line-height: 1.4; font-size: 14px; }
    .tbc-msg.user { align-self: flex-end; background: #1a1a1a; color: white; border-bottom-right-radius: 4px; }
    .tbc-msg.bot { align-self: flex-start; background: #f1f1f1; color: #1a1a1a; border-bottom-left-radius: 4px; }
    .tbc-msg.bot a { color: #1a1a1a; text-decoration: underline; }
    .tbc-typing { align-self: flex-start; color: #888; font-size: 13px; font-style: italic; padding: 0 14px; }
    .tbc-input-row {
      display: flex; gap: 8px; padding: 12px; border-top: 1px solid #eee;
    }
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
      <span>Tilesbay Assistant</span>
      <button class="tbc-close" aria-label="Close">×</button>
    </div>
    <div class="tbc-messages"></div>
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

  // ---------- State ----------
  const history = []; // [{role: 'user'|'assistant', content: string}]
  let isLoading = false;

  function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = `tbc-msg ${role === 'user' ? 'user' : 'bot'}`;
    // Render basic markdown-ish: turn URLs into links, preserve line breaks
    const html = text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/\n/g, '<br>');
    div.innerHTML = html;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'tbc-typing';
    div.id = 'tbc-typing-indicator';
    div.textContent = 'typing...';
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  function hideTyping() {
    const el = document.getElementById('tbc-typing-indicator');
    if (el) el.remove();
  }

  async function send() {
    const text = inputEl.value.trim();
    if (!text || isLoading) return;

    isLoading = true;
    sendBtn.disabled = true;
    inputEl.value = '';

    addMessage('user', text);
    history.push({ role: 'user', content: text });
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
        addMessage('bot', data.reply);
        // Store assistant reply as plain text for next-turn context
        history.push({ role: 'assistant', content: data.reply });
      }
    } catch (err) {
      hideTyping();
      addMessage('bot', `Connection error: ${err.message}`);
    } finally {
      isLoading = false;
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  // ---------- Events ----------
  bubble.addEventListener('click', () => {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) {
      if (history.length === 0) {
        addMessage('bot', "Hi! I can help you find the right tile or calculate how much you need. What are you working on?");
      }
      inputEl.focus();
    }
  });
  closeBtn.addEventListener('click', () => panel.classList.remove('open'));
  sendBtn.addEventListener('click', send);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
})();
