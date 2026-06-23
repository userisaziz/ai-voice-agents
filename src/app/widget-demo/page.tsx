'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    VoiceDesk?: { init: (opts: { businessId: string; position?: string; mode?: string }) => void };
  }
}

const BUSINESS_ID = 'fdddcf0a-bfa3-4601-b723-250152137e44';

export default function WidgetDemoPage() {
  const [activeTab, setActiveTab] = useState<'voice' | 'chat'>('voice');
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    /* Load the embeddable widget script */
    const script = document.createElement('script');
    script.src = '/widget.js';
    script.async = true;
    script.onload = () => {
      if (window.VoiceDesk) {
        window.VoiceDesk.init({
          businessId: BUSINESS_ID,
          position: 'bottom-right',
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      const s = document.querySelector('script[src="/widget.js"]');
      if (s) s.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center gap-6 p-8">
      {/* Hero */}
      <div className="text-center max-w-lg">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live Widget Demo
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">VoiceDesk Widgets</h1>
        <p className="text-slate-400 text-sm leading-relaxed">
          Choose a widget type below to see the embed code. The voice widget is currently active in the bottom-right corner.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={() => setActiveTab('voice')}
          className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-all"
          style={{
            background: activeTab === 'voice' ? 'rgba(34,197,94,0.15)' : 'transparent',
            color: activeTab === 'voice' ? '#4ade80' : '#64748b',
            border: activeTab === 'voice' ? '1px solid rgba(34,197,94,0.2)' : '1px solid transparent',
          }}
        >
          Voice Widget
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-all"
          style={{
            background: activeTab === 'chat' ? 'rgba(59,130,246,0.15)' : 'transparent',
            color: activeTab === 'chat' ? '#60a5fa' : '#64748b',
            border: activeTab === 'chat' ? '1px solid rgba(59,130,246,0.2)' : '1px solid transparent',
          }}
        >
          Chat Widget
        </button>
      </div>

      {/* Embed code preview */}
      <div className="w-full max-w-xl">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
            <span className="ml-2 text-[11px] text-slate-500 font-mono">
              {activeTab === 'voice' ? 'voice embed snippet' : 'chat embed snippet'}
            </span>
          </div>
          <pre className="p-4 text-xs text-slate-300 font-mono leading-relaxed overflow-x-auto">
            {activeTab === 'voice'
              ? `<!-- VoiceDesk AI Voice Widget -->
<script src="http://localhost:3000/widget.js"><\/script>
<script>
  VoiceDesk.init({
    businessId: "${BUSINESS_ID}",
    position: "bottom-right",
  });
<\/script>`
              : `<!-- VoiceDesk AI Chat Widget -->
<script src="http://localhost:3000/widget.js"><\/script>
<script>
  VoiceDesk.init({
    businessId: "${BUSINESS_ID}",
    position: "bottom-right",
    mode: "chat",
  });
<\/script>`}
          </pre>
        </div>
      </div>

      {/* Instructions */}
      <div className="flex flex-wrap gap-4 justify-center text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{
              background: activeTab === 'chat' ? 'rgba(59,130,246,0.1)' : 'rgba(34,197,94,0.1)',
              border: `1px solid ${activeTab === 'chat' ? 'rgba(59,130,246,0.2)' : 'rgba(34,197,94,0.2)'}`,
              color: activeTab === 'chat' ? '#60a5fa' : '#4ade80',
            }}
          >
            1
          </span>
          {activeTab === 'voice' ? 'Click the green button bottom-right' : 'Set mode to "chat" in init()'}
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{
              background: activeTab === 'chat' ? 'rgba(59,130,246,0.1)' : 'rgba(34,197,94,0.1)',
              border: `1px solid ${activeTab === 'chat' ? 'rgba(59,130,246,0.2)' : 'rgba(34,197,94,0.2)'}`,
              color: activeTab === 'chat' ? '#60a5fa' : '#4ade80',
            }}
          >
            2
          </span>
          {activeTab === 'voice' ? 'Tap the mic to start talking' : 'Type a message in the chat input'}
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{
              background: activeTab === 'chat' ? 'rgba(59,130,246,0.1)' : 'rgba(34,197,94,0.1)',
              border: `1px solid ${activeTab === 'chat' ? 'rgba(59,130,246,0.2)' : 'rgba(34,197,94,0.2)'}`,
              color: activeTab === 'chat' ? '#60a5fa' : '#4ade80',
            }}
          >
            3
          </span>
          {activeTab === 'voice' ? 'See transcript in real-time' : 'Get AI responses instantly'}
        </div>
      </div>
    </div>
  );
}
