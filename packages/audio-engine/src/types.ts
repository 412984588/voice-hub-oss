/**
 * Audio Engine 内部类型定义
 */

import type { AudioFrame, AudioStats } from "@voice-hub/shared-types";

/**
 * 音频引擎配置
 */
export interface AudioEngineConfig {
  /** 目标采样率 */
  targetSampleRate: number;
  /** 目标声道数 */
  targetChannels: number;
  /** 帧时长 (ms) */
  frameDurationMs: number;
  /** Jitter buffer 大小 (ms) */
  jitterBufferMs: number;
  /** 是否启用 watchdog */
  enableWatchdog: boolean;
  /** Watchdog 超时 (ms) */
  watchdogTimeoutMs: number;
}

/**
 * Opus 解码器接口
 */
export interface IOpusDecoder {
  /** 解码 Opus 数据 */
  decode(opusPacket: Buffer): Buffer | null;
  /** 销毁解码器 */
  destroy(): void;
}

/**
 * Opus 编码器接口
 */
export interface IOpusEncoder {
  /** 编码 PCM 数据 */
  encode(pcmData: Buffer): Buffer;
  /** 设置比特率 */
  setBitrate(bitrate: number): void;
  /** 销毁编码器 */
  destroy(): void;
}

/**
 * 音频接收器回调
 */
export interface AudioReceiverCallbacks {
  /** 接收到音频帧 */
  onFrame: (frame: AudioFrame) => void;
  /** 接收错误 */
  onError: (error: Error) => void;
  /** 接收超时 */
  onTimeout: () => void;
}

/**
 * 音频发送器状态
 */
export enum AudioSenderState {
  IDLE = "idle",
  PLAYING = "playing",
  PAUSED = "paused",
  ERROR = "error",
}

/**
 * 音频接收器状态
 */
export enum AudioReceiverState {
  IDLE = "idle",
  RECEIVING = "receiving",
  SILENCE = "silence",
  ERROR = "error",
}

/**
 * 语音自测结果
 */
export interface VoiceSelfTestResult {
  /** 是否通过 */
  passed: boolean;
  /** 检测项 */
  checks: {
    /** Opus 编解码 */
    opusCodec: { passed: boolean; error?: string };
    /** 音频接收 */
    audioReceive: { passed: boolean; error?: string };
    /** 音频发送 */
    audioSend: { passed: boolean; error?: string };
    /** 连接稳定性 */
    connectionStability: { passed: boolean; error?: string };
  };
  /** 统计信息 */
  stats: AudioStats;
}
