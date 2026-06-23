import { NextRequest, NextResponse } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const script = `
(function() {
  'use strict';

  if (window.__voicedeskLoaded) return;
  window.__voicedeskLoaded = true;

  var config = {};
  var widget = null;
  var fabEl = null;
  var ws = null;
  var localStream = null;
  var conversationId = null;
  var callStartTime = null;
  var pendingSaves = [];
  var muted = false;
  var waveInterval = null;
  var pulseAnimFrame = null;
  var APP_URL = '${appUrl}';
  var micContext = null;
  var playbackContext = null;
  var playbackNode = null;
  var socketOpen = false;
  var audioQueue = [];

  /* ─── Public API ─────────────────────────────────────── */
  window.VoiceDesk = {
    init: function(options) {
      config = options || {};
      if (!config.businessId) { console.error('[VoiceDesk] businessId is required'); return; }
      loadConfig()
        .then(function(cfg) {
          /* Detect mode: explicit config.mode > widget_type from DB > 'voice' */
          config._mode = config.mode || (cfg.widget && cfg.widget.widget_type) || 'voice';
          injectStyles(cfg); createFAB(cfg);
        })
        .catch(function() {
          var fallback = { widget: { primary_color: '#22c55e', position: 'bottom-right', widget_type: 'voice' }, business: { name: 'AI Receptionist' } };
          config._mode = config.mode || 'voice';
          injectStyles(fallback);
          createFAB(fallback);
        });
    }
  };

  /* ─── Config ─────────────────────────────────────────── */
  function loadConfig() {
    return fetch(APP_URL + '/api/widget/config?businessId=' + encodeURIComponent(config.businessId))
      .then(function(r) { return r.json(); });
  }

  /* ─── FAB ────────────────────────────────────────────── */
  function createFAB(cfg) {
    var color   = cfg.widget && cfg.widget.primary_color ? cfg.widget.primary_color : '#22c55e';
    var pos     = config.position || (cfg.widget && cfg.widget.position) || 'bottom-right';
    var isLeft  = pos === 'bottom-left';

    var wrap = document.createElement('div');
    wrap.id = 'voicedesk-fab-wrap';
    wrap.style.cssText = 'position:fixed;bottom:20px;' + (isLeft ? 'left:20px' : 'right:20px') + ';z-index:2147483646;';

    /* pulse rings */
    var ring1 = document.createElement('div');
    ring1.className = 'voicedesk-ring1';
    ring1.style.background = color;

    var ring2 = document.createElement('div');
    ring2.className = 'voicedesk-ring2';
    ring2.style.background = color;

    /* tooltip */
    var tip = document.createElement('div');
    tip.className = 'voicedesk-tooltip';
    tip.textContent = config._mode === 'chat' ? 'Chat with us' : 'Talk to AI';

    /* button */
    fabEl = document.createElement('button');
    fabEl.className = 'voicedesk-fab';
    fabEl.style.cssText = 'background:linear-gradient(135deg,' + color + ',' + color + 'cc);box-shadow:0 8px 24px ' + color + '55,0 2px 8px rgba(0,0,0,.4);';
    if (config._mode === 'chat') {
      fabEl.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
    } else {
      fabEl.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.71 13 19.79 19.79 0 011.65 4.4a2 2 0 011.99-2.19h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.91 9.91a16 16 0 006.29 6.29l1.77-1.77a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>';
    }
    fabEl.addEventListener('click', function() { openWidget(cfg, color, pos); });

    wrap.appendChild(ring1);
    wrap.appendChild(ring2);
    wrap.appendChild(tip);
    wrap.appendChild(fabEl);
    document.body.appendChild(wrap);
    animatePulse(ring1, ring2);
  }

  function animatePulse(r1, r2) {
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var t = ((ts - start) % 2200) / 2200;
      var t2 = ((ts - start + 440) % 2200) / 2200;
      r1.style.transform = 'scale(' + (1 + t * 0.5) + ')';
      r1.style.opacity = (0.25 * (1 - t));
      r2.style.transform = 'scale(' + (1 + t2 * 0.8) + ')';
      r2.style.opacity = (0.15 * (1 - t2));
      pulseAnimFrame = requestAnimationFrame(step);
    }
    pulseAnimFrame = requestAnimationFrame(step);
  }

  /* ─── Widget panel ───────────────────────────────────── */
  function openWidget(cfg, color, pos) {
    if (widget) return;
    if (pulseAnimFrame) { cancelAnimationFrame(pulseAnimFrame); pulseAnimFrame = null; }
    var wrap = document.getElementById('voicedesk-fab-wrap');
    if (wrap) wrap.style.display = 'none';

    var greeting = (cfg.widget && cfg.widget.greeting) || (cfg.agent && cfg.agent.greeting_message) || 'Talk to our AI receptionist — ask about services, hours, or book an appointment.';
    var name     = (cfg.business && cfg.business.name) || 'AI Receptionist';
    var isLeft   = pos === 'bottom-left';

    widget = document.createElement('div');
    widget.className = 'voicedesk-widget';
    widget.style.cssText = (isLeft ? 'left:20px' : 'right:20px') + ';';

    if (config._mode === 'chat') {
      widget.innerHTML = buildChatHTML(name, color, greeting);
      document.body.appendChild(widget);
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          widget.style.opacity = '1';
          widget.style.transform = 'translateY(0) scale(1)';
        });
      });
      widget.querySelector('#voicedesk-close').addEventListener('click', closeWidget);
      initChatHandlers(color);
    } else {
      widget.innerHTML = buildWidgetHTML(name, color, greeting);
      document.body.appendChild(widget);
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          widget.style.opacity = '1';
          widget.style.transform = 'translateY(0) scale(1)';
        });
      });
      widget.querySelector('#voicedesk-close').addEventListener('click', closeWidget);
      widget.querySelector('#voicedesk-start-btn').addEventListener('click', startVoice);
      widget.querySelector('#voicedesk-mute-btn').addEventListener('click', toggleMute);
      widget.querySelector('#voicedesk-end-btn').addEventListener('click', function() { endVoice(); showIdle(); });
    }
  }

  function closeWidget() {
    endVoice();
    chatConversationId = null;
    chatHistory = [];
    chatSending = false;
    if (widget) {
      widget.style.opacity = '0';
      widget.style.transform = 'translateY(16px) scale(0.95)';
      setTimeout(function() {
        if (widget) { widget.remove(); widget = null; }
        var wrap = document.getElementById('voicedesk-fab-wrap');
        if (wrap) {
          wrap.style.display = '';
          animatePulse(wrap.querySelector('.voicedesk-ring1'), wrap.querySelector('.voicedesk-ring2'));
        }
      }, 220);
    }
  }

  function buildWidgetHTML(name, color, greeting) {
    var micSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
    var micOffSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/><path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
    var endSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07"/><path d="M13.32 10.68A19.5 19.5 0 005 4.71"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
    var sparkSvg = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    var msgSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';

    var waveBarHeights = [6, 10, 14, 10, 6];
    var waveBars = waveBarHeights.map(function(h, i) {
      return '<div class="voicedesk-wbar" data-h="' + h + '" style="height:3px;animation-delay:' + (i * 0.07) + 's;animation-duration:' + (0.55 + i * 0.08) + 's"></div>';
    }).join('');

    return (
      /* header */
      '<div class="voicedesk-header">' +
        '<div class="voicedesk-hbg" style="background:linear-gradient(135deg,' + color + '33 0%,transparent 60%)"></div>' +
        '<div class="voicedesk-header-left">' +
          '<div class="voicedesk-hicon" style="background:' + color + '22;border:1px solid ' + color + '44">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>' +
          '</div>' +
          '<div>' +
            '<div class="voicedesk-hname">' + escHtml(name) + '</div>' +
            '<div class="voicedesk-hsub">' +
              '<div class="voicedesk-hdot" style="background:' + color + '"></div>' +
              '<span id="voicedesk-status-text" style="color:' + color + '">AI Receptionist</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="voicedesk-header-right">' +
          '<div id="voicedesk-waveform" class="voicedesk-waveform" style="display:none">' + waveBars + '</div>' +
          '<button id="voicedesk-close" class="voicedesk-closebtn" title="Close">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>' +

      /* transcript */
      '<div id="voicedesk-transcript" class="voicedesk-transcript">' +
        '<div id="voicedesk-empty-state" class="voicedesk-empty-state">' +
          '<div class="voicedesk-empty-icon">' + msgSvg + '</div>' +
          '<span>Conversation will appear here</span>' +
        '</div>' +
      '</div>' +

      /* controls */
      '<div class="voicedesk-controls">' +
        '<div id="voicedesk-idle" class="voicedesk-idle">' +
          '<p class="voicedesk-greeting-text">' + escHtml(greeting) + '</p>' +
          '<div class="voicedesk-orb-wrap">' +
            '<button id="voicedesk-start-btn" class="voicedesk-orb" style="background:linear-gradient(135deg,' + color + ',' + color + 'bb);box-shadow:0 0 20px ' + color + '55,0 4px 16px rgba(0,0,0,.4)">' +
              micSvg +
            '</button>' +
            '<div class="voicedesk-tap-hint">Tap to start</div>' +
          '</div>' +
        '</div>' +

        '<div id="voicedesk-active" class="voicedesk-active-controls" style="display:none">' +
          '<div class="voicedesk-orb-wrap">' +
            '<div id="voicedesk-ring-outer" class="voicedesk-ring-outer" style="background:' + color + '12;display:none"></div>' +
            '<div id="voicedesk-ring-inner" class="voicedesk-ring-inner" style="background:' + color + '07;display:none"></div>' +
            '<div id="voicedesk-listen-ring" class="voicedesk-listen-ring" style="border-color:' + color + '44;display:none"></div>' +
            '<button id="voicedesk-mute-btn" class="voicedesk-orb voicedesk-orb-active" style="background:linear-gradient(135deg,' + color + ',' + color + 'bb);box-shadow:0 0 20px ' + color + '55,0 4px 16px rgba(0,0,0,.4)">' +
              micSvg +
            '</button>' +
          '</div>' +
          '<div class="voicedesk-status-row">' +
            '<div id="voicedesk-state-label" class="voicedesk-state-label" style="color:' + color + '">' +
              '<div class="voicedesk-sdot" style="background:' + color + '"></div>' +
              '<span id="voicedesk-state-text">Listening…</span>' +
            '</div>' +
            '<button id="voicedesk-end-btn" class="voicedesk-endbtn">' +
              endSvg + 'End' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* footer */
      '<div class="voicedesk-footer">' +
        sparkSvg + '<span>Powered by VoiceDesk</span>' +
      '</div>'
    );
  }

  /* ─── Chat widget HTML ───────────────────────────────── */
  function buildChatHTML(name, color, greeting) {
    var sparkSvg = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    var sendSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
    var chatSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';

    return (
      /* header */
      '<div class="voicedesk-header">' +
        '<div class="voicedesk-hbg" style="background:linear-gradient(135deg,' + color + '33 0%,transparent 60%)"></div>' +
        '<div class="voicedesk-header-left">' +
          '<div class="voicedesk-hicon" style="background:' + color + '22;border:1px solid ' + color + '44">' + chatSvg + '</div>' +
          '<div>' +
            '<div class="voicedesk-hname">' + escHtml(name) + '</div>' +
            '<div class="voicedesk-hsub">' +
              '<div class="voicedesk-hdot" style="background:' + color + '"></div>' +
              '<span id="voicedesk-status-text" style="color:' + color + '">AI Chat</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="voicedesk-header-right">' +
          '<button id="voicedesk-close" class="voicedesk-closebtn" title="Close">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>' +

      /* chat messages area */
      '<div id="voicedesk-chat-messages" class="voicedesk-chat-messages">' +
        '<div id="voicedesk-chat-empty" class="voicedesk-empty-state">' +
          '<div class="voicedesk-empty-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div>' +
          '<span>' + escHtml(greeting || 'Hi! Ask me anything.') + '</span>' +
        '</div>' +
      '</div>' +

      /* chat input */
      '<div class="voicedesk-chat-input-wrap">' +
        '<input id="voicedesk-chat-input" class="voicedesk-chat-input" type="text" placeholder="Type a message…" autocomplete="off" />' +
        '<button id="voicedesk-chat-send" class="voicedesk-chat-send" style="background:' + color + '" disabled>' + sendSvg + '</button>' +
      '</div>' +

      /* footer */
      '<div class="voicedesk-footer">' +
        sparkSvg + '<span>Powered by VoiceDesk</span>' +
      '</div>'
    );
  }

  /* ─── Chat handlers ──────────────────────────────────── */
  var chatConversationId = null;
  var chatHistory = [];
  var chatSending = false;

  function initChatHandlers(color) {
    var input = widget.querySelector('#voicedesk-chat-input');
    var sendBtn = widget.querySelector('#voicedesk-chat-send');
    if (!input || !sendBtn) return;

    input.addEventListener('input', function() {
      sendBtn.disabled = !input.value.trim();
      sendBtn.style.opacity = input.value.trim() ? '1' : '0.4';
    });

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage(color);
      }
    });

    sendBtn.addEventListener('click', function() {
      sendChatMessage(color);
    });

    input.focus();
  }

  async function sendChatMessage(color) {
    var input = widget.querySelector('#voicedesk-chat-input');
    var sendBtn = widget.querySelector('#voicedesk-chat-send');
    if (!input || chatSending) return;
    var text = input.value.trim();
    if (!text) return;

    chatSending = true;
    input.value = '';
    sendBtn.disabled = true;
    sendBtn.style.opacity = '0.4';

    /* Hide empty state */
    var emptyState = widget.querySelector('#voicedesk-chat-empty');
    if (emptyState) emptyState.style.display = 'none';

    /* Add user bubble */
    addChatBubble('user', text, color);
    chatHistory.push({ role: 'user', content: text });

    /* Show typing indicator */
    var typingEl = document.createElement('div');
    typingEl.id = 'voicedesk-typing';
    typingEl.className = 'voicedesk-chat-row';
    typingEl.innerHTML =
      '<div class="voicedesk-avatar" style="background:' + color + '22;border:1px solid ' + color + '44;color:' + color + '">' +
        '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>' +
      '</div>' +
      '<div class="voicedesk-bubble" style="background:' + color + '12;border:1px solid ' + color + '25;border-top-left-radius:3px">' +
        '<div class="voicedesk-typing-dots"><span></span><span></span><span></span></div>' +
      '</div>';
    var msgArea = widget.querySelector('#voicedesk-chat-messages');
    msgArea.appendChild(typingEl);
    scrollChat();
    setStatusText('Typing…');

    try {
      var res = await fetch(APP_URL + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: config.businessId,
          conversationId: chatConversationId,
          message: text,
          history: chatHistory.slice(0, -1),
        }),
      });
      var data = await res.json();

      /* Remove typing indicator */
      var typing = widget.querySelector('#voicedesk-typing');
      if (typing) typing.remove();

      if (data.conversationId) chatConversationId = data.conversationId;

      var reply = data.reply || 'Sorry, something went wrong.';
      addChatBubble('ai', reply, color);
      chatHistory.push({ role: 'assistant', content: reply });
    } catch (err) {
      var typing = widget.querySelector('#voicedesk-typing');
      if (typing) typing.remove();
      addChatBubble('ai', 'Sorry, something went wrong. Please try again.', color);
    }

    chatSending = false;
    setStatusText('AI Chat');
    var newInput = widget.querySelector('#voicedesk-chat-input');
    if (newInput) newInput.focus();
  }

  function addChatBubble(role, text, color) {
    if (!widget) return;
    var msgArea = widget.querySelector('#voicedesk-chat-messages');
    var empty = widget.querySelector('#voicedesk-chat-empty');
    if (empty) empty.style.display = 'none';

    var row = document.createElement('div');
    row.className = 'voicedesk-chat-row' + (role === 'user' ? ' voicedesk-chat-user' : '');

    var avatar = document.createElement('div');
    avatar.className = 'voicedesk-avatar';
    if (role === 'ai') {
      avatar.style.cssText = 'background:' + color + '22;border:1px solid ' + color + '44;color:' + color;
      avatar.innerHTML = '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>';
    } else {
      avatar.style.cssText = 'background:rgba(255,255,255,0.07);color:#64748b';
      avatar.innerHTML = '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    }

    var bubble = document.createElement('div');
    bubble.className = 'voicedesk-bubble';
    if (role === 'ai') {
      bubble.style.cssText = 'background:' + color + '12;border:1px solid ' + color + '25;border-top-left-radius:3px';
    } else {
      bubble.style.cssText = 'background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-top-right-radius:3px';
    }
    bubble.textContent = text;

    if (role === 'user') {
      row.appendChild(bubble);
      row.appendChild(avatar);
    } else {
      row.appendChild(avatar);
      row.appendChild(bubble);
    }
    msgArea.appendChild(row);
    scrollChat();
  }

  function scrollChat() {
    var msgArea = widget && widget.querySelector('#voicedesk-chat-messages');
    if (msgArea) msgArea.scrollTop = msgArea.scrollHeight;
  }

  /* ─── Playback worklet (ring buffer) ─────────────────── */
  async function setupPlayback(ctx) {
    var code = 'class P extends AudioWorkletProcessor{' +
      'constructor(){super();this._b=new Float32Array(0);' +
      'this.port.onmessage=function(e){' +
      'if(e.data&&e.data.type==="flush"){this._b=new Float32Array(0);return}' +
      'var i=new Int16Array(e.data),f=new Float32Array(i.length);' +
      'for(var j=0;j<i.length;j++)f[j]=i[j]/32768;' +
      'var m=new Float32Array(this._b.length+f.length);' +
      'm.set(this._b);m.set(f,this._b.length);this._b=m}.bind(this)}' +
      'process(_,o){var out=o[0][0];if(!out)return true;' +
      'if(this._b.length>=out.length){out.set(this._b.subarray(0,out.length));' +
      'this._b=this._b.subarray(out.length)}return true}};' +
      'registerProcessor("vd-playback",P);';
    var blob = new Blob([code], { type: 'application/javascript' });
    var url = URL.createObjectURL(blob);
    await ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    var node = new AudioWorkletNode(ctx, 'vd-playback');
    node.connect(ctx.destination);
    return node;
  }

  /* ─── Mic capture worklet ────────────────────────────── */
  async function setupMic(ctx, stream, onChunk) {
    var code = 'class M extends AudioWorkletProcessor{' +
      'process(i){var inp=i[0]&&i[0][0];if(!inp)return true;' +
      'var p=new Int16Array(inp.length);' +
      'for(var j=0;j<inp.length;j++){var s=Math.max(-1,Math.min(1,inp[j]));' +
      'p[j]=s<0?s*0x8000:s*0x7fff}' +
      'this.port.postMessage(p.buffer,[p.buffer]);return true}};' +
      'registerProcessor("vd-mic",M);';
    var blob = new Blob([code], { type: 'application/javascript' });
    var url = URL.createObjectURL(blob);
    await ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    var src = ctx.createMediaStreamSource(stream);
    var node = new AudioWorkletNode(ctx, 'vd-mic');
    node.port.onmessage = function(e) { onChunk(e.data); };
    src.connect(node);
    return node;
  }

  /* ─── Play binary audio (PCM 16-bit, skip WAV header) ── */
  function playAudio(data) {
    if (data instanceof ArrayBuffer || data instanceof Blob) {
      var processAb = function(ab) {
        var h = new Uint8Array(ab, 0, 4);
        var isWav = h[0]===0x52 && h[1]===0x49 && h[2]===0x46 && h[3]===0x46;
        var pcm = isWav ? ab.slice(44) : ab;
        if (playbackNode) playbackNode.port.postMessage(pcm, [pcm]);
      };
      if (data instanceof Blob) { data.arrayBuffer().then(processAb); }
      else { processAb(data); }
    }
  }

  /* ─── Voice connection (Deepgram WebSocket) ──────────── */
  async function startVoice() {
    var startBtn = widget.querySelector('#voicedesk-start-btn');
    startBtn.disabled = true;
    setStatusText('Connecting…');

    try {
      /* Phase 1: fetch session config from our backend */
      var res = await fetch(APP_URL + '/api/realtime/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: config.businessId }),
      });
      var sessionData = await res.json();
      if (sessionData.error) throw new Error(sessionData.error);
      conversationId = sessionData.conversationId;

      /* Phase 2: get Deepgram API key */
      var keyRes = await fetch(APP_URL + '/api/deepgram-token');
      if (!keyRes.ok) throw new Error('Failed to get API key');
      var apiKey = await keyRes.text();

      /* Phase 3: open WebSocket to Deepgram Voice Agent */
      ws = new WebSocket('wss://agent.deepgram.com/v1/agent/converse', ['token', apiKey.trim()]);
      ws.binaryType = 'arraybuffer';

      ws.onopen = function() {
        socketOpen = true;
        /* Send agent settings */
        ws.send(JSON.stringify({
          type: 'Settings',
          audio: {
            input: { encoding: 'linear16', sample_rate: 16000 },
            output: { encoding: 'linear16', sample_rate: 24000, container: 'none' },
          },
          agent: {
            listen: { provider: { type: 'deepgram', model: 'flux-general-en' } },
            think: {
              provider: { type: 'open_ai', model: 'gpt-4o-mini' },
              prompt: sessionData.systemPrompt,
              functions: sessionData.functions || sessionData.tools || [],
            },
            speak: { provider: { type: 'deepgram', model: sessionData.ttsModel || 'aura-2-thalia-en' } },
            greeting: sessionData.greeting || 'Hello! How can I help you today?',
          },
        }));

        /* Flush queued mic frames */
        for (var i = 0; i < audioQueue.length; i++) ws.send(audioQueue[i]);
        audioQueue = [];

        callStartTime = Date.now();
        muted = false;
        showActive();
        setCallState('listening');
      };

      ws.onmessage = function(e) {
        /* Binary = audio */
        if (e.data instanceof ArrayBuffer || e.data instanceof Blob) {
          playAudio(e.data);
          return;
        }
        /* String = JSON event */
        try { handleDgEvent(JSON.parse(e.data)); } catch(_) {}
      };

      ws.onerror = function(err) {
        console.error('[VoiceDesk WS]', err);
        setStatusText('Connection error');
      };

      ws.onclose = function() {
        socketOpen = false;
        audioQueue = [];
      };

      /* Phase 4: mic capture */
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true },
      });

      micContext = new AudioContext({ sampleRate: 16000 });
      playbackContext = new AudioContext({ sampleRate: 24000 });
      playbackNode = await setupPlayback(playbackContext);
      await setupMic(micContext, localStream, function(buf) {
        if (socketOpen && ws && ws.readyState === 1) {
          ws.send(buf);
        } else {
          audioQueue.push(buf);
        }
      });

    } catch(err) {
      console.error('[VoiceDesk]', err);
      setStatusText('Error: ' + err.message);
      if (startBtn) startBtn.disabled = false;
    }
  }

  function endVoice() {
    stopWaveAnimation();
    socketOpen = false;
    audioQueue = [];
    var dur = callStartTime ? Math.round((Date.now() - callStartTime) / 1000) : null;
    callStartTime = null;
    if (localStream) { localStream.getTracks().forEach(function(t) { t.stop(); }); localStream = null; }
    if (micContext && micContext.state !== 'closed') { try { micContext.close(); } catch(_) {} }
    micContext = null;
    if (playbackNode) { try { playbackNode.port.postMessage({ type: 'flush' }); playbackNode.disconnect(); } catch(_) {} }
    playbackNode = null;
    if (playbackContext && playbackContext.state !== 'closed') { try { playbackContext.close(); } catch(_) {} }
    playbackContext = null;
    if (ws) { try { ws.close(); } catch(_) {} ws = null; }
    if (conversationId) {
      var cid = conversationId;
      conversationId = null;
      var updates = { status: 'completed' };
      if (dur && dur > 0) updates.duration_seconds = dur;
      Promise.all(pendingSaves).then(function() {
        pendingSaves = [];
        fetch(APP_URL + '/api/conversations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: cid, updates: updates }),
        }).catch(function() {});
      });
    }
  }

  function toggleMute() {
    if (!localStream) return;
    muted = !muted;
    localStream.getAudioTracks().forEach(function(t) { t.enabled = !muted; });
    var btn = widget && widget.querySelector('#voicedesk-mute-btn');
    if (btn) {
      if (muted) {
        btn.style.background = 'rgba(255,255,255,0.08)';
        btn.style.boxShadow = 'none';
        btn.style.border = '1.5px solid rgba(255,255,255,0.12)';
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/><path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
        setCallState('muted');
      } else {
        var color = getColor();
        btn.style.background = 'linear-gradient(135deg,' + color + ',' + color + 'bb)';
        btn.style.boxShadow = '0 0 20px ' + color + '55,0 4px 16px rgba(0,0,0,.4)';
        btn.style.border = 'none';
        btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
        setCallState('listening');
      }
    }
  }

  /* ─── Deepgram event handling ──────────────────────────── */
  function handleDgEvent(ev) {
    if (!ev || !ev.type) return;

    switch (ev.type) {
      case 'UserStartedSpeaking':
        if (!muted) setCallState('listening');
        /* Flush playback buffer to stop agent audio during interruption */
        if (playbackNode) playbackNode.port.postMessage({ type: 'flush' });
        break;

      case 'AgentStartedSpeaking':
        if (!muted) setCallState('speaking');
        break;

      case 'AgentAudioDone':
        if (!muted) setCallState('listening');
        break;

      case 'ConversationText': {
        var role = ev.role;
        var content = ev.content || '';
        if (!content.trim()) break;
        if (role === 'assistant') {
          var el = addMessage('ai', content);
          saveMessage('assistant', content);
        } else if (role === 'user') {
          addMessage('user', content);
          saveMessage('user', content);
        }
        break;
      }

      case 'FunctionCallRequest': {
        fetch(APP_URL + '/api/realtime/tools', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toolName: ev.function_name,
            toolArgs: ev.input || {},
            businessId: config.businessId,
            conversationId: conversationId,
          }),
        }).then(function(r) { return r.json(); }).then(function(data) {
          if (ws && ws.readyState === 1) {
            ws.send(JSON.stringify({
              type: 'FunctionCallResponse',
              id: ev.function_call_id,
              name: ev.function_name,
              content: JSON.stringify(data.result),
            }));
          }
        }).catch(function() {});
        break;
      }

      case 'Welcome':
        console.log('[VoiceDesk] Connected');
        break;

      case 'SettingsApplied':
        console.log('[VoiceDesk] Settings applied');
        break;

      case 'Error':
        console.error('[VoiceDesk] Agent error:', ev.message || ev);
        setStatusText('Error: ' + (ev.message || 'Agent error'));
        break;
    }
  }

  /* ─── UI state ───────────────────────────────────────── */
  function setCallState(state) {
    if (!widget) return;
    var color = getColor();
    var stateText = widget.querySelector('#voicedesk-state-text');
    var stateLabel = widget.querySelector('#voicedesk-state-label');
    var ringOuter = widget.querySelector('#voicedesk-ring-outer');
    var ringInner = widget.querySelector('#voicedesk-ring-inner');
    var listenRing = widget.querySelector('#voicedesk-listen-ring');
    var waveform = widget.querySelector('#voicedesk-waveform');

    if (state === 'speaking') {
      if (stateText) stateText.textContent = 'AI Speaking';
      if (stateLabel) stateLabel.style.color = color;
      if (ringOuter) ringOuter.style.display = 'block';
      if (ringInner) ringInner.style.display = 'block';
      if (listenRing) listenRing.style.display = 'none';
      if (waveform) { waveform.style.display = 'flex'; startWaveAnimation(color); }
      animateSpeakingRings(ringOuter, ringInner);
    } else if (state === 'listening') {
      if (stateText) stateText.textContent = 'Listening…';
      if (stateLabel) stateLabel.style.color = color;
      if (ringOuter) { ringOuter.style.display = 'none'; ringOuter.style.transform = 'scale(1)'; }
      if (ringInner) { ringInner.style.display = 'none'; ringInner.style.transform = 'scale(1)'; }
      if (listenRing) listenRing.style.display = 'block';
      if (waveform) { waveform.style.display = 'none'; stopWaveAnimation(); }
    } else if (state === 'muted') {
      if (stateText) stateText.textContent = 'Muted';
      if (stateLabel) stateLabel.style.color = '#64748b';
      if (ringOuter) { ringOuter.style.display = 'none'; }
      if (ringInner) { ringInner.style.display = 'none'; }
      if (listenRing) listenRing.style.display = 'none';
      if (waveform) { waveform.style.display = 'none'; stopWaveAnimation(); }
    }
  }

  function showActive() {
    if (!widget) return;
    var idle = widget.querySelector('#voicedesk-idle');
    var active = widget.querySelector('#voicedesk-active');
    if (idle) idle.style.display = 'none';
    if (active) active.style.display = 'flex';
  }

  function showIdle() {
    if (!widget) return;
    var idle = widget.querySelector('#voicedesk-idle');
    var active = widget.querySelector('#voicedesk-active');
    var waveform = widget.querySelector('#voicedesk-waveform');
    if (idle) idle.style.display = 'block';
    if (active) active.style.display = 'none';
    if (waveform) waveform.style.display = 'none';
    stopWaveAnimation();
    setStatusText('AI Receptionist');
    var startBtn = widget.querySelector('#voicedesk-start-btn');
    if (startBtn) startBtn.disabled = false;
  }

  function setStatusText(text) {
    var el = widget && widget.querySelector('#voicedesk-status-text');
    if (el) el.textContent = text;
  }

  /* ─── Speaking ring animation ────────────────────────── */
  var ringAnimFrame = null;
  function animateSpeakingRings(outer, inner) {
    if (ringAnimFrame) cancelAnimationFrame(ringAnimFrame);
    var start = null;
    function step(ts) {
      if (!outer || !inner) return;
      if (!start) start = ts;
      var t1 = ((ts - start) % 1400) / 1400;
      var t2 = ((ts - start + 350) % 1400) / 1400;
      var s1 = 1 + Math.sin(t1 * Math.PI * 2) * 0.125;
      var s2 = 1 + Math.sin(t2 * Math.PI * 2) * 0.1;
      outer.style.transform = 'scale(' + s1 + ')';
      inner.style.transform = 'scale(' + s2 + ')';
      ringAnimFrame = requestAnimationFrame(step);
    }
    ringAnimFrame = requestAnimationFrame(step);
  }

  /* ─── Waveform animation ─────────────────────────────── */
  var waveAnimFrames = [];
  var waveStartTimes = [];
  var waveHeights = [6, 10, 14, 10, 6];

  function startWaveAnimation(color) {
    stopWaveAnimation();
    if (!widget) return;
    var bars = widget.querySelectorAll('.voicedesk-wbar');
    bars.forEach(function(bar, i) {
      bar.style.background = color;
      var start = null;
      var dur = (0.55 + i * 0.08) * 1000;
      var delay = i * 70;
      function step(ts) {
        if (!start) start = ts - delay;
        var elapsed = ts - start;
        var t = ((elapsed % (dur * 2)) / (dur * 2));
        var progress = t < 0.5 ? t * 2 : 2 - t * 2;
        var h = 3 + (waveHeights[i] - 3) * progress;
        bar.style.height = h + 'px';
        waveAnimFrames[i] = requestAnimationFrame(step);
      }
      waveAnimFrames[i] = requestAnimationFrame(step);
    });
  }

  function stopWaveAnimation() {
    waveAnimFrames.forEach(function(f) { if (f) cancelAnimationFrame(f); });
    waveAnimFrames = [];
    if (ringAnimFrame) { cancelAnimationFrame(ringAnimFrame); ringAnimFrame = null; }
    if (widget) {
      var bars = widget.querySelectorAll('.voicedesk-wbar');
      bars.forEach(function(bar) { bar.style.height = '3px'; });
    }
  }

  /* ─── Transcript ─────────────────────────────────────── */
  function addMessage(role, text) {
    if (!widget) return null;
    var t = widget.querySelector('#voicedesk-transcript');
    var empty = widget.querySelector('#voicedesk-empty-state');
    if (empty) empty.style.display = 'none';

    var color = getColor();
    var wrap = document.createElement('div');
    wrap.className = 'voicedesk-msg-row voicedesk-msg-' + role;

    var avatar = document.createElement('div');
    avatar.className = 'voicedesk-avatar';
    if (role === 'ai') {
      avatar.style.cssText = 'background:' + color + '22;border:1px solid ' + color + '44;color:' + color;
      avatar.innerHTML = '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>';
    } else {
      avatar.style.cssText = 'background:rgba(255,255,255,0.07);color:#64748b';
      avatar.innerHTML = '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    }

    var bubble = document.createElement('div');
    bubble.className = 'voicedesk-bubble voicedesk-bubble-' + role;
    if (role === 'ai') {
      bubble.style.cssText = 'background:' + color + '12;border:1px solid ' + color + '25;border-top-left-radius:3px';
    } else {
      bubble.style.cssText = 'background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-top-right-radius:3px';
    }
    var span = document.createElement('span');
    span.className = 'voicedesk-msg-text';
    span.textContent = text;
    bubble.appendChild(span);

    if (role === 'user') {
      wrap.appendChild(bubble);
      wrap.appendChild(avatar);
    } else {
      wrap.appendChild(avatar);
      wrap.appendChild(bubble);
    }
    t.appendChild(wrap);
    scrollTranscript();
    return wrap;
  }

  function scrollTranscript() {
    var t = widget && widget.querySelector('#voicedesk-transcript');
    if (t) t.scrollTop = t.scrollHeight;
  }

  function saveMessage(role, content) {
    if (!conversationId || !content.trim()) return;
    var p = fetch(APP_URL + '/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: conversationId, role: role, content: content }),
    }).catch(function() {});
    pendingSaves.push(p);
  }

  /* ─── Helpers ────────────────────────────────────────── */
  function getColor() {
    return config._color || '#22c55e';
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ─── Styles ─────────────────────────────────────────── */
  function injectStyles(cfg) {
    var color = cfg.widget && cfg.widget.primary_color ? cfg.widget.primary_color : '#22c55e';
    config._color = color;

    if (document.getElementById('voicedesk-styles')) return;
    var s = document.createElement('style');
    s.id = 'voicedesk-styles';
    s.textContent = [
      /* FAB wrap */
      '#voicedesk-fab-wrap{position:fixed;bottom:20px;right:20px;z-index:2147483646;display:flex;align-items:center;justify-content:center}',

      /* Rings */
      '.voicedesk-ring1,.voicedesk-ring2{position:absolute;width:56px;height:56px;border-radius:50%;pointer-events:none;will-change:transform,opacity}',

      /* Tooltip */
      '.voicedesk-tooltip{position:absolute;bottom:calc(100% + 10px);right:0;background:rgba(8,14,16,.95);border:1px solid rgba(255,255,255,.1);color:#e2e8f0;font-size:11px;font-weight:600;white-space:nowrap;padding:5px 10px;border-radius:8px;pointer-events:none;font-family:Inter,system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.4)}',
      '.voicedesk-tooltip::after{content:"";position:absolute;top:100%;right:14px;border:4px solid transparent;border-top-color:rgba(255,255,255,.1)}',

      /* FAB button */
      '.voicedesk-fab{position:relative;width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:white;transition:transform .2s;will-change:transform}',
      '.voicedesk-fab:hover{transform:scale(1.06)}',
      '.voicedesk-fab:active{transform:scale(0.94)}',

      /* Widget panel */
      '.voicedesk-widget{position:fixed;bottom:20px;right:20px;width:340px;border-radius:16px;overflow:hidden;z-index:2147483645;font-family:Inter,system-ui,-apple-system,sans-serif;background:rgba(8,14,16,.97);border:1px solid rgba(255,255,255,.1);box-shadow:0 24px 64px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.05);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);opacity:0;transform:translateY(16px) scale(0.95);transition:opacity .22s ease,transform .22s ease}',

      /* Header */
      '.voicedesk-header{position:relative;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.07);overflow:hidden}',
      '.voicedesk-hbg{position:absolute;inset:0;opacity:.2;pointer-events:none}',
      '.voicedesk-header-left{position:relative;display:flex;align-items:center;gap:10px}',
      '.voicedesk-header-right{position:relative;display:flex;align-items:center;gap:8px}',
      '.voicedesk-hicon{width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}',
      '.voicedesk-hname{font-size:13px;font-weight:700;color:#f1f5f9;line-height:1.2}',
      '.voicedesk-hsub{display:flex;align-items:center;gap:5px;margin-top:2px}',
      '.voicedesk-hdot{width:6px;height:6px;border-radius:50%;animation:voicedesk-pulse 1.5s infinite}',
      '#voicedesk-status-text{font-size:10px;font-weight:500}',

      /* Waveform */
      '.voicedesk-waveform{display:flex;align-items:center;gap:2px;height:16px}',
      '.voicedesk-wbar{width:3px;border-radius:99px;height:3px;will-change:height}',

      /* Close button */
      '.voicedesk-closebtn{width:28px;height:28px;border-radius:8px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.06);color:#64748b;transition:background .2s,color .2s}',
      '.voicedesk-closebtn:hover{background:rgba(255,255,255,.12);color:#e2e8f0}',

      /* Transcript */
      '.voicedesk-transcript{height:192px;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px;border-bottom:1px solid rgba(255,255,255,.06);scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.08) transparent}',
      '.voicedesk-transcript::-webkit-scrollbar{width:4px}',
      '.voicedesk-transcript::-webkit-scrollbar-track{background:transparent}',
      '.voicedesk-transcript::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:4px}',

      /* Empty state */
      '.voicedesk-empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;color:#2a3f4d;font-size:11px}',
      '.voicedesk-empty-icon{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07)}',

      /* Messages */
      '.voicedesk-msg-row{display:flex;gap:7px;align-items:flex-start}',
      '.voicedesk-msg-user{flex-direction:row-reverse}',
      '.voicedesk-avatar{width:18px;height:18px;border-radius:50%;display:flex;flex-shrink:0;align-items:center;justify-content:center;margin-top:2px}',
      '.voicedesk-bubble{max-width:82%;padding:8px 10px;border-radius:12px;font-size:11px;line-height:1.55;color:#cbd5e1}',
      '.voicedesk-bubble-user{color:#94a3b8}',

      /* Controls */
      '.voicedesk-controls{padding:16px 20px}',
      '.voicedesk-idle{display:block;text-align:center}',
      '.voicedesk-greeting-text{font-size:12px;color:#4b6070;line-height:1.5;margin:0 0 14px}',
      '.voicedesk-orb-wrap{display:flex;flex-direction:column;align-items:center;gap:8px;position:relative}',
      '.voicedesk-orb{width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;position:relative;z-index:2;transition:transform .15s}',
      '.voicedesk-orb:hover{transform:scale(1.05)}',
      '.voicedesk-orb:active{transform:scale(0.93)}',
      '.voicedesk-orb:disabled{opacity:.5;cursor:not-allowed;transform:none}',
      '.voicedesk-tap-hint{font-size:11px;color:#3d5060}',

      /* Active controls */
      '.voicedesk-active-controls{display:flex;flex-direction:column;align-items:center;gap:10px}',
      '.voicedesk-ring-outer,.voicedesk-ring-inner{position:absolute;border-radius:50%;pointer-events:none}',
      '.voicedesk-ring-outer{width:96px;height:96px;top:50%;left:50%;margin:-48px 0 0 -48px}',
      '.voicedesk-ring-inner{width:112px;height:112px;top:50%;left:50%;margin:-56px 0 0 -56px}',
      '.voicedesk-listen-ring{position:absolute;width:80px;height:80px;border-radius:50%;border:1.5px solid;top:50%;left:50%;margin:-40px 0 0 -40px;pointer-events:none;animation:voicedesk-listen-pulse 1.8s ease-in-out infinite}',
      '.voicedesk-orb-active{z-index:3}',
      '.voicedesk-status-row{display:flex;align-items:center;gap:10px}',
      '.voicedesk-state-label{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:500}',
      '.voicedesk-sdot{width:6px;height:6px;border-radius:50%;animation:voicedesk-pulse 1.1s infinite}',
      '.voicedesk-endbtn{display:flex;align-items:center;gap:4px;padding:4px 10px;border-radius:99px;font-size:11px;font-weight:500;cursor:pointer;color:#f87171;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);transition:background .2s;font-family:inherit}',
      '.voicedesk-endbtn:hover{background:rgba(239,68,68,.18)}',
      '.voicedesk-endbtn svg{margin-right:1px}',

      /* Footer */
      '.voicedesk-footer{padding:8px 16px;display:flex;align-items:center;justify-content:center;gap:5px;border-top:1px solid rgba(255,255,255,.05);background:rgba(0,0,0,.3);color:#2a3f4d;font-size:10px;font-family:Inter,system-ui,sans-serif}',

      /* Keyframes */
      '@keyframes voicedesk-pulse{0%,100%{opacity:1}50%{opacity:.3}}',
      '@keyframes voicedesk-listen-pulse{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.12);opacity:1}}',

      /* Chat messages area */
      '.voicedesk-chat-messages{height:280px;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px;border-bottom:1px solid rgba(255,255,255,.06);scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.08) transparent}',
      '.voicedesk-chat-messages::-webkit-scrollbar{width:4px}',
      '.voicedesk-chat-messages::-webkit-scrollbar-track{background:transparent}',
      '.voicedesk-chat-messages::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:4px}',

      /* Chat row */
      '.voicedesk-chat-row{display:flex;gap:7px;align-items:flex-start}',
      '.voicedesk-chat-user{flex-direction:row-reverse}',

      /* Chat input */
      '.voicedesk-chat-input-wrap{padding:10px 12px;display:flex;align-items:center;gap:8px;background:rgba(0,0,0,.2)}',
      '.voicedesk-chat-input{flex:1;padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05);color:#e2e8f0;font-size:12px;font-family:Inter,system-ui,sans-serif;outline:none}',
      '.voicedesk-chat-input::placeholder{color:#3d5060}',
      '.voicedesk-chat-input:focus{border-color:rgba(255,255,255,.15)}',
      '.voicedesk-chat-send{width:32px;height:32px;border-radius:8px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:opacity .2s;flex-shrink:0}',
      '.voicedesk-chat-send:disabled{opacity:.4;cursor:not-allowed}',

      /* Typing dots */
      '.voicedesk-typing-dots{display:flex;gap:4px;align-items:center;padding:2px 0}',
      '.voicedesk-typing-dots span{width:5px;height:5px;border-radius:50%;background:#64748b;animation:voicedesk-typing .9s infinite}',
      '.voicedesk-typing-dots span:nth-child(2){animation-delay:.15s}',
      '.voicedesk-typing-dots span:nth-child(3){animation-delay:.3s}',
      '@keyframes voicedesk-typing{0%,100%{opacity:.3;transform:translateY(0)}50%{opacity:1;transform:translateY(-3px)}}',
    ].join('');
    document.head.appendChild(s);
  }

})();
`;

  return new NextResponse(script, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
