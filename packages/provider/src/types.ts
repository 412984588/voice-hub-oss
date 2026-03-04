/**
 * @voice-hub/provider
 *
 * 语音提供商类型定义
 */

import type {
  AudioFrame,
  ProviderEvent,
  ProviderError,
} from "@voice-hub/shared-types";

/** 音频帧推送回调 */
export type PushAudioCallback = (frame: AudioFrame) => void;

/** 事件监听器类型 */
export type EventListener = (event: ProviderEvent) => void;

/** 提供商状态 */
export enum ProviderState {
  IDLE = "idle",
  CONNECTING = "connecting",
  READY = "ready",
  STREAMING = "streaming",
  ERROR = "error",
  CLOSED = "closed",
}

/** 提供商能力标志 */
export interface ProviderCapabilities {
  /** 是否支持全双工 */
  fullDuplex: boolean;
  /** 是否支持中断 */
  interruption: boolean;
  /** 支持的音频编解码器 */
  codecs: ReadonlyArray<"pcm" | "opus" | "mp3">;
  /** 支持的采样率 */
  sampleRates: ReadonlyArray<number>;
}

/** 提供商统计信息 */
export interface ProviderStats {
  /** 连接时间戳 */
  connectedAt: number | null;
  /** 发送的音频帧数 */
  framesSent: number;
  /** 接收的音频帧数 */
  framesReceived: number;
  /** 发送的字节数 */
  bytesSent: number;
  /** 接收的字节数 */
  bytesReceived: number;
  /** 错误次数 */
  errorCount: number;
}

/** 提供商配置 */
export interface ProviderConfig {
  /** WebSocket URL */
  url: string;
  /** 认证令牌 */
  token?: string;
  /** 应用 ID */
  appId?: string;
  /** 会话 ID */
  sessionId: string;
  /** 音频采样率 */
  sampleRate: number;
  /** 音频通道数 */
  channels: number;
}

/** 音频提供商接口 */
export interface IAudioProvider {
  /** 只读：提供商状态 */
  readonly state: ProviderState;
  /** 只读：提供商能力 */
  readonly capabilities: ProviderCapabilities;
  /** 只读：统计信息 */
  readonly stats: ProviderStats;

  /** 连接到提供商 */
  connect(): Promise<void>;

  /** 断开连接 */
  disconnect(): Promise<void>;

  /** 开始音频流 */
  startStream(): Promise<void>;

  /** 停止音频流 */
  stopStream(): Promise<void>;

  /** 发送音频帧 */
  sendFrame(frame: AudioFrame): Promise<void>;

  /** 注册音频推送回调 */
  onAudio(callback: PushAudioCallback): void;

  /** 注册事件监听器 */
  on(event: "provider", listener: EventListener): void;
  on(
    event: "connected" | "disconnected" | "ready" | "error",
    listener: EventListener,
  ): void;
  on(event: "audio", listener: PushAudioCallback): void;

  /** 取消注册 */
  off(event: string, listener: EventListener | PushAudioCallback): void;

  /** 获取当前状态 */
  getState(): ProviderState;

  /** 获取统计信息 */
  getStats(): ProviderStats;
}
