'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useVoiceStore } from '@/store/voice';
import { DEEPGRAM_FUNCTIONS } from '@/ai/tools';

interface UseRealtimeVoiceOptions {
  businessId: string;
  agentId?: string;
  onConversationEnd?: (conversationId: string) => void;
}

interface DgEvent {
  type: string;
  [key: string]: unknown;
}

export function useRealtimeVoice({ businessId, agentId, onConversationEnd }: UseRealtimeVoiceOptions) {
  const {
    setConnectionState,
    addTranscriptEntry,
    clearTranscript,
    setConversationId,
    setMuted,
    isMuted,
    connectionState,
    conversationId,
  } = useVoiceStore();

  const wsRef = useRef<WebSocket | null>(null);
  const socketOpenRef = useRef(false);
  const settingsAppliedRef = useRef(false);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const micContextRef = useRef<AudioContext | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const playbackNodeRef = useRef<AudioWorkletNode | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pendingSavesRef = useRef<Promise<unknown>[]>([]);
  const conversationIdRef = useRef<string | null>(null);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionConfigRef = useRef<{ greeting: string; systemPrompt: string; ttsModel: string; language: string; functions?: unknown[] }>({
    greeting: '',
    systemPrompt: '',
    ttsModel: '',
    language: 'en',
  });

  // ── Playback via AudioWorklet (ring buffer) ──────────────────────────────
  const setupPlaybackWorklet = useCallback(async (audioContext: AudioContext) => {
    const workletCode = `
      class PlaybackProcessor extends AudioWorkletProcessor {
        constructor() {
          super();
          this._buffer = new Float32Array(0);
          this.port.onmessage = (e) => {
            if (e.data?.type === 'flush') {
              this._buffer = new Float32Array(0);
              return;
            }
            const incoming = new Int16Array(e.data);
            const f32 = new Float32Array(incoming.length);
            for (let i = 0; i < incoming.length; i++) {
              f32[i] = incoming[i] / 32768;
            }
            const merged = new Float32Array(this._buffer.length + f32.length);
            merged.set(this._buffer);
            merged.set(f32, this._buffer.length);
            this._buffer = merged;
          };
        }
        process(_, outputs) {
          const out = outputs[0][0];
          if (!out) return true;
          if (this._buffer.length >= out.length) {
            out.set(this._buffer.subarray(0, out.length));
            this._buffer = this._buffer.subarray(out.length);
          }
          return true;
        }
      }
      registerProcessor('playback-processor', PlaybackProcessor);
    `;
    const blob = new Blob([workletCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    await audioContext.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);

    const node = new AudioWorkletNode(audioContext, 'playback-processor');
    node.connect(audioContext.destination);
    playbackNodeRef.current = node;
  }, []);

  // ── Mic capture via AudioWorklet ─────────────────────────────────────────
  const setupMicWorklet = useCallback(async (
    audioContext: AudioContext,
    stream: MediaStream,
    onPcmChunk: (buffer: ArrayBuffer) => void,
  ) => {
    const workletCode = `
      class MicProcessor extends AudioWorkletProcessor {
        process(inputs) {
          const input = inputs[0]?.[0];
          if (!input) return true;
          const pcm = new Int16Array(input.length);
          for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          this.port.postMessage(pcm.buffer, [pcm.buffer]);
          return true;
        }
      }
      registerProcessor('mic-processor', MicProcessor);
    `;
    const blob = new Blob([workletCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    await audioContext.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);

    const source = audioContext.createMediaStreamSource(stream);
    const node = new AudioWorkletNode(audioContext, 'mic-processor');
    node.port.onmessage = (e: MessageEvent<ArrayBuffer>) => onPcmChunk(e.data);
    source.connect(node);
    workletNodeRef.current = node;
  }, []);

  // ── Save a message turn to your backend ─────────────────────────────────
  const saveMessage = useCallback((convId: string, role: 'user' | 'assistant', content: string) => {
    const p = fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: convId, role, content }),
    }).catch(console.error);
    pendingSavesRef.current.push(p);
  }, []);

  // ── Send helper with defensive guard ────────────────────────────────────
  const wsSend = useCallback((data: string | ArrayBuffer) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }, []);

  // ── Deepgram event dispatcher ───────────────────────────────────────────
  const handleDgEvent = useCallback((convId: string, data: DgEvent) => {
    switch (data.type) {
      case 'AgentStartedSpeaking':
        setConnectionState({ status: 'speaking' });
        break;

      case 'UserStartedSpeaking':
        setConnectionState({ status: 'listening' });
        playbackNodeRef.current?.port.postMessage({ type: 'flush' });
        break;

      case 'AgentAudioDone':
        setConnectionState({ status: 'listening' });
        break;

      case 'ConversationText': {
        const role = data.role as string;
        const content = (data.content as string) || '';
        if (!content?.trim()) return;
        const entry = {
          id: `${role}-${Date.now()}`,
          role: role as 'user' | 'assistant',
          content,
          timestamp: Date.now(),
        };
        addTranscriptEntry(entry);
        if (convId) saveMessage(convId, role as 'user' | 'assistant', content);
        break;
      }

      case 'FunctionCallRequest': {
        const fn = data as unknown as { function_name: string; input: Record<string, unknown>; function_call_id: string };
        console.log('[Tool] FunctionCallRequest:', fn.function_name, fn.input);
        (async () => {
          try {
            const toolRes = await fetch('/api/realtime/tools', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                toolName: fn.function_name,
                toolArgs: fn.input,
                businessId,
                conversationId: convId,
              }),
            });
            const { result } = await toolRes.json();
            let contentStr = JSON.stringify(result);
            console.log('[Tool] Raw response size:', contentStr.length, 'bytes');

            // Deepgram crashes the agent session if FunctionCallResponse content
            // exceeds ~2 KB. Always trim aggressively — don't rely on server-side.
            const MAX_CONTENT_BYTES = 2048;
            if (contentStr.length > MAX_CONTENT_BYTES) {
              const trimmed: Record<string, unknown> = {};
              trimmed.query = result.query;
              trimmed.total = result.total;
              trimmed.message = result.message;

              if (Array.isArray(result.products)) {
                trimmed.products = (result.products as Record<string, unknown>[]).slice(0, 3).map((p) => ({
                  name: p.name_en || p.name_ar,
                  price: p.price,
                  price_unit: p.price_unit,
                }));
              }
              if (Array.isArray(result.sellers)) {
                trimmed.sellers = (result.sellers as Record<string, unknown>[]).slice(0, 2).map((s) => ({
                  name: s.company_name_en || s.company_name_ar,
                  rating: s.rating,
                }));
              }
              if (Array.isArray(result.categories)) {
                trimmed.categories = (result.categories as Record<string, unknown>[]).slice(0, 5).map((c) => ({
                  name: c.name_en || c.name_ar,
                }));
              }
              for (const [k, v] of Object.entries(result)) {
                if (!['products', 'sellers', 'categories', 'query', 'total', 'message'].includes(k)) {
                  trimmed[k] = v;
                }
              }

              contentStr = JSON.stringify(trimmed);
              console.log('[Tool] Trimmed response size:', contentStr.length, 'bytes');

              if (contentStr.length > MAX_CONTENT_BYTES) {
                contentStr = contentStr.slice(0, MAX_CONTENT_BYTES - 20) + '...(truncated)';
                console.log('[Tool] Hard truncated to', MAX_CONTENT_BYTES, 'bytes');
              }
            }

            console.log('[Tool] Sending FunctionCallResponse for:', fn.function_name);
            wsSend(JSON.stringify({
              type: 'FunctionCallResponse',
              id: fn.function_call_id,
              name: fn.function_name,
              content: contentStr,
            }));
          } catch (err) {
            console.error('[Tool] Function call failed:', err);
            wsSend(JSON.stringify({
              type: 'FunctionCallResponse',
              id: fn.function_call_id,
              name: fn.function_name,
              content: JSON.stringify({ error: 'Function call failed' }),
            }));
          }
        })();
        break;
      }

      case 'Welcome': {
        console.log('[Deepgram] Welcome received (settings already sent on open)');
        break;
      }

      case 'SettingsApplied': {
        console.log('[Deepgram] Settings applied');
        settingsAppliedRef.current = true;
        setConnectionState({ status: 'listening' });
        break;
      }

      case 'Error':
        console.error('[Deepgram] Error:', data);
        console.error('[Deepgram] Error details:', {
          type: data.type,
          message: data.message,
          code: data.code,
          description: data.description,
        });
        
        // Enhanced error message for LLM failures
        let errorMsg = (data.message as string) || 'Unknown error';
        const description = data.description as string | undefined;
        if (description?.includes('LLM') || description?.includes('think')) {
          errorMsg = `LLM Error: ${description}. Check DEEPSEEK_API_KEY and endpoint configuration.`;
        } else if (description?.includes('timeout') || data.code === 'CLIENT_MESSAGE_TIMEOUT') {
          errorMsg = 'Connection timeout - audio not reaching Deepgram. Check microphone and network.';
        }
        
        setConnectionState({ status: 'error', error: errorMsg });
        break;
    }
  }, [businessId, setConnectionState, addTranscriptEntry, saveMessage, wsSend]);

  // ── Cleanup ─────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    socketOpenRef.current = false;
    settingsAppliedRef.current = false;
    audioQueueRef.current = [];

    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }

    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;

    playbackNodeRef.current?.port.postMessage({ type: 'flush' });
    playbackNodeRef.current?.disconnect();
    playbackNodeRef.current = null;

    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;

    if (micContextRef.current?.state !== 'closed') {
      micContextRef.current?.close().catch(() => {});
    }
    micContextRef.current = null;

    if (playbackContextRef.current?.state !== 'closed') {
      playbackContextRef.current?.close().catch(() => {});
    }
    playbackContextRef.current = null;

    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }

    startTimeRef.current = null;
    conversationIdRef.current = null;
  }, []);

  // ── Main connect ─────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (connectionState.status !== 'idle' && connectionState.status !== 'error') return;

    setConnectionState({ status: 'connecting' });
    clearTranscript();

    try {
      // Phase 1: session config from your backend
      const res = await fetch('/api/realtime/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, agentId }),
      });
      if (!res.ok) throw new Error('Failed to create session');

      const { conversationId: convId, greeting, systemPrompt, ttsModel, language, functions } = await res.json();
      conversationIdRef.current = convId;
      setConversationId(convId);
      startTimeRef.current = Date.now();

      // Phase 2: API key from backend proxy
      const keyRes = await fetch('/api/deepgram-token');
      if (!keyRes.ok) throw new Error('Failed to get Deepgram token');
      const apiKey = await keyRes.text();

      // Store session config for Welcome handler
      sessionConfigRef.current = { greeting, systemPrompt, ttsModel, language: language || 'en', functions };

      // Determine STT model for logging
      const sttModelLog = process.env.NEXT_PUBLIC_DEEPGRAM_STT_MODEL || 'flux-general-multi';

      console.log('[Voice] Session config:', {
        provider: process.env.NEXT_PUBLIC_DEEPGRAM_LLM_PROVIDER_TYPE,
        model: process.env.NEXT_PUBLIC_DEEPGRAM_LLM_MODEL,
        endpoint: process.env.NEXT_PUBLIC_DEEPGRAM_LLM_ENDPOINT_URL,
        stt: sttModelLog,
        language: language || 'en',
      });

      // Phase 3: Raw WebSocket with token subprotocol (matches working widget)
      const region = process.env.NEXT_PUBLIC_DEEPGRAM_REGION || 'us';
      const host = region === 'eu' ? 'api.eu.deepgram.com'
                 : region === 'au' ? 'api.au.deepgram.com'
                 : 'agent.deepgram.com';
      const wsUrl = `wss://${host}/v1/agent/converse`;

      const ws = new WebSocket(wsUrl, ['token', apiKey.trim()]);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        socketOpenRef.current = true;
        console.log('[Deepgram WS] Open, sending Settings immediately');
        
        // Send Settings FIRST, before any audio
        const { greeting, systemPrompt, ttsModel, language, functions } = sessionConfigRef.current;
        
        // Use flux-general-multi for bilingual support (Arabic + English)
        const sttModel = process.env.NEXT_PUBLIC_DEEPGRAM_STT_MODEL || 'flux-general-multi';
        
        // LLM provider configuration
        const llmProviderType = process.env.NEXT_PUBLIC_DEEPGRAM_LLM_PROVIDER_TYPE || 'open_ai';
        const llmModel = process.env.NEXT_PUBLIC_DEEPGRAM_LLM_MODEL || 'gpt-4o-mini';
        
        // Build think provider config based on provider type
        // DeepSeek uses OpenAI-compatible API, so provider type is 'open_ai'
        const thinkProvider: Record<string, unknown> = {
          type: llmProviderType === 'deepseek' ? 'open_ai' : llmProviderType,
          model: llmModel,
        };
        
        // Build think config - endpoint is REQUIRED for DeepSeek/custom, must be an object
        const thinkConfig: Record<string, unknown> = {
          provider: thinkProvider,
          prompt: systemPrompt,
          functions: functions || DEEPGRAM_FUNCTIONS,
        };
        
        // For DeepSeek and custom providers, add explicit endpoint configuration
        // Endpoint must be an object with 'url' and 'headers' fields per Deepgram API spec
        if (llmProviderType === 'deepseek' || llmProviderType === 'custom') {
          const endpointUrl = process.env.NEXT_PUBLIC_DEEPGRAM_LLM_ENDPOINT_URL || 'https://api.deepseek.com/v1';
          const apiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || '';
          
          thinkConfig.endpoint = {
            url: endpointUrl,
            headers: {
              authorization: `Bearer ${apiKey}`,
            },
          };
        }

        const agentConfig = {
          listen: {
            provider: {
              type: 'deepgram',
              model: sttModel,
            },
          },
          think: thinkConfig,
          speak: {
            provider: {
              type: 'deepgram',
              model: ttsModel || process.env.NEXT_PUBLIC_DEEPGRAM_TTS_MODEL || 'aura-2-thalia-en',
            },
          },
          greeting: greeting || 'Hello! How can I help you today?',
        };

        console.log('[Deepgram] Sending Settings with think config:', {
          provider: thinkProvider,
          hasEndpoint: !!thinkConfig.endpoint,
          endpointUrl: (thinkConfig.endpoint as { url?: string })?.url,
        });

        wsSend(JSON.stringify({
          type: 'Settings',
          audio: {
            input: { encoding: 'linear16', sample_rate: 16000 },
            output: { encoding: 'linear16', sample_rate: 24000, container: 'none' },
          },
          agent: agentConfig,
        }));

        // Flush queued mic frames immediately
        const queued = audioQueueRef.current;
        audioQueueRef.current = [];
        for (const buf of queued) {
          wsSend(buf);
        }
        
        setConnectionState({ status: 'listening' });
      };

      ws.onmessage = (e: MessageEvent) => {
        // Binary = audio playback
        if (e.data instanceof ArrayBuffer) {
          const header = new Uint8Array(e.data, 0, 4);
          const isWav = header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46;
          const pcm = isWav ? e.data.slice(44) : e.data;
          playbackNodeRef.current?.port.postMessage(pcm, [pcm]);
          return;
        }
        if (e.data instanceof Blob) {
          e.data.arrayBuffer().then((ab) => {
            const header = new Uint8Array(ab, 0, 4);
            const isWav = header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46;
            const pcm = isWav ? ab.slice(44) : ab;
            playbackNodeRef.current?.port.postMessage(pcm, [pcm]);
          });
          return;
        }
        // String = JSON event
        try {
          const data = JSON.parse(e.data) as DgEvent;
          handleDgEvent(convId, data);
        } catch {}
      };

      ws.onerror = (err) => {
        console.error('[Deepgram WS] Error:', err);
        setConnectionState({ status: 'error', error: 'WebSocket error' });
      };

      ws.onclose = () => {
        socketOpenRef.current = false;
        audioQueueRef.current = [];
        setConnectionState({ status: 'idle' });
      };

      // Phase 4: mic capture → AudioWorklet → WS send
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      const micContext = new AudioContext({ sampleRate: 16000 });
      micContextRef.current = micContext;

      const playbackContext = new AudioContext({ sampleRate: 24000 });
      playbackContextRef.current = playbackContext;

      await setupPlaybackWorklet(playbackContext);
      await setupMicWorklet(micContext, stream, (buffer) => {
        if (!socketOpenRef.current) return;
        // Always send audio immediately - don't wait for SettingsApplied
        wsSend(buffer);
      });

    } catch (err) {
      console.error('Voice connection error:', err);
      setConnectionState({
        status: 'error',
        error: 'Failed to connect. Check microphone permissions.',
      });
      cleanup();
    }
  }, [businessId, agentId, connectionState.status, setConnectionState, clearTranscript, setConversationId, setupMicWorklet, setupPlaybackWorklet, handleDgEvent, wsSend, cleanup]);

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(async () => {
    const convId = conversationIdRef.current;
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
  }, [onConversationEnd, cleanup, setConnectionState]);

  const toggleMute = useCallback(() => {
    mediaStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = isMuted;
    });
    setMuted(!isMuted);
  }, [isMuted, setMuted]);

  useEffect(() => {
    return () => { cleanup(); };
  }, [cleanup]);

  return { connect, disconnect, toggleMute, connectionState, isMuted, conversationId };
}
