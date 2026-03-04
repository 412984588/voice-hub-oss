import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  config: {
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
    corsAllowedOrigins: ['http://localhost:3000'],
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
  },
  runtimeStart: vi.fn(),
  runtimeStop: vi.fn(),
  discordStart: vi.fn(),
  discordStop: vi.fn(),
  serverStart: vi.fn(),
  serverStop: vi.fn(),
  dbInit: vi.fn(),
  dbClose: vi.fn(),
}));

vi.mock('@voice-hub/shared-config', () => ({
  loadConfig: () => mocks.config,
  validateConfigForProvider: () => ({ valid: true, errors: [] }),
}));

vi.mock('@voice-hub/provider', () => ({
  createProvider: () => null,
}));

vi.mock('@voice-hub/memory-bank', () => ({
  DatabaseManager: class {
    init(): void {
      mocks.dbInit();
    }

    close(): void {
      mocks.dbClose();
    }
  },
  MemoryStore: class {},
}));

vi.mock('@voice-hub/backend-dispatcher', () => ({
  Dispatcher: class {},
}));

vi.mock('@voice-hub/core-runtime', () => ({
  VoiceRuntime: class {
    start = mocks.runtimeStart;
    stop = mocks.runtimeStop;
    createSession = vi.fn();
    destroySession = vi.fn();
    getSession = vi.fn();
    getAllSessions = vi.fn().mockReturnValue([]);
    getSessionState = vi.fn();
    startListening = vi.fn();
    stopListening = vi.fn();
    sendAudio = vi.fn();
    isActive = vi.fn().mockReturnValue(true);
    getActiveSessionCount = vi.fn().mockReturnValue(0);
  },
}));

vi.mock('../src/discord-bot.js', () => ({
  DiscordBot: class {
    start = mocks.discordStart;
    stop = mocks.discordStop;
  },
}));

vi.mock('../src/server.js', () => ({
  VoiceHubServer: class {
    start = mocks.serverStart;
    stop = mocks.serverStop;
  },
}));

import { VoiceHubApp } from '../src/index.js';

describe('VoiceHubApp startup rollback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runtimeStart.mockResolvedValue(undefined);
    mocks.runtimeStop.mockResolvedValue(undefined);
    mocks.discordStart.mockResolvedValue(undefined);
    mocks.discordStop.mockResolvedValue(undefined);
    mocks.serverStart.mockResolvedValue(undefined);
    mocks.serverStop.mockResolvedValue(undefined);
  });

  it('rolls back started components when server startup fails', async () => {
    mocks.serverStart.mockRejectedValueOnce(new Error('server startup failed'));
    const app = new VoiceHubApp();

    await expect(app.start()).rejects.toThrow('server startup failed');

    expect(mocks.runtimeStart).toHaveBeenCalledTimes(1);
    expect(mocks.discordStart).toHaveBeenCalledTimes(1);
    expect(mocks.serverStart).toHaveBeenCalledTimes(1);
    expect(mocks.discordStop).toHaveBeenCalledTimes(1);
    expect(mocks.runtimeStop).toHaveBeenCalledTimes(1);
    expect(app.getStatus().running).toBe(false);
  });
});
