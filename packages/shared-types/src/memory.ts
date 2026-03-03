/**
 * Memory Bank 相关类型定义
 */

/**
 * 坑点记录
 */
export interface Pitfall {
  /** ID */
  id: string;
  /** 任务摘要 */
  taskSummary: string;
  /** 问题描述 */
  problem: string;
  /** 解决方案 */
  solution: string;
  /** 关键词 */
  keywords: string[];
  /** 发生次数 */
  occurrenceCount: number;
  /** 最后发生时间 */
  lastOccurredAt: number;
  /** 创建时间 */
  createdAt: number;
}

/**
 * 成功模式记录
 */
export interface SuccessfulPattern {
  /** ID */
  id: string;
  /** 任务摘要 */
  taskSummary: string;
  /** 模式描述 */
  pattern: string;
  /** 适用场景 */
  applicableScenario: string;
  /** 关键词 */
  keywords: string[];
  /** 使用次数 */
  usageCount: number;
  /** 成功率 */
  successRate: number;
  /** 最后使用时间 */
  lastUsedAt: number;
  /** 创建时间 */
  createdAt: number;
}

/**
 * 任务运行记录
 */
export interface TaskRun {
  /** ID */
  id: string;
  /** 会话 ID */
  sessionId: string;
  /** 任务摘要 */
  taskSummary: string;
  /** 关键词 */
  keywords: string[];
  /** 派发时间 */
  dispatchedAt: number;
  /** 完成时间 */
  completedAt?: number;
  /** 状态 */
  status: 'pending' | 'running' | 'completed' | 'failed';
  /** 结果摘要 */
  resultSummary?: string;
  /** 错误信息 */
  error?: string;
}

/**
 * 待播报通知
 */
export interface PendingAnnouncement {
  /** ID */
  id: string;
  /** 目标会话 ID (如果为空则为通用) */
  targetSessionId?: string;
  /** 目标 Guild ID */
  targetGuildId: string;
  /** 通知类型 */
  type: 'task_completed' | 'task_failed' | 'info' | 'error';
  /** 内容 */
  content: string;
  /** 优先级 */
  priority: 'immediate' | 'normal' | 'low';
  /** 创建时间 */
  createdAt: number;
  /** 是否已处理 */
  processed: boolean;
}

/**
 * 增强提示词结果
 */
export interface AugmentedPrompt {
  /** 原始提示 */
  original: string;
  /** 相关坑点 */
  pitfalls: Pitfall[];
  /** 相关成功模式 */
  patterns: SuccessfulPattern[];
  /** 增强后的提示 */
  augmented: string;
}

/**
 * Memory Bank 查询选项
 */
export interface MemoryQueryOptions {
  /** 最大返回坑点数 */
  maxPitfalls?: number;
  /** 最大返回模式数 */
  maxPatterns?: number;
  /** 相似度阈值 */
  similarityThreshold?: number;
}

/**
 * 对话轮次元数据
 */
export interface TurnMetadata {
  /** 会话 ID */
  sessionId: string;
  /** 轮次 ID */
  turnId: string;
  /** 用户输入 */
  userInput?: string;
  /** AI 回复 */
  aiResponse?: string;
  /** 时间戳 */
  timestamp: number;
  /** 关键词 */
  keywords?: string[];
  /** 关联任务 ID */
  taskId?: string;
}
