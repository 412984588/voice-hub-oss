/**
 * @voice-hub/backend-dispatcher
 *
 * 后端分发器实现
 */

import type { WebhookPayload, WebhookResponse } from '@voice-hub/shared-types';
import type {
  DispatcherConfig,
  DispatchOptions,
  DispatchResult,
} from './types.js';
import { signWebhookPayload } from './signature.js';

/** HTTP 分发器 */
export class Dispatcher {
  private config: DispatcherConfig;
  private inflightControllers: Set<AbortController> = new Set();

  constructor(config: DispatcherConfig) {
    this.config = config;
  }

  /** 更新配置 */
  updateConfig(config: Partial<DispatcherConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /** 分发到后端 */
  async dispatch(
    payload: WebhookPayload,
    options: DispatchOptions = {}
  ): Promise<DispatchResult> {
    const startTime = Date.now();
    const timeout = options.timeout ?? this.config.timeoutMs;
    const maxRetries = options.maxRetries ?? this.config.maxRetries;

    let lastError: Error | null = null;
    let attempts = 0;
    const webhookTimestamp = String(payload.timestamp);
    const webhookSignature = this.config.secret
      ? signWebhookPayload(payload, this.config.secret, webhookTimestamp)
      : null;

    for (let i = 0; i <= maxRetries; i++) {
      attempts = i + 1;

      try {
        const result = await this.fetchWithTimeout(
          this.config.url,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'voice-hub/0.1.0',
              ...(options.headers ?? {}),
              ...(webhookSignature ? {
                'X-Webhook-Signature': webhookSignature,
                'X-Webhook-Timestamp': webhookTimestamp,
              } : {}),
              ...(options.requestId ? {
                'X-Request-ID': options.requestId,
              } : {}),
            },
            body: JSON.stringify(payload),
          },
          timeout
        );

        const response = await this.parseResponse(result);
        const durationMs = Date.now() - startTime;

        return {
          success: true,
          response,
          statusCode: result.status,
          attempts,
          durationMs,
        };
      } catch (error) {
        lastError = error as Error;

        // 最后一次尝试失败，不再重试
        if (i >= maxRetries) {
          break;
        }

        // 计算重试延迟
        const delay = this.config.exponentialBackoff
          ? this.config.retryDelayMs * Math.pow(2, i)
          : this.config.retryDelayMs;

        await this.sleep(delay);
      }
    }

    // 所有尝试都失败
    const durationMs = Date.now() - startTime;
    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      attempts,
      durationMs,
    };
  }

  /** 发送带超时的请求 */
  private async fetchWithTimeout(
    url: string,
    init: RequestInit & { timeout?: number },
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController();
    this.inflightControllers.add(controller);
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
      this.inflightControllers.delete(controller);
    }
  }

  /** 解析响应 */
  private async parseResponse(response: Response): Promise<WebhookResponse> {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error(`Unexpected content type: ${contentType}`);
    }

    const data = await response.json() as unknown;

    // 验证响应格式
    if (!this.isValidWebhookResponse(data)) {
      throw new Error('Invalid webhook response format');
    }

    return data;
  }

  /** 验证响应格式 */
  private isValidWebhookResponse(data: unknown): data is WebhookResponse {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    const obj = data as Record<string, unknown>;

    // 必须有 status
    if (typeof obj.status !== 'string') {
      return false;
    }

    // 如果有 response，必须是对象
    if (obj.response !== undefined && typeof obj.response !== 'object') {
      return false;
    }

    return true;
  }

  /** 取消正在进行的请求 */
  abort(): void {
    for (const controller of this.inflightControllers) {
      controller.abort();
    }
    this.inflightControllers.clear();
  }

  /** 睡眠指定毫秒 */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** 健康检查 */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(this.config.url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok || response.status === 405; // 405 Method Not Allowed 也算健康
    } catch {
      return false;
    }
  }
}

/** 负载均衡分发器 */
export class LoadBalancedDispatcher {
  private backends: Map<string, Dispatcher> = new Map();
  private currentIndex = 0;

  /** 注册后端 */
  registerBackend(name: string, config: DispatcherConfig): void {
    this.backends.set(name, new Dispatcher(config));
  }

  /** 注销后端 */
  unregisterBackend(name: string): void {
    const dispatcher = this.backends.get(name);
    dispatcher?.abort();
    this.backends.delete(name);
  }

  /** 获取健康的后端 */
  private getHealthyBackend(): Dispatcher | null {
    const entries = Array.from(this.backends.entries());

    if (entries.length === 0) {
      return null;
    }

    // 简单的轮询策略
    for (let i = 0; i < entries.length; i++) {
      const index = (this.currentIndex + i) % entries.length;
      const [name, dispatcher] = entries[index];

      // 这里可以添加健康检查
      this.currentIndex = (index + 1) % entries.length;
      return dispatcher;
    }

    return null;
  }

  /** 分发到任意可用的后端 */
  async dispatch(
    payload: WebhookPayload,
    options?: DispatchOptions
  ): Promise<DispatchResult> {
    const backend = this.getHealthyBackend();

    if (!backend) {
      return {
        success: false,
        error: 'No healthy backend available',
        attempts: 0,
        durationMs: 0,
      };
    }

    return backend.dispatch(payload, options);
  }

  /** 获取所有后端名称 */
  getBackendNames(): string[] {
    return Array.from(this.backends.keys());
  }

  /** 关闭所有后端 */
  closeAll(): void {
    for (const dispatcher of this.backends.values()) {
      dispatcher.abort();
    }
    this.backends.clear();
  }
}
