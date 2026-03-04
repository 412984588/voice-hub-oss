/**
 * Provider 相关类型定义
 */

/**
 * Provider 类型
 */
export enum ProviderType {
  /** 禁用 (仅本地 mock) */
  DISABLED = 'disabled',
  /** 本地 mock (测试用) */
  LOCAL_MOCK = 'local-mock',
  /** 火山引擎豆包 */
  DOUBAO = 'doubao',
}

/**
 * Provider 连接状态
 */
export enum ProviderState {
  /** 未连接 */
  DISCONNECTED = 'disconnected',
  /** 连接中 */
  CONNECTING = 'connecting',
  /** 已连接 */
  CONNECTED = 'connected',
  /** 错误 */
  ERROR = 'error',
}

/**
 * 上行音频帧
 */
export interface UplinkAudioFrame {
  /** PCM 数据 */
  data: Int16Array;
  /** 序列号 */
  sequence: number;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 下行音频帧 */
export interface DownlinkAudioFrame {
  /** PCM 数据 */
  data: Int16Array;
  /** 序列号 */
  sequence: number;
  /** 时间戳 */
  timestamp: number;
  /** 是否为结束帧 */
  isFinal: boolean;
}

/**
 * 工具调用事件
 */
export interface ToolCallEvent {
  /** 工具名称 */
  name: string;
  /** 参数 */
  parameters: Record<string, unknown>;
  /** 调用 ID */
  callId: string;
}

/**
 * 文本注入请求
 */
export interface TextInjectionRequest {
  /** 文本内容 */
  text: string;
  /** 是否为结束标记 */
  isFinal?: boolean;
}

/**
 * 主动播报请求
 */
export interface TTSRequest {
  /** 要播报的文本 */
  text: string;
  /** 优先级 */
  priority: 'immediate' | 'normal' | 'low';
  /** 会话 ID */
  sessionId: string;
}

/**
 * Provider 配置
 */
export interface ProviderConfig {
  /** Provider 类型 */
  type: ProviderType;
  /** WebSocket URL */
  wsUrl?: string;
  /** App ID */
  appId?: string;
  /** Access Token */
  accessToken?: string;
  /** 额外配置 */
  extra?: Record<string, unknown>;
}

/**
 * Provider 错误
 */
export interface ProviderError {
  /** 错误码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 是否可重试 */
  retryable: boolean;
  /** 原始错误 */
  cause?: Error;
}
