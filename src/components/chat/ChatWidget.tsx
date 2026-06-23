'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, MessageCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatWidgetProps {
  businessId: string;
  agentId?: string;
  businessName?: string;
  primaryColor?: string;
  position?: 'bottom-right' | 'bottom-left';
  greeting?: string;
}

export function ChatWidget({
  businessId,
  businessName = 'Your Business',
  primaryColor = '#22c55e',
  position = 'bottom-right',
  greeting,
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          conversationId,
          message: text,
          history,
        }),
      });

      const data = await res.json();

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      if (data.reply) {
        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const positionClass = position === 'bottom-right' ? 'right-5' : 'left-5';

  return (
    <div className={cn('fixed bottom-5 z-50', positionClass)}>
      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="w-[360px] rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(8,14,16,0.97)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Header */}
            <div
              className="relative px-4 py-3.5 flex items-center justify-between overflow-hidden"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div
                className="absolute inset-0 opacity-20"
                style={{ background: `linear-gradient(135deg, ${primaryColor}33 0%, transparent 60%)` }}
              />

              <div className="relative flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${primaryColor}22`, border: `1px solid ${primaryColor}44` }}
                >
                  <MessageCircle className="w-4 h-4" style={{ color: primaryColor }} />
                </div>
                <div>
                  <div className="text-[13px] font-bold leading-tight" style={{ color: '#f1f5f9' }}>
                    {businessName}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ background: primaryColor }}
                    />
                    <span className="text-[10px] font-medium" style={{ color: primaryColor }}>
                      {isTyping ? 'Typing…' : 'AI Chat'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="relative w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#64748b' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
                  (e.currentTarget as HTMLElement).style.color = '#e2e8f0';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
                  (e.currentTarget as HTMLElement).style.color = '#64748b';
                }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={transcriptRef}
              className="h-80 overflow-y-auto px-3 py-4 flex flex-col gap-3"
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255,255,255,0.08) transparent',
              }}
            >
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <MessageCircle className="w-5 h-5" style={{ color: '#2a3f4d' }} />
                  </div>
                  <p className="text-[12px] leading-relaxed max-w-[220px]" style={{ color: '#4b6070' }}>
                    {greeting || `Hi! Ask me anything about ${businessName}. I'm here to help.`}
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn('flex gap-2 items-end', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[9px]"
                    style={
                      msg.role === 'assistant'
                        ? { background: `${primaryColor}22`, border: `1px solid ${primaryColor}44`, color: primaryColor }
                        : { background: 'rgba(255,255,255,0.07)', color: '#64748b' }
                    }
                  >
                    {msg.role === 'assistant' ? (
                      <Sparkles className="w-3 h-3" />
                    ) : (
                      <span className="font-bold">U</span>
                    )}
                  </div>
                  <div
                    className="max-w-[75%] px-3 py-2 rounded-xl text-[12px] leading-relaxed"
                    style={
                      msg.role === 'assistant'
                        ? {
                            background: `${primaryColor}12`,
                            border: `1px solid ${primaryColor}25`,
                            borderTopLeftRadius: '3px',
                            color: '#cbd5e1',
                          }
                        : {
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderTopRightRadius: '3px',
                            color: '#94a3b8',
                          }
                    }
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-2 items-end">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `${primaryColor}22`, border: `1px solid ${primaryColor}44`, color: primaryColor }}
                  >
                    <Sparkles className="w-3 h-3" />
                  </div>
                  <div
                    className="px-3 py-2.5 rounded-xl"
                    style={{
                      background: `${primaryColor}12`,
                      border: `1px solid ${primaryColor}25`,
                      borderTopLeftRadius: '3px',
                    }}
                  >
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: primaryColor, animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: primaryColor, animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: primaryColor, animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="px-3 py-3 flex items-center gap-2" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message…"
                disabled={isTyping}
                className="flex-1 px-3 py-2 rounded-lg text-[12px] outline-none placeholder:text-[#3d5060]"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#e2e8f0',
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isTyping}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: input.trim() ? primaryColor : 'rgba(255,255,255,0.05)',
                  color: 'white',
                }}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Footer */}
            <div
              className="px-4 py-2 flex items-center justify-center gap-1.5"
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)' }}
            >
              <Sparkles className="w-3 h-3" style={{ color: '#3d5060' }} />
              <span className="text-[10px]" style={{ color: '#2a3f4d' }}>
                Powered by VoiceDesk
              </span>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="fab"
            initial={{ opacity: 0, scale: 0, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            onClick={() => setIsOpen(true)}
            className="relative flex items-center justify-center"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
          >
            <motion.div
              className="absolute w-16 h-16 rounded-full"
              style={{ background: primaryColor, opacity: 0.25 }}
              animate={{ scale: [1, 1.5], opacity: [0.25, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
            />
            <motion.div
              className="absolute w-16 h-16 rounded-full"
              style={{ background: primaryColor, opacity: 0.15 }}
              animate={{ scale: [1, 1.8], opacity: [0.15, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
            />
            <div
              className="relative w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`,
                boxShadow: `0 8px 24px ${primaryColor}55, 0 2px 8px rgba(0,0,0,0.4)`,
              }}
            >
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div
              className="absolute bottom-full mb-3 right-0 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap pointer-events-none"
              style={{
                background: 'rgba(8,14,16,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#e2e8f0',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              }}
            >
              Chat with us
              <div
                className="absolute top-full right-4 w-0 h-0"
                style={{ borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid rgba(255,255,255,0.1)' }}
              />
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
