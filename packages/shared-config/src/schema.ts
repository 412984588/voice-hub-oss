/**
 * Zod 配置验证 Schema
 */

import { z } from 'zod';

const DEFAULT_CORS_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
] as const;

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off', '']);

const envBoolean = (defaultValue: boolean) =>
  z.preprocess((value) => {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      if (value === 1) {
        return true;
      }
      if (value === 0) {
        return false;
      }
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (TRUE_VALUES.has(normalized)) {
        return true;
      }
      if (FALSE_VALUES.has(normalized)) {
        return false;
      }
    }

    return value;
  }, z.boolean()).default(defaultValue);

/**
 * 环境变量 Schema
 * 所有配置项都从环境变量读取
 */
export const configSchema = z.object({
  // Discord Configuration
  DISCORD_BOT_TOKEN: z.string().min(1, 'DISCORD_BOT_TOKEN 不能为空'),
  DISCORD_GUILD_ID: z.string().min(1, 'DISCORD_GUILD_ID 不能为空'),
  DISCORD_VOICE_CHANNEL_ID: z.string().min(1, 'DISCORD_VOICE_CHANNEL_ID 不能为空'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID 不能为空').optional(),

  // Doubao Realtime Voice
  DOUBAO_REALTIME_WS_URL: z.string().url().optional(),
  DOUBAO_APP_ID: z.string().min(1).optional(),
  DOUBAO_ACCESS_TOKEN: z.string().min(1).optional(),

  // Backend Dispatcher
  BACKEND_DISPATCH_URL: z.string().url().optional(),
  BACKEND_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  BACKEND_MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(3),

  // Webhook Server
  WEBHOOK_PORT: z.coerce.number().int().positive().max(65535).default(8911),
  WEBHOOK_SECRET: z.string().min(16).default('change-me-in-production'),
  WEBHOOK_PATH: z.string().default('/webhook/callback'),
  VOICE_HUB_API_KEY: z.string().trim().min(1).optional(),
  WEBHOOK_LEGACY_SECRET_HEADER: envBoolean(false),
  WEBHOOK_SHADOW_MODE: envBoolean(false),
  CORS_ALLOWED_ORIGINS: z.string().default(DEFAULT_CORS_ALLOWED_ORIGINS.join(',')),

  // Memory Bank
  MEMORY_DB_PATH: z.string().default('./data/memory_bank.db'),
  MEMORY_WAL_ENABLED: envBoolean(true),
  MEMORY_BUSY_TIMEOUT: z.coerce.number().int().positive().default(5000),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
  LOG_PRETTY: envBoolean(false),

  // Audio Configuration
  AUDIO_SAMPLE_RATE: z.coerce.number().int().positive().default(16000),
  AUDIO_CHANNELS: z.coerce.number().int().min(1).max(2).default(1),
  AUDIO_BITS_PER_SAMPLE: z.coerce.number().int().default(16),
  AUDIO_FRAME_DURATION_MS: z.coerce.number().int().positive().default(100),
  AUDIO_JITTER_BUFFER_MS: z.coerce.number().int().positive().default(200),

  // Session Management
  SESSION_TIMEOUT_MS: z.coerce.number().int().positive().default(300000),
  SESSION_MAX_RECONNECT_ATTEMPTS: z.coerce.number().int().min(0).max(20).default(5),
  SESSION_RECONNECT_DELAY_MS: z.coerce.number().int().positive().default(2000),

  // Provider Selection
  VOICE_PROVIDER: z.enum(['disabled', 'local-mock', 'doubao']).default('disabled'),
});

/**
 * 转换为内部配置格式
 */
export const internalConfigSchema = configSchema.transform((raw) => ({
  discordBotToken: raw.DISCORD_BOT_TOKEN,
  discordGuildId: raw.DISCORD_GUILD_ID,
  discordVoiceChannelId: raw.DISCORD_VOICE_CHANNEL_ID,
  discordClientId: raw.DISCORD_CLIENT_ID || '',

  doubaoRealtimeWsUrl: raw.DOUBAO_REALTIME_WS_URL,
  doubaoAppId: raw.DOUBAO_APP_ID,
  doubaoAccessToken: raw.DOUBAO_ACCESS_TOKEN,

  backendDispatchUrl: raw.BACKEND_DISPATCH_URL,
  backendTimeoutMs: raw.BACKEND_TIMEOUT_MS,
  backendMaxRetries: raw.BACKEND_MAX_RETRIES,

  webhookPort: raw.WEBHOOK_PORT,
  webhookSecret: raw.WEBHOOK_SECRET,
  webhookPath: raw.WEBHOOK_PATH,
  voiceHubApiKey: raw.VOICE_HUB_API_KEY,
  webhookLegacySecretHeader: raw.WEBHOOK_LEGACY_SECRET_HEADER,
  webhookShadowMode: raw.WEBHOOK_SHADOW_MODE,
  corsAllowedOrigins: raw.CORS_ALLOWED_ORIGINS
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0),

  memoryDbPath: raw.MEMORY_DB_PATH,
  memoryWalEnabled: raw.MEMORY_WAL_ENABLED,
  memoryBusyTimeout: raw.MEMORY_BUSY_TIMEOUT,

  logLevel: raw.LOG_LEVEL,
  logFormat: raw.LOG_FORMAT,
  logPretty: raw.LOG_PRETTY,

  audioSampleRate: raw.AUDIO_SAMPLE_RATE,
  audioChannels: raw.AUDIO_CHANNELS,
  audioBitsPerSample: raw.AUDIO_BITS_PER_SAMPLE,
  audioFrameDurationMs: raw.AUDIO_FRAME_DURATION_MS,
  audioJitterBufferMs: raw.AUDIO_JITTER_BUFFER_MS,

  sessionTimeoutMs: raw.SESSION_TIMEOUT_MS,
  sessionMaxReconnectAttempts: raw.SESSION_MAX_RECONNECT_ATTEMPTS,
  sessionReconnectDelayMs: raw.SESSION_RECONNECT_DELAY_MS,

  voiceProvider: raw.VOICE_PROVIDER,
}));

export type InternalConfig = z.infer<typeof internalConfigSchema>;
