// zammad-ws.js — Isolated Zammad live-chat WebSocket client.
//
// This is the ONLY file that knows Zammad's chat WebSocket protocol.
// If Zammad changes the protocol in a future upgrade, this is the single
// file you touch — widget.js never speaks WebSocket directly.
//
// Protocol (observed in Zammad 7.0, confirmed via browser console):
//   Customer -> server:
//     { event: 'chat_status_customer', data: { session_id, url, chat_id } }
//     { event: 'chat_session_init',    data: { url, chat_id } }
//     { event: 'chat_session_typing',  data: { session_id } }
//     { event: 'chat_session_message', data: { content, id, session_id, chat_id } }
//     { event: 'chat_session_close',   data: { session_id } }
//     { event: 'ping' }
//   server -> customer:
//     { event: 'chat_status_customer',  data: { state: 'online'|'offline' } }
//     { event: 'chat_session_start',    data: { state:'ok', agent:{name,avatar}, session_id, chat_id } }
//     { event: 'chat_session_queue',    data: { position } }
//     { event: 'chat_session_typing',   data: { session_id } }
//     { event: 'chat_session_message',  data: { message:{content,created_at,...}, session_id } }
//     { event: 'chat_session_closed',   data: { session_id } }
//     { event: 'chat_error',            data: { state: 'chat_disabled', ... } }
//     { event: 'pong' }
//
// Usage:
//   const zw = new ZammadWS({
//     host: 'wss://crm.tilesbay.net/ws',
//     chatId: 1,
//     onStatus:   (state) => {},          // 'online' | 'offline'
//     onQueue:    (position) => {},
//     onStart:    (agent) => {},          // { name, avatar }
//     onAgentMsg: (content, createdAt) => {},
//     onAgentTyping: () => {},
//     onClosed:   () => {},
//     onError:    (state) => {},          // e.g. 'chat_disabled'
//     onConnectionError: () => {},
//   });
//   zw.connect();              // opens socket, asks for status
//   zw.startSession(url);      // begins a chat session (after status === online)
//   zw.sendMessage(text);
//   zw.sendTyping();
//   zw.close();

(function () {
  function ZammadWS(opts) {
    this.host = opts.host;
    this.chatId = opts.chatId != null ? opts.chatId : 1;

    this.onStatus = opts.onStatus || function () {};
    this.onQueue = opts.onQueue || function () {};
    this.onStart = opts.onStart || function () {};
    this.onAgentMsg = opts.onAgentMsg || function () {};
    this.onAgentTyping = opts.onAgentTyping || function () {};
    this.onClosed = opts.onClosed || function () {};
    this.onError = opts.onError || function () {};
    this.onConnectionError = opts.onConnectionError || function () {};

    this.ws = null;
    this.sessionId = null;
    this.messageCounter = 0;
    this.pingTimer = null;
    this.isOpen = false;
    this._wantSessionUrl = null; // if startSession called before socket open
    this.debug = opts.debug || false;
  }

  ZammadWS.prototype._log = function () {
    if (!this.debug) return;
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[zammad-ws]');
    console.log.apply(console, args);
  };

  ZammadWS.prototype._send = function (event, data) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this._log('SEND SKIPPED (socket not open):', event);
      return;
    }
    // Zammad's own client (chat.coffee `send`) always injects chat_id into data
    // and sends a SINGLE object {event, data} — NOT an array. Sending an array
    // here makes Zammad silently ignore the message.
    data = data || {};
    if (data.chat_id == null) data.chat_id = this.chatId;
    this._log('-> SEND', event, data);
    this.ws.send(JSON.stringify({ event: event, data: data }));
  };

  ZammadWS.prototype.connect = function () {
    var self = this;
    this._log('connecting to', this.host);
    try {
      this.ws = new WebSocket(this.host);
    } catch (e) {
      this._log('WebSocket constructor threw:', e);
      this.onConnectionError(e);
      return;
    }

    this.ws.onopen = function () {
      self.isOpen = true;
      self._log('socket OPEN');
      // restore persisted session id (Zammad uses sessionStorage)
      try {
        var saved = window.sessionStorage.getItem('tbc_zammad_session');
        if (saved) self.sessionId = saved;
      } catch (e) {}
      // Ask Zammad whether any agent is online for this chat topic
      self._send('chat_status_customer', { session_id: self.sessionId, url: window.location.href });
      // Heartbeat: Zammad pings after each pong (see chat.coffee Io.ping)
      self._ping();
      // If startSession was requested before the socket opened, do it now
      if (self._wantSessionUrl) {
        var u = self._wantSessionUrl;
        self._wantSessionUrl = null;
        self.startSession(u);
      }
    };

    this.ws.onmessage = function (e) {
      var pipe;
      try {
        pipe = JSON.parse(e.data);
      } catch (err) {
        self._log('non-JSON message ignored:', e.data);
        return; // ignore malformed
      }
      if (!Array.isArray(pipe)) pipe = [pipe];
      pipe.forEach(function (msg) {
        self._log('<- RECV', msg.event, msg.data || {});
        self._handle(msg.event, msg.data || {});
      });
    };

    this.ws.onclose = function (ev) {
      self.isOpen = false;
      self._log('socket CLOSED', ev && ev.code, ev && ev.reason);
      if (self.pingTimer) {
        clearInterval(self.pingTimer);
        self.pingTimer = null;
      }
    };

    this.ws.onerror = function (err) {
      self.onConnectionError(err);
    };
  };

  ZammadWS.prototype._ping = function () {
    var self = this;
    if (this.pingTimer) clearTimeout(this.pingTimer);
    this.pingTimer = setTimeout(function () {
      self._send('ping');
    }, 29000);
  };

  ZammadWS.prototype._handle = function (event, data) {
    switch (event) {
      case 'chat_status_customer':
        // { state: 'online' | 'offline' }
        this.onStatus(data.state);
        break;
      case 'chat_session_start':
        // agent accepted; capture session id + agent info
        if (data.session_id) {
          this.sessionId = data.session_id;
          try { window.sessionStorage.setItem('tbc_zammad_session', data.session_id); } catch (e) {}
        }
        this.onStart(data.agent || { name: 'Agent', avatar: null });
        break;
      case 'chat_session_queue':
        this.onQueue(typeof data.position === 'number' ? data.position : null);
        break;
      case 'chat_session_typing':
        this.onAgentTyping();
        break;
      case 'chat_session_message':
        // Only surface messages that came FROM the agent.
        // Our own messages echo back with self_written:true — skip those.
        if (data.self_written) break;
        var m = data.message || {};
        this.onAgentMsg(m.content || '', m.created_at || null);
        break;
      case 'chat_session_closed':
        this.onClosed();
        break;
      case 'chat_error':
        this.onError(data.state || 'error');
        break;
      case 'pong':
        this._ping();
        break;
      default:
        // unknown event — ignore
        break;
    }
  };

  // Begin a chat session. Call only after onStatus reported 'online'.
  ZammadWS.prototype.startSession = function (url) {
    if (!this.isOpen) {
      // defer until socket opens
      this._wantSessionUrl = url || window.location.href;
      return;
    }
    this._send('chat_session_init', { url: url || window.location.href, chat_id: this.chatId });
  };

  ZammadWS.prototype.sendMessage = function (text) {
    this.messageCounter += 1;
    this._send('chat_session_message', {
      content: text,
      id: this.messageCounter,
      session_id: this.sessionId,
      chat_id: this.chatId,
    });
  };

  ZammadWS.prototype.sendTyping = function () {
    this._send('chat_session_typing', { session_id: this.sessionId });
  };

  ZammadWS.prototype.close = function () {
    if (this.sessionId) {
      this._send('chat_session_close', { session_id: this.sessionId });
    }
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
    }
  };

  // Expose globally so widget.js can use it
  window.ZammadWS = ZammadWS;
})();