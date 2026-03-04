/**
 * 事件系统类型定义
 */

/**
 * 基础事件
 */
export interface BaseEvent {
  /** 事件类型 */
  type: string;
  /** 时间戳 */
  timestamp: number;
  /** 事件 ID */
  eventId: string;
}

/**
 * 音频事件
 */
export interface AudioEvent extends BaseEvent {
  type: "audio";
  /** 方向 */
  direction: "ingress" | "egress";
  /** 数据长度 */
  dataLength: number;
}

/**
 * 系统会话事件
 */
export interface SystemSessionEvent extends BaseEvent {
  type: "session";
  /** 会话 ID */
  sessionId: string;
  /** 事件子类型 */
  subType: "created" | "destroyed" | "state_changed";
  /** 额外数据 */
  data?: Record<string, unknown>;
}

/**
 * Provider 事件
 */
export interface ProviderEvent extends BaseEvent {
  type: "provider";
  /** Provider 类型 */
  provider: string;
  /** 事件子类型 */
  subType: "connected" | "disconnected" | "error" | "tool_call";
  /** 额外数据 */
  data?: Record<string, unknown>;
}

/**
 * 后台任务事件
 */
export interface BackendTaskEvent extends BaseEvent {
  type: "backend_task";
  /** 任务 ID */
  taskId: string;
  /** 事件子类型 */
  subType: "dispatched" | "completed" | "failed" | "timeout";
  /** 额外数据 */
  data?: Record<string, unknown>;
}

/**
 * 联合事件类型
 */
export type VoiceHubEvent =
  | AudioEvent
  | SystemSessionEvent
  | ProviderEvent
  | BackendTaskEvent;

/**
 * 事件监听器
 */
export type EventListener<T extends VoiceHubEvent = VoiceHubEvent> = (
  event: T,
) => void | Promise<void>;

/**
 * 事件过滤器
 */
export type EventFilter<T extends VoiceHubEvent = VoiceHubEvent> = (
  event: T,
) => boolean;
