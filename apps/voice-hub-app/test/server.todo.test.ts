import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Config } from '@voice-hub/shared-config';
import type { VoiceRuntime } from '@voice-hub/core-runtime';
import { VoiceHubServer } from '../src/server.js';

function createConfig(): Config {
  return {
    discordBotToken: 'token',
    discordGuildId: 'guild',
    discordVoiceChannelId: 'voice',
    discordClientId: 'client',
    doubaoRealtimeWsUrl: undefined,
    doubaoAppId: undefined,
    doubaoAccessToken: undefined,
    backendDispatchUrl: undefined,
    backendTimeoutMs: 30000,
    backendMaxRetries: 3,
    webhookPort: 8911,
    webhookSecret: 'test-webhook-secret',
    webhookPath: '/webhook/callback',
    memoryDbPath: './data/memory_bank.db',
    memoryWalEnabled: true,
    memoryBusyTimeout: 5000,
    logLevel: 'info',
    logFormat: 'json',
    logPretty: false,
    audioSampleRate: 16000,
    audioChannels: 1,
    audioBitsPerSample: 16,
    audioFrameDurationMs: 20,
    audioJitterBufferMs: 200,
    sessionTimeoutMs: 300000,
    sessionMaxReconnectAttempts: 5,
    sessionReconnectDelayMs: 2000,
    voiceProvider: 'local-mock',
  };
}

function createRuntimeMock() {
  return {
    createSession: vi.fn(),
    destroySession: vi.fn(),
    getSession: vi.fn(),
    getAllSessions: vi.fn().mockReturnValue([]),
    startListening: vi.fn(),
    stopListening: vi.fn(),
    sendAudio: vi.fn(),
    isActive: vi.fn().mockReturnValue(true),
    getActiveSessionCount: vi.fn().mockReturnValue(0),
  };
}

describe('VoiceHubServer TODO implementations', () => {
  beforeEach(() => {
    delete process.env.TTS_API_URL;
    delete process.env.TTS_API_KEY;
  });

  it('returns 400 when tts text is empty', async () => {
    const runtime = createRuntimeMock();
    runtime.getSession.mockReturnValue({ sessionId: 's1' });
    const server = new VoiceHubServer(createConfig(), runtime as unknown as VoiceRuntime);
    const fastify = (server as any).server;

    const response = await fastify.inject({
      method: 'POST',
      url: '/api/sessions/s1/tts',
      payload: { text: '  ' },
    });

    expect(response.statusCode).toBe(400);
    expect(runtime.sendAudio).not.toHaveBeenCalled();
  });

  it('synthesizes fallback audio for tts endpoint', async () => {
    const runtime = createRuntimeMock();
    runtime.getSession.mockReturnValue({ sessionId: 's1' });
    const server = new VoiceHubServer(createConfig(), runtime as unknown as VoiceRuntime);
    const fastify = (server as any).server;

    const response = await fastify.inject({
      method: 'POST',
      url: '/api/sessions/s1/tts',
      payload: { text: 'hello world' },
    });

    expect(response.statusCode).toBe(200);
    expect(runtime.sendAudio).toHaveBeenCalledTimes(1);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.source).toBe('fallback');
  });

  it('handles completed webhook and triggers announcement tts', async () => {
    const runtime = createRuntimeMock();
    runtime.getSession.mockReturnValue({ sessionId: 's1' });
    const server = new VoiceHubServer(createConfig(), runtime as unknown as VoiceRuntime);
    const fastify = (server as any).server;

    const response = await fastify.inject({
      method: 'POST',
      url: '/webhook/callback',
      headers: {
        'x-webhook-secret': 'test-webhook-secret',
      },
      payload: {
        id: 'evt_1',
        event: 'backend_task.completed',
        timestamp: Date.now(),
        sessionId: 's1',
        data: {
          sessionId: 's1',
          result: {
            summary: 'Task done',
            shouldAnnounce: true,
          },
        },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(runtime.sendAudio).toHaveBeenCalledTimes(1);
    expect(response.json().handled).toBe(true);
  });
});
