import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Config } from '@voice-hub/shared-config';
import type { VoiceRuntime } from '@voice-hub/core-runtime';
import { signWebhookPayload } from '@voice-hub/backend-dispatcher';
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
    voiceHubApiKey: undefined,
    webhookLegacySecretHeader: false,
    webhookShadowMode: false,
    corsAllowedOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000'],
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
    getSessionState: vi.fn().mockReturnValue('idle'),
    startListening: vi.fn(),
    stopListening: vi.fn(),
    sendAudio: vi.fn(),
    isActive: vi.fn().mockReturnValue(true),
    getActiveSessionCount: vi.fn().mockReturnValue(0),
  };
}

describe('VoiceHubServer route implementations', () => {
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
    const payload = {
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
    };
    const signature = signWebhookPayload(
      payload as any,
      'test-webhook-secret',
      String(payload.timestamp)
    );

    const response = await fastify.inject({
      method: 'POST',
      url: '/webhook/callback',
      headers: {
        'x-webhook-signature': signature,
        'x-webhook-timestamp': String(payload.timestamp),
      },
      payload,
    });

    expect(response.statusCode).toBe(200);
    expect(runtime.sendAudio).toHaveBeenCalledTimes(1);
    expect(response.json().handled).toBe(true);
  });

  it('rejects legacy webhook header by default', async () => {
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
        id: 'evt_legacy',
        event: 'custom.notification',
        timestamp: Date.now(),
        sessionId: 's1',
        data: { text: 'legacy' },
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('supports ready route and returns 503 when runtime inactive', async () => {
    const runtime = createRuntimeMock();
    const server = new VoiceHubServer(createConfig(), runtime as unknown as VoiceRuntime);
    const fastify = (server as any).server;

    const ready = await fastify.inject({ method: 'GET', url: '/ready' });
    expect(ready.statusCode).toBe(200);

    runtime.isActive.mockReturnValue(false);
    const notReady = await fastify.inject({ method: 'GET', url: '/ready' });
    expect(notReady.statusCode).toBe(503);
  });

  it('rejects unauthenticated api requests when voiceHubApiKey is configured', async () => {
    const config = createConfig();
    config.voiceHubApiKey = 'secret-key';
    const runtime = createRuntimeMock();
    const server = new VoiceHubServer(config, runtime as unknown as VoiceRuntime);
    const fastify = (server as any).server;

    const response = await fastify.inject({
      method: 'GET',
      url: '/api/status',
    });

    expect(response.statusCode).toBe(401);
  });

  it('accepts api key in Authorization header', async () => {
    const config = createConfig();
    config.voiceHubApiKey = 'secret-key';
    const runtime = createRuntimeMock();
    const server = new VoiceHubServer(config, runtime as unknown as VoiceRuntime);
    const fastify = (server as any).server;

    const response = await fastify.inject({
      method: 'GET',
      url: '/api/status',
      headers: {
        authorization: 'Bearer secret-key',
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it('returns session status by /api/sessions/:sessionId/status', async () => {
    const runtime = createRuntimeMock();
    runtime.getSession.mockReturnValue({ sessionId: 's1' });
    runtime.getSessionState.mockReturnValue('listening');
    const server = new VoiceHubServer(createConfig(), runtime as unknown as VoiceRuntime);
    const fastify = (server as any).server;

    const response = await fastify.inject({
      method: 'GET',
      url: '/api/sessions/s1/status',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      state: 'listening',
      isActive: true,
    });
  });

  it('accepts raw audio by /api/sessions/:sessionId/audio', async () => {
    const runtime = createRuntimeMock();
    runtime.getSession.mockReturnValue({ sessionId: 's1' });
    const server = new VoiceHubServer(createConfig(), runtime as unknown as VoiceRuntime);
    const fastify = (server as any).server;

    const response = await fastify.inject({
      method: 'POST',
      url: '/api/sessions/s1/audio',
      payload: {
        audioBase64: Buffer.from(Uint8Array.from([1, 0, 2, 0])).toString('base64'),
        sampleRate: 16000,
        channels: 1,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(runtime.sendAudio).toHaveBeenCalledTimes(1);
    const frame = runtime.sendAudio.mock.calls[0]?.[1];
    expect(frame.data).toEqual(new Int16Array([1, 2]));
  });

  it('enforces cors allowlist from config', async () => {
    const config = createConfig();
    config.corsAllowedOrigins = ['http://allowed.local'];
    const runtime = createRuntimeMock();
    const server = new VoiceHubServer(config, runtime as unknown as VoiceRuntime);
    const fastify = (server as any).server;

    const allowed = await fastify.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://allowed.local' },
    });
    expect(allowed.headers['access-control-allow-origin']).toBe('http://allowed.local');

    const blocked = await fastify.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://blocked.local' },
    });
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('runs webhook shadow mode without duplicating side effects', async () => {
    const config = createConfig();
    config.webhookShadowMode = true;
    const runtime = createRuntimeMock();
    runtime.getSession.mockReturnValue({ sessionId: 's1' });
    const server = new VoiceHubServer(config, runtime as unknown as VoiceRuntime);
    const fastify = (server as any).server;
    const payload = {
      id: 'evt_shadow',
      event: 'custom.notification',
      timestamp: Date.now(),
      sessionId: 's1',
      data: { text: 'shadow-notify' },
    };
    const signature = signWebhookPayload(
      payload as any,
      'test-webhook-secret',
      String(payload.timestamp)
    );

    const response = await fastify.inject({
      method: 'POST',
      url: '/webhook/callback',
      headers: {
        'x-webhook-signature': signature,
        'x-webhook-timestamp': String(payload.timestamp),
      },
      payload,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().shadowMode).toBe(true);
    expect(runtime.sendAudio).toHaveBeenCalledTimes(1);
  });
});
