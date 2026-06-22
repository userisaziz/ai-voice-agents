'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useVoiceStore } from '@/store/voice';
import type { TranscriptEntry } from '@/types';
import { DEEPGRAM_FUNCTIONS } from '@/ai/tools';

interface UseRealtimeVoiceOptions {
  businessId: string;
  onConversationEnd?: (conversationId: string) => void;
}

type DeepgramSettings = {
  type: 'Settings';
  audio: {
    input: { encoding: string; sample_rate: number };
    output: { encoding: string; sample_rate: number; container: string };
  };
  agent: {
    listen: { provider: { type: string; model: string } };
    think: {
      provider: { type: string; model: string };
      prompt: string;
      functions: typeof DEEPGRAM_FUNCTIONS;
      endpoint?: { url: string; headers: Record<string, string> };
    };
    speak: { provider: { type: string; model: string } };
    greeting?: string;
  };
};

export function useRealtimeVoice({ businessId, onConversationEnd }: UseRealtimeVoiceOptions) {
  const {
    setConnectionState,
    addTranscriptEntry,
    updateLastEntry,
    clearTranscript,
    setConversationId,
    setMuted,
    isMuted,
    connectionState,
    conversationId,
  } = useVoiceStore();

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const assistantMsgIdRef = useRef<string | null>(null);
  const pendingSavesRef = useRef<Promise<unknown>[]>([]);
  const audioChunksRef = useRef<Uint8Array[]>([]);
  const audioQueueRef = useRef<Uint8Array[]>([]);
  const isPlayingRef = useRef(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const playAudioChunk = useCallback((chunk: Uint8Array) => {
    audioQueueRef.current.push(chunk);
    if (!isPlayingRef.current) {
      playNextChunk();
    }
  }, []);

  const playNextChunk = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }
    isPlayingRef.current = true;
    const chunk = audioQueueRef.current.shift()!;
    const blob = new Blob([chunk.buffer as ArrayBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);

    if (!audioElementRef.current) {
      audioElementRef.current = new Audio();
    }
    const audio = audioElementRef.current;
    audio.src = url;
    audio.onended = () => {
      URL.revokeObjectURL(url);
      playNextChunk();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      isPlayingRef.current = false;
    };
    audio.play().catch(() => {
      isPlayingRef.current = false;
    });
  }, []);

  const connect = useCallback(async () => {
    if (connectionState.status !== 'idle' && connectionState.status !== 'error') return;

    setConnectionState({ status: 'connecting' });
    clearTranscript();

    try {
      // Phase 1: Get session config from backend (system prompt, tools, conversation ID)
      const res = await fetch('/api/realtime/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      });

      if (!res.ok) throw new Error('Failed to create session');

      const sessionData = await res.json();
      const { conversationId: convId, greeting, systemPrompt, agentName } = sessionData;

      setConversationId(convId);
      startTimeRef.current = Date.now();

      // Phase 2: Get Deepgram auth token (short-lived, browser-safe)
      const tokenRes = await fetch('/api/deepgram-token');
      if (!tokenRes.ok) throw new Error('Failed to get Deepgram token');
      const token = await tokenRes.text();

      // Phase 3: Open WebSocket to Deepgram Voice Agent
      const wsUrl = `wss://api.deepgram.com/v1/agent/converse`;
      const ws = new WebSocket(wsUrl, ['token', token]);
      wsRef.current = ws;

      ws.onopen = () => {
        // Send Settings message to configure the agent
        const sttModel = process.env.NEXT_PUBLIC_DEEPGRAM_STT_MODEL || 'nova-3';
        const ttsModel = process.env.NEXT_PUBLIC_DEEPGRAM_TTS_MODEL || 'aura-2-thalia-en';
        // Use server-provided LLM config (includes endpoint URL for custom providers)
        const llmProviderType = sessionData.llmProviderType
          || process.env.NEXT_PUBLIC_DEEPGRAM_LLM_PROVIDER_TYPE
          || 'open_ai';
        const llmModel = process.env.NEXT_PUBLIC_DEEPGRAM_LLM_MODEL || 'gpt-4o-mini';

        // Build think config — supports open_ai, deepseek, or custom endpoint
        const thinkConfig: DeepgramSettings['agent']['think'] = {
          provider: { type: llmProviderType, model: llmModel },
          prompt: systemPrompt,
          functions: DEEPGRAM_FUNCTIONS,
        };

        // For custom/self-hosted LLMs, Deepgram calls your endpoint server-to-server
        if (llmProviderType === 'custom' && sessionData.llmEndpoint) {
          thinkConfig.endpoint = {
            url: sessionData.llmEndpoint,
            headers: { 'Content-Type': 'application/json' },
          };
        }

        const settings: DeepgramSettings = {
          type: 'Settings',
          audio: {
            input: { encoding: 'linear16', sample_rate: 16000 },
            output: { encoding: 'linear16', sample_rate: 16000, container: 'wav' },
          },
          agent: {
            listen: {
              provider: { type: 'deepgram', model: sttModel },
            },
            think: thinkConfig,
            speak: {
              provider: { type: 'deepgram', model: ttsModel },
            },
            greeting: greeting || `Hello! How can I help you today?`,
          },
        };

        ws.send(JSON.stringify(settings));
        setConnectionState({ status: 'listening' });
      };

      ws.onmessage = async (event) => {
        // Binary messages are audio chunks from the agent
        if (event.data instanceof Blob) {
          const arrayBuffer = await event.data.arrayBuffer();
          playAudioChunk(new Uint8Array(arrayBuffer));
          return;
        }

        // JSON messages are events
        let data: Record<string, unknown>;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }

        const type = data.type as string;

        // ── Agent started speaking ─────────────────────────────────────────
        if (type === 'AgentStartedSpeaking') {
          setConnectionState({ status: 'speaking' });
        }

        // ── User started speaking (for interruption) ─────────────────────
        if (type === 'UserStartedSpeaking') {
          setConnectionState({ status: 'listening' });
          // Stop audio playback on interruption
          if (audioElementRef.current) {
            audioElementRef.current.pause();
            audioElementRef.current.currentTime = 0;
          }
          audioQueueRef.current = [];
          isPlayingRef.current = false;
        }

        // ── Conversation transcript ───────────────────────────────────────
        if (type === 'ConversationText') {
          const role = data.role as string;
          const content = data.content as string;

          if (!content?.trim()) return;

          if (role === 'user') {
            addTranscriptEntry({
              id: `user-${Date.now()}`,
              role: 'user',
              content,
              timestamp: Date.now(),
            });
            if (convId) {
              const p = fetch('/api/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId: convId, role: 'user', content }),
              }).catch(console.error);
              pendingSavesRef.current.push(p);
            }
          }

          if (role === 'assistant') {
            addTranscriptEntry({
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content,
              timestamp: Date.now(),
            });
            if (convId) {
              const p = fetch('/api/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId: convId, role: 'assistant', content }),
              }).catch(console.error);
              pendingSavesRef.current.push(p);
            }
          }
        }

        // ── Function call request (client-side execution) ──────────────────
        if (type === 'FunctionCallRequest') {
          const functionName = data.function_name as string;
          const toolArgs = (data.input as Record<string, unknown>) || {};
          const functionCallId = data.function_call_id as string;

          try {
            const toolRes = await fetch('/api/realtime/tools', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                toolName: functionName,
                toolArgs,
                businessId,
                conversationId: convId,
              }),
            });
            const { result } = await toolRes.json();

            // Send result back to Deepgram
            ws.send(JSON.stringify({
              type: 'FunctionCallResponse',
              function_call_id: functionCallId,
              output: JSON.stringify(result),
            }));
          } catch (err) {
            console.error('Function call failed:', err);
            ws.send(JSON.stringify({
              type: 'FunctionCallResponse',
              function_call_id: functionCallId,
              output: JSON.stringify({ error: 'Function call failed' }),
            }));
          }
        }

        // ── Agent audio done ──────────────────────────────────────────────
        if (type === 'AgentAudioDone') {
          setConnectionState({ status: 'listening' });
        }

        // ── Welcome (connection established) ──────────────────────────────
        if (type === 'Welcome') {
          console.log('[Deepgram] Connected to Voice Agent');
        }

        // ── Errors ─────────────────────────────────────────────────────────
        if (type === 'Error') {
          const msg = (data.description as string) || 'Unknown error';
          console.error('[Deepgram] Error:', msg);
          setConnectionState({ status: 'error', error: msg });
        }
      };

      ws.onerror = (err) => {
        console.error('[Deepgram] WebSocket error:', err);
        setConnectionState({ status: 'error', error: 'Connection error' });
      };

      ws.onclose = () => {
        setConnectionState({ status: 'idle' });
      };

      // Phase 4: Capture microphone audio and stream to Deepgram
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
        sampleRate: 16000,
      });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      // ScriptProcessor is deprecated but widely supported; AudioWorklet is the modern replacement
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);
        // Convert float32 samples to Int16 PCM
        const pcm = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        ws.send(pcm.buffer);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

    } catch (err) {
      console.error('Voice connection error:', err);
      setConnectionState({
        status: 'error',
        error: 'Failed to connect. Check microphone permissions.',
      });
      cleanup();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, connectionState.status]);

  const disconnect = useCallback(async () => {
    const convId = conversationId;
    const duration = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : null;

    cleanup();
    setConnectionState({ status: 'idle' });

    if (convId) {
      await Promise.all(pendingSavesRef.current).catch(() => {});
      pendingSavesRef.current = [];

      await fetch('/api/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: convId,
          updates: { status: 'completed', duration_seconds: duration },
        }),
      }).catch(console.error);

      onConversationEnd?.(convId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, onConversationEnd]);

  const cleanup = () => {
    // Stop microphone
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;

    // Stop audio processor
    processorRef.current?.disconnect();
    processorRef.current = null;

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    audioContextRef.current = null;

    // Close WebSocket
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    }
    wsRef.current = null;

    // Stop any playing audio
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.src = '';
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    startTimeRef.current = null;
  };

  const toggleMute = useCallback(() => {
    mediaStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = isMuted; // if currently muted, enable; if enabled, mute
    });
    setMuted(!isMuted);
  }, [isMuted, setMuted]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return {
    connect,
    disconnect,
    toggleMute,
    connectionState,
    isMuted,
    conversationId,
  };
}
