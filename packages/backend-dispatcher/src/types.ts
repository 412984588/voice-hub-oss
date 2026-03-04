/**
 * @voice-hub/backend-dispatcher
 *
 * 后端分发器类型定义
 */

import type { WebhookPayload, WebhookResponse } from '@voice-hub/shared-types';

/** 分发器配置 */
export interface DispatcherConfig {
  /** 后端 URL */
  url: string;
  /** 超时时间（毫秒） */
  timeoutMs: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试延迟（毫秒） */
  retryDelayMs: number;
  /** Secret 用于签名验证 */
  secret?: string;
  /** 是否启用指数退避 */
  exponentialBackoff: boolean;
}

/** 分发请求选项 */
export interface DispatchOptions {
  /** 超时覆盖 */
  timeout?: number;
  /** 重试次数覆盖 */
  maxRetries?: number;
  /** 额外头 */
  headers?: Record<string, string>;
  /** 请求 ID */
  requestId?: string;
}

/** 分发结果 */
export interface DispatchResult {
  /** 是否成功 */
  success: boolean;
  /** 响应数据 */
  response?: WebhookResponse;
  /** 错误信息 */
  error?: string;
  /** HTTP 状态码 */
  statusCode?: number;
  /** 尝试次数 */
  attempts: number;
  /** 总耗时（毫秒） */
  durationMs: number;
}

/** 后端类型 */
export enum BackendType {
  /** OpenClaw */
  OPENCLAW = 'openclaw',
  /** Claude Code */
  CLAUDE_CODE = 'claude-code',
  /** 自定义 */
  CUSTOM = 'custom',
}

/** 后端注册信息 */
export interface BackendRegistration {
  /** 后端类型 */
  type: BackendType;
  /** URL */
  url: string;
  /** 权重（用于负载均衡） */
  weight: number;
  /** 是否启用 */
  enabled: boolean;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}
