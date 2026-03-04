/**
 * @voice-hub/core-runtime
 *
 * 核心运行时类型定义
 */

import type {
  SessionState,
  AudioFrame,
  ProviderEvent,
} from "@voice-hub/shared-types";
import type { IAudioProvider } from "@voice-hub/provider";
import type { MemoryStore } from "@voice-hub/memory-bank";
import type { Dispatcher } from "@voice-hub/backend-dispatcher";

/** 会话事件 */
export interface RuntimeSessionEvent {
  /** 事件类型 */
  type: SessionEventType;
  /** 会话 ID */
  sessionId: string;
  /** 时间戳 */
  timestamp: number;
  /** 附加数据 */
  data?: Record<string, unknown>;
}

/** 会话事件类型 */
export enum SessionEventType {
  /** 会话创建 */
  CREATED = "created",
  /** 会话启动 */
  STARTED = "started",
  /** 会话停止 */
  STOPPED = "stopped",
  /** 会话销毁 */
  DESTROYED = "destroyed",
  /** 状态变更 */
  STATE_CHANGED = "state_changed",
  /** 错误 */
  ERROR = "error",
}

/** 运行时配置 */
export interface RuntimeConfig {
  /** 会话超时（毫秒） */
  sessionTimeoutMs: number;
  /** 最大重连次数 */
  maxReconnectAttempts: number;
  /** 重连延迟（毫秒） */
  reconnectDelayMs: number;
  /** 是否自动保存音频 */
  autoSaveAudio: boolean;
  /** 音频保存目录 */
  audioSaveDir: string;
  /** 是否启用记忆存储 */
  enableMemoryStore: boolean;
  /** 是否启用后端分发 */
  enableBackendDispatch: boolean;
}

/** 会话上下文 */
export interface SessionContext {
  /** 会话 ID */
  sessionId: string;
  /** 用户 ID */
  userId?: string;
  /** 频道 ID */
  channelId?: string;
  /** 创建时间 */
  createdAt: number;
  /** 最后活跃时间 */
  lastActiveAt: number;
}

/** 会话管理器接口 */
export interface ISessionManager {
  /** 创建会话 */
  createSession(userId?: string, channelId?: string): Promise<string>;
  /** 销毁会话 */
  destroySession(sessionId: string): Promise<void>;
  /** 获取会话 */
  getSession(sessionId: string): SessionContext | null;
  /** 获取所有会话 */
  getAllSessions(): SessionContext[];
  /** 获取活跃会话数 */
  getActiveSessionCount(): number;
}

/** 状态机接口 */
export interface IStateMachine {
  /** 当前状态 */
  readonly currentState: SessionState;
  /** 转换到新状态 */
  transitionTo(state: SessionState): Promise<boolean>;
  /** 检查是否可以转换 */
  canTransitionTo(state: SessionState): boolean;
  /** 重置状态 */
  reset(): void;
}

/** 运行时事件 */
export interface RuntimeEvent {
  type:
    | "session_created"
    | "session_destroyed"
    | "state_changed"
    | "audio_received"
    | "audio_sent"
    | "error";
  sessionId?: string;
  timestamp: number;
  data?: unknown;
}
