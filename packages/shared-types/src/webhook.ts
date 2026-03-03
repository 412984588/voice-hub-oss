/**
 * Webhook 相关类型定义
 */

/**
 * Webhook 事件类型
 */
export enum WebhookEventType {
  /** 后台任务完成 */
  BACKEND_TASK_COMPLETED = 'backend_task.completed',
  /** 后台任务失败 */
  BACKEND_TASK_FAILED = 'backend_task.failed',
  /** 自定义通知 */
  CUSTOM_NOTIFICATION = 'custom.notification',
}

/**
 * Webhook 请求头
 */
export interface WebhookHeaders {
  /** 签名 */
  'x-webhook-signature'?: string;
  /** 时间戳 */
  'x-webhook-timestamp'?: string;
  /** 事件 ID */
  'x-webhook-id'?: string;
  /** 事件类型 */
  'x-webhook-event'?: string;
}

/**
 * Webhook 请求体
 */
export interface WebhookRequestBody {
  /** 事件 ID */
  id: string;
  /** 事件类型 */
  event: WebhookEventType;
  /** 时间戳 */
  timestamp: number;
  /** 数据 */
  data: unknown;
  /** 签名 (备用) */
  signature?: string;
}

/**
 * 任务完成回调数据
 */
export interface TaskCompletedData {
  /** 任务 ID */
  taskId: string;
  /** 关联 ID */
  correlationId?: string;
  /** 会话 ID */
  sessionId?: string;
  /** Agent ID */
  agentId?: string;
  /** 结果 */
  result: {
    /** 摘要 */
    summary: string;
    /** 详细数据 */
    details?: unknown;
    /** 是否需要播报 */
    shouldAnnounce: boolean;
    /** 播报内容 (如果与 summary 不同) */
    announcementText?: string;
  };
  /** 完成时间 */
  completedAt: number;
}

/**
 * 任务失败回调数据
 */
export interface TaskFailedData {
  /** 任务 ID */
  taskId: string;
  /** 关联 ID */
  correlationId?: string;
  /** 会话 ID */
  sessionId?: string;
  /** Agent ID */
  agentId?: string;
  /** 错误 */
  error: {
    /** 错误码 */
    code: string;
    /** 错误消息 */
    message: string;
    /** 错误详情 */
    details?: unknown;
  };
  /** 失败时间 */
  failedAt: number;
}

/**
 * Webhook 处理结果
 */
export interface WebhookResult {
  /** 是否成功 */
  success: boolean;
  /** HTTP 状态码 */
  statusCode: number;
  /** 消息 */
  message?: string;
}

/**
 * Webhook 请求负载
 * 发送到 webhook 端点的数据
 */
export interface WebhookPayload {
  /** 事件 ID */
  id: string;
  /** 事件类型 */
  event: string;
  /** 时间戳 */
  timestamp: number;
  /** 数据 */
  data: unknown;
  /** 会话 ID (可选) */
  sessionId?: string;
  /** 关联 ID (可选) */
  correlationId?: string;
}

/**
 * Webhook 响应
 * 从 webhook 端点返回的数据
 */
export interface WebhookResponse {
  /** 状态 */
  status: string;
  /** 响应数据 (可选) */
  response?: unknown;
  /** 错误信息 (可选) */
  error?: string;
  /** 消息 (可选) */
  message?: string;
}
