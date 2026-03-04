import { describe, expect, it } from 'vitest';
import type { Config } from '@voice-hub/shared-config';
import { createProvider, validateProviderConfig } from '../src/factory.js';

function createConfig(): Config {
  return {
    discordBotToken: 'token',
    discordGuildId: 'guild',
    discordVoiceChannelId: 'voice',
    discordClientId: '',
    doubaoRealtimeWsUrl: undefined,
    doubaoAppId: undefined,
    doubaoAccessToken: undefined,
    qwenRealtimeWsUrl: undefined,
    qwenApiKey: undefined,
    qwenModel: undefined,
    qwenVoice: undefined,
    qwenRegion: undefined,
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
    voiceProvider: 'disabled',
  };
}

describe('provider factory', () => {
  it('creates qwen dashscope provider when configured', () => {
    const provider = createProvider(
      {
        ...createConfig(),
        voiceProvider: 'qwen-dashscope',
        qwenRealtimeWsUrl: 'wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime',
        qwenApiKey: 'test-key',
        qwenModel: 'qwen3-omni-flash-realtime',
      } as Config,
      's1'
    );

    expect(provider).toBeTruthy();
    expect(provider?.constructor.name).toBe('QwenDashscopeProvider');
  });

  it('validates missing qwen provider fields', () => {
    const validation = validateProviderConfig({
      ...createConfig(),
      voiceProvider: 'qwen-dashscope',
      qwenRealtimeWsUrl: undefined,
      qwenApiKey: undefined,
      qwenModel: undefined,
    } as Config);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain(
      'QWEN_REALTIME_WS_URL is required for qwen-dashscope provider'
    );
    expect(validation.errors).toContain(
      'QWEN_API_KEY is required for qwen-dashscope provider'
    );
  });
});
