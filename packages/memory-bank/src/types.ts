/**
 * @voice-hub/memory-bank
 *
 * 记忆存储类型定义
 */

import type { SessionState, TurnMetadata } from '@voice-hub/shared-types';

/** 记忆条目类型 */
export enum MemoryType {
  /** 用户消息 */
  USER = 'user',
  /** 助手消息 */
  ASSISTANT = 'assistant',
  /** 系统消息 */
  SYSTEM = 'system',
  /** 事件日志 */
  EVENT = 'event',
  /** 错误日志 */
  ERROR = 'error',
}

/** 记忆条目状态 */
export enum MemoryStatus {
  /** 活跃 */
  ACTIVE = 'active',
  /** 已归档 */
  ARCHIVED = 'archived',
  /** 已删除 */
  DELETED = 'deleted',
}

/** 记忆条目 */
export interface MemoryEntry {
  /** 唯一 ID */
  id: string;
  /** 会话 ID */
  sessionId: string;
  /** 类型 */
  type: MemoryType;
  /** 状态 */
  status: MemoryStatus;
  /** 内容（文本/JSON） */
  content: string;
  /** 元数据（JSON） */
  metadata?: string;
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime?: number;
  /** 音频片段路径 */
  audioPath?: string;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
}

/** 会话记录 */
export interface SessionRecord {
  /** 会话 ID */
  sessionId: string;
  /** 会话状态 */
  state: SessionState;
  /** 开始时间 */
  startedAt: number;
  /** 结束时间 */
  endedAt?: number;
  /** 用户 ID */
  userId?: string;
  /** 频道 ID */
  channelId?: string;
  /** 额外元数据 */
  metadata?: string;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
}

/** 查询选项 */
export interface QueryOptions {
  /** 限制数量 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
  /** 排序 */
  orderBy?: 'createdAt' | 'startTime' | 'updatedAt';
  /** 排序方向 */
  order?: 'ASC' | 'DESC';
  /** 类型过滤 */
  types?: MemoryType[];
  /** 状态过滤 */
  status?: MemoryStatus;
  /** 时间范围 - 开始 */
  since?: number;
  /** 时间范围 - 结束 */
  until?: number;
}

/** 记忆存储配置 */
export interface MemoryBankConfig {
  /** 数据库路径 */
  dbPath: string;
  /** 启用 WAL 模式 */
  walEnabled: boolean;
  /** 忙碌超时（毫秒） */
  busyTimeout: number;
  /** 是否启用外键约束 */
  foreignKeys: boolean;
  /** 日志级别 */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/** 统计信息 */
export interface MemoryStats {
  /** 总会话数 */
  totalSessions: number;
  /** 活跃会话数 */
  activeSessions: number;
  /** 总记忆条目数 */
  totalEntries: number;
  /** 按类型分组的条目数 */
  entriesByType: Record<MemoryType, number>;
  /** 数据库大小（字节） */
  dbSize: number;
}
