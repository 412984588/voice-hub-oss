/**
 * 会话相关类型定义
 */

/**
 * 会话状态
 */
export enum SessionState {
  /** 未初始化 */
  IDLE = 'idle',
  /** 连接中 */
  CONNECTING = 'connecting',
  /** 已连接 */
  CONNECTED = 'connected',
  /** 监听中 */
  LISTENING = 'listening',
  /** 处理中 */
  PROCESSING = 'processing',
  /** 回应中 */
  RESPONDING = 'responding',
  /** 语音激活 */
  SPEAKING = 'speaking',
  /** 断连中 */
  DISCONNECTING = 'disconnecting',
  /** 已断开 */
  DISCONNECTED = 'disconnected',
  /** 错误 */
  ERROR = 'error',
}

/**
 * Discord 会话标识
 */
export interface DiscordSessionId {
  /** Guild ID */
  guildId: string;
  /** Voice Channel ID */
  voiceChannelId: string;
  /** Discord User ID */
  userId: string;
}

/**
 * 会话上下文
 */
export interface SessionContext {
  /** 唯一会话 ID */
  sessionId: string;
  /** Discord 标识 */
  discord: DiscordSessionId;
  /** 当前状态 */
  state: SessionState;
  /** Provider 会话 ID (如果有) */
  providerSessionId?: string;
  /** 后端任务 ID (如果有) */
  backendJobId?: string;
  /** OpenClaw Agent ID (如果有) */
  agentId?: string;
  /** 会话开始时间 */
  startedAt: number;
  /** 最后活动时间 */
  lastActivityAt: number;
  /** 重连次数 */
  reconnectCount: number;
}

/**
 * 会话事件
 */
export type SessionEvent =
  | { type: 'state_changed'; from: SessionState; to: SessionState }
  | { type: 'audio_received' }
  | { type: 'audio_sent' }
  | { type: 'speaking_started'; userId: string }
  | { type: 'speaking_stopped'; userId: string }
  | { type: 'error'; error: Error }
  | { type: 'disconnected'; reason: string };

/**
 * 会话配置
 */
export interface SessionConfig {
  /** 超时时间 (ms) */
  timeoutMs: number;
  /** 最大重连次数 */
  maxReconnectAttempts: number;
  /** 重连延迟 (ms) */
  reconnectDelayMs: number;
  /** 是否启用打断 */
  bargeInEnabled: boolean;
}
