/**
 * 全局常量定义
 */

export const CONSTANTS = {
  // 版本信息
  VERSION: '0.1.0',
  PROJECT_NAME: 'voice-hub',

  // Discord API 限制
  DISCORD: {
    MAX_BITRATE: 96000, // 96 kbps
    MIN_BITRATE: 8000, // 8 kbps
    DEFAULT_BITRATE: 48000, // 48 kbps
    OPUS_FRAME_SIZE: 960, // 20ms at 48kHz
    OPUS_SAMPLE_RATE: 48000,
    MAX_SILENCE_DURATION_MS: 300000, // 5 分钟无声音则断开
  },

  // 音频配置
  AUDIO: {
    TARGET_SAMPLE_RATE: 16000, // 豆包要求 16kHz
    TARGET_CHANNELS: 1, // 单声道
    TARGET_BITS_PER_SAMPLE: 16, // int16
    ENDIANNESS: 'little-endian' as const,
    FRAME_DURATION_MS: 100, // 100ms 一帧
    BYTES_PER_SAMPLE: 2, // int16 = 2 bytes
  },

  // 网络配置
  NETWORK: {
    WEBSOCKET_TIMEOUT_MS: 30000,
    WEBSOCKET_PING_INTERVAL_MS: 15000,
    WEBSOCKET_RECONNECT_DELAY_MS: 2000,
    WEBSOCKET_MAX_RECONNECT_ATTEMPTS: 10,
    HTTP_TIMEOUT_MS: 30000,
  },

  // Webhook 安全
  WEBHOOK: {
    MAX_TIMESTAMP_DRIFT_SEC: 300, // 5 分钟
    SIGNATURE_ALGORITHM: 'sha256' as const,
    SIGNATURE_HEADER_PREFIX: 'sha256=',
    MAX_REQUEST_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  },

  // Session 配置
  SESSION: {
    HEARTBEAT_INTERVAL_MS: 10000,
    ACTIVITY_TIMEOUT_MS: 60000, // 1 分钟无活动视为非活跃
    MAX_CONCURRENT_SESSIONS: 100,
  },

  // Memory Bank 配置
  MEMORY: {
    MAX_PITFALLS_RETURN: 10,
    MAX_PATTERNS_RETURN: 10,
    SIMILARITY_THRESHOLD: 0.7,
    CACHE_TTL_MS: 60000, // 1 分钟缓存
  },

  // 日志脱敏关键词
  SENSITIVE_KEYS: [
    'token',
    'secret',
    'password',
    'apikey',
    'api_key',
    'access_token',
    'authorization',
    'cookie',
    'session',
  ],
} as const;

// 类型导出
export type Constants = typeof CONSTANTS;
