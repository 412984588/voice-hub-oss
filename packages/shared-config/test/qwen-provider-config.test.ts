import { describe, expect, it } from 'vitest';
import type { Config } from '../src/index.js';
import {
  configSchema,
  internalConfigSchema,
} from '../src/schema.js';
import { validateConfigForProvider } from '../src/index.js';

const minimalEnv = {
  DISCORD_BOT_TOKEN: 'token',
  DISCORD_GUILD_ID: 'guild',
  DISCORD_VOICE_CHANNEL_ID: 'voice',
};

describe('qwen provider config', () => {
  it('accepts qwen provider in schema and transforms qwen fields', () => {
    const parsed = configSchema.parse({
      ...minimalEnv,
      VOICE_PROVIDER: 'qwen-dashscope',
      QWEN_REALTIME_WS_URL: 'wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime',
      QWEN_API_KEY: 'test-key',
      QWEN_MODEL: 'qwen3-omni-flash-realtime',
      QWEN_VOICE: 'Chelsie',
      QWEN_REGION: 'intl',
    });

    expect(parsed.VOICE_PROVIDER).toBe('qwen-dashscope');

    const internal = internalConfigSchema.parse(parsed);
    expect(internal.voiceProvider).toBe('qwen-dashscope');
    expect(internal.qwenRealtimeWsUrl).toBe(
      'wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime'
    );
    expect(internal.qwenApiKey).toBe('test-key');
    expect(internal.qwenModel).toBe('qwen3-omni-flash-realtime');
    expect(internal.qwenVoice).toBe('Chelsie');
    expect(internal.qwenRegion).toBe('intl');
  });

  it('requires qwen API key when qwen provider is selected', () => {
    const config = internalConfigSchema.parse({
      ...minimalEnv,
      VOICE_PROVIDER: 'qwen-dashscope',
      QWEN_REALTIME_WS_URL: 'wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime',
    }) as Config;

    const validation = validateConfigForProvider(config);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain(
      'QWEN_API_KEY 在使用 qwen-dashscope provider 时是必需的'
    );
  });
});
