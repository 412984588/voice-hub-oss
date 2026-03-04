/**
 * 音频相关类型定义
 */

/**
 * 音频帧格式
 */
export interface AudioFrame {
  /** PCM 数据 (int16, mono, 16kHz) */
  data: Int16Array;
  /** 采样率 */
  sampleRate: number;
  /** 声道数 */
  channels: number;
  /** 时间戳 (ms) */
  timestamp: number;
  /** 序列号 */
  sequence: number;
}

/**
 * 音频包方向
 */
export enum AudioDirection {
  /** 入站音频 (用户说话) */
  INGRESS = "ingress",
  /** 出站音频 (AI 回复) */
  EGRESS = "egress",
}

/**
 * Opus 编码器配置
 */
export interface OpusConfig {
  /** 帧大小 (samples) */
  frameSize: number;
  /** 采样率 */
  sampleRate: number;
  /** 比特率 */
  bitrate: number;
  /** 复杂度 (0-10) */
  complexity: number;
}

/**
 * 音频包统计
 */
export interface AudioStats {
  /** 接收包数 */
  packetsReceived: number;
  /** 发送包数 */
  packetsSent: number;
  /** 丢失包数 */
  packetsLost: number;
  /** 抖动 (ms) */
  jitter: number;
  /** 平均延迟 (ms) */
  latency: number;
}
