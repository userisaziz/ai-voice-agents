'use client';

import { useRef, useCallback, useEffect } from 'react';
import { DeepgramClient } from '@deepgram/sdk';
import { useVoiceStore } from '@/store/voice';
import { DEEPGRAM_FUNCTIONS } from '@/ai/tools';

interface UseRealtimeVoiceOptions {
  businessId: string;
  agentId?: string;
  onConversationEnd?: (conversationId: string) => void;
}

type DGConnection = Awaited<ReturnType<InstanceType<typeof DeepgramClient>['agent']['v1']['connect']>>;

interface MessageTypes {
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

  const connectionRef = useRef<DGConnection | null>(null);
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
  const sessionConfigRef = useRef<{ greeting: string; systemPrompt: string; ttsModel: string; language: string }>({
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

  // ── Message type dispatcher ──────────────────────────────────────────────
  const handleMessage = useCallback((connection: DGConnection, convId: string, msg: unknown) => {
    // Binary audio data (ArrayBuffer or Blob)
    if (msg instanceof ArrayBuffer) {
      const ab = msg;
      // Skip WAV header (44 bytes) if present, otherwise use raw PCM
      const header = new Uint8Array(ab, 0, 4);
      const isWav = header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46; // 'RIFF'
      const pcm = isWav ? ab.slice(44) : ab;
      playbackNodeRef.current?.port.postMessage(pcm, [pcm]);
      return;
    }

    if (msg instanceof Blob) {
      msg.arrayBuffer().then((ab) => {
        const header = new Uint8Array(ab, 0, 4);
        const isWav = header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46;
        const pcm = isWav ? ab.slice(44) : ab;
        playbackNodeRef.current?.port.postMessage(pcm, [pcm]);
      });
      return;
    }

    if (typeof msg === 'string') return;

    const data = msg as MessageTypes;
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
        const ct = data as unknown as { role: string; content: string };
        const { role, content } = ct;
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
            connection.sendFunctionCallResponse({
              type: 'FunctionCallResponse',
              id: fn.function_call_id,
              name: fn.function_name,
              content: JSON.stringify(result),
            });
          } catch (err) {
            console.error('Function call failed:', err);
            connection.sendFunctionCallResponse({
              type: 'FunctionCallResponse',
              id: fn.function_call_id,
              name: fn.function_name,
              content: JSON.stringify({ error: 'Function call failed' }),
            });
          }
        })();
        break;
      }

      case 'Welcome': {
        console.log('[Deepgram] Welcome received, sending settings');
        const { greeting, systemPrompt, ttsModel, language } = sessionConfigRef.current;
        const sttModel = process.env.NEXT_PUBLIC_DEEPGRAM_STT_MODEL || 'flux-general-en';
        const fallbackTtsModel = ttsModel || process.env.NEXT_PUBLIC_DEEPGRAM_TTS_MODEL || 'aura-2-thalia-en';

        // ElevenLabs primary + Deepgram Aura fallback
        const elevenLabsApiKey = process.env.NEXT_PUBLIC_ELEVEN_LABS_API_KEY || '';
        const elevenLabsVoiceId = process.env.NEXT_PUBLIC_ELEVEN_LABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB';
        // Use multilingual model for Arabic/English support
        const elevenLabsModel = process.env.NEXT_PUBLIC_ELEVEN_LABS_MODEL || 'eleven_multilingual_v2';

        const speakConfig = elevenLabsApiKey
          ? [
              {
                provider: {
                  type: 'eleven_labs' as const,
                  model_id: elevenLabsModel,
                  // language_code is optional — ElevenLabs auto-detects from text
                  // Explicit code improves quality for known languages
                  language_code: language === 'ar' ? 'ar' : 'en',
                },
                endpoint: {
                  url: `wss://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}/multi-stream-input`,
                  headers: {
                    'xi-api-key': elevenLabsApiKey,
                  },
                },
              },
              {
                provider: {
                  type: 'deepgram' as const,
                  model: fallbackTtsModel,
                },
              },
            ]
          : { provider: { type: 'deepgram' as const, model: fallbackTtsModel } };

        connection.sendSettings({
          type: 'Settings',
          audio: {
            input: { encoding: 'linear16', sample_rate: 16000 },
            output: { encoding: 'linear16', sample_rate: 24000, container: 'none' },
          },
          agent: {
            listen: {
              provider: {
                type: 'deepgram',
                version: 'v2' as const,
                model: sttModel,
              },
            },
            think: {
              provider: { type: 'open_ai', model: 'gpt-4o-mini' },
              prompt: systemPrompt,
              functions: DEEPGRAM_FUNCTIONS,
            },
            speak: speakConfig,
            greeting: greeting || 'Hello! How can I help you today?',
          },
        });

        // Start KeepAlive to prevent server-side timeout
        if (keepAliveRef.current) clearInterval(keepAliveRef.current);
        keepAliveRef.current = setInterval(() => {
          if (socketOpenRef.current) {
            try {
              connection.sendKeepAlive({ type: 'KeepAlive' });
            } catch {
              socketOpenRef.current = false;
            }
          }
        }, 5000);
        break;
      }

      case 'SettingsApplied': {
        console.log('[Deepgram] Settings applied, ready for audio');
        settingsAppliedRef.current = true;
        // Flush any queued mic frames now that settings are confirmed
        const queued = audioQueueRef.current;
        audioQueueRef.current = [];
        if (socketOpenRef.current) {
          for (const buf of queued) {
            try {
              connection.sendMedia(buf);
            } catch {
              socketOpenRef.current = false;
              break;
            }
          }
        }
        setConnectionState({ status: 'listening' });
        break;
      }

      case 'Error':
        console.error('[Deepgram] Error:', data);
        setConnectionState({ status: 'error', error: (data as { message?: string })?.message || 'Unknown error' });
        break;
    }
  }, [businessId, setConnectionState, addTranscriptEntry, saveMessage]);

  // ── Cleanup (memoized so disconnect + useEffect hold a stable ref) ───────
  const cleanup = useCallback(() => {
    socketOpenRef.current = false;
    settingsAppliedRef.current = false;
    audioQueueRef.current = [];

    // Stop KeepAlive interval
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

    connectionRef.current?.close();
    connectionRef.current = null;

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

      const { conversationId: convId, greeting, systemPrompt, ttsModel, language } = await res.json();
      conversationIdRef.current = convId;
      setConversationId(convId);
      startTimeRef.current = Date.now();

      // Phase 2: API key from backend proxy
      const keyRes = await fetch('/api/deepgram-token');
      if (!keyRes.ok) throw new Error('Failed to get Deepgram token');
      const apiKey = await keyRes.text();

      // Phase 3: SDK client and WebSocket connection
      // Store session config for Welcome handler to use when sending settings
      sessionConfigRef.current = { greeting, systemPrompt, ttsModel, language: language || 'en' };

      // Regional endpoint configuration for lower latency (EU for MENA region)
      // SDK constructs URL as: baseUrl + "/v1/agent/converse"
      const region = process.env.NEXT_PUBLIC_DEEPGRAM_REGION || 'us';
      const clientOptions: { apiKey: string; baseUrl?: string } = { apiKey };
      
      // Override base URL for regional endpoints
      // US: wss://agent.deepgram.com/v1/agent/converse (default)
      // EU: wss://api.eu.deepgram.com/v1/agent/converse
      // AU: wss://api.au.deepgram.com/v1/agent/converse
      if (region === 'eu') {
        clientOptions.baseUrl = 'wss://api.eu.deepgram.com';
      } else if (region === 'au') {
        clientOptions.baseUrl = 'wss://api.au.deepgram.com';
      }
      
      const client = new DeepgramClient(clientOptions);
      const connection = await client.agent.v1.connect({ Authorization: `Token ${apiKey}` });
      connectionRef.current = connection;

      // Phase 4: wire up SDK events BEFORE calling connect()
      connection.on('open', () => {
        // Mark socket open and flush any queued mic frames
        socketOpenRef.current = true;
        const queued = audioQueueRef.current;
        audioQueueRef.current = [];
        for (const buf of queued) {
          connection.sendMedia(buf);
        }

        setConnectionState({ status: 'listening' });
      });

      // Single message handler — dispatch by type
      connection.on('message', (msg) => {
        handleMessage(connection, convId, msg);
      });

      connection.on('error', (err: Error) => {
        console.error('[Deepgram SDK] Error:', err);
        setConnectionState({ status: 'error', error: err.message });
      });

      connection.on('close', () => {
        socketOpenRef.current = false;
        audioQueueRef.current = [];
        setConnectionState({ status: 'idle' });
      });

      // Phase 4b: Actually open the WebSocket (socket starts in "closed" state)
      connection.connect();
      await connection.waitForOpen();

      // Phase 5: mic capture → AudioWorklet → SDK send
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      // Separate AudioContexts: 16 kHz for mic, 24 kHz for playback
      const micContext = new AudioContext({ sampleRate: 16000 });
      micContextRef.current = micContext;

      const playbackContext = new AudioContext({ sampleRate: 24000 });
      playbackContextRef.current = playbackContext;

      await setupPlaybackWorklet(playbackContext);
      await setupMicWorklet(micContext, stream, (buffer) => {
        if (!socketOpenRef.current) return; // Guard: socket closed
        if (settingsAppliedRef.current) {
          try {
            connection.sendMedia(buffer);
          } catch {
            // Socket may have closed between check and send — safe to ignore
            socketOpenRef.current = false;
          }
        } else {
          // Queue frames until SettingsApplied (prevents "binary before settings" error)
          audioQueueRef.current.push(buffer);
        }
      });

    } catch (err) {
      console.error('Voice connection error:', err);
      setConnectionState({
        status: 'error',
        error: 'Failed to connect. Check microphone permissions.',
      });
      cleanup();
    }
  }, [businessId, agentId, connectionState.status, setConnectionState, clearTranscript, setConversationId, setupMicWorklet, setupPlaybackWorklet, saveMessage, handleMessage, cleanup]);

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
