/**
 * @voice-hub/app
 *
 * Web 服务器 - 提供 API 和 WebSocket 接口
 */

import type { Config } from '@voice-hub/shared-config';
import type { VoiceRuntime } from '@voice-hub/core-runtime';
import type { WebhookPayload } from '@voice-hub/shared-types';
import {
  isWebhookTimestampFresh,
  verifyWebhookSignature,
} from '@voice-hub/backend-dispatcher';
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import { randomUUID, timingSafeEqual } from 'node:crypto';

/** Voice Hub Web 服务器 */
export class VoiceHubServer {
  private config: Config;
  private runtime: VoiceRuntime;
  private server: ReturnType<typeof Fastify>;
  private isRunning = false;

  constructor(config: Config, runtime: VoiceRuntime) {
    this.config = config;
    this.runtime = runtime;

    this.server = Fastify({
      logger: {
        level: this.config.logLevel,
      },
    });

    this.server.register(cors, {
      origin: true,
    });

    this.server.register(websocket);

    this.setupRoutes();
    this.setupWebSocket();
  }

  /** 设置 HTTP 路由 */
  private setupRoutes(): void {
    // 健康检查
    this.server.get('/health', async () => ({
      status: 'ok',
      timestamp: Date.now(),
      uptime: process.uptime(),
    }));

    // 会话管理
    this.server.post('/api/sessions', async (request, reply) => {
      const body = request.body as { userId?: string; channelId?: string };
      const sessionId = await this.runtime.createSession(body.userId, body.channelId);
      return { sessionId };
    });

    this.server.delete('/api/sessions/:sessionId', async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string };
      await this.runtime.destroySession(sessionId);
      return { success: true };
    });

    this.server.get('/api/sessions/:sessionId', async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string };
      const session = this.runtime.getSession(sessionId);
      if (!session) {
        return reply.code(404).send({ error: 'Session not found' });
      }
      return session;
    });

    this.server.get('/api/sessions', async () => {
      const sessions = this.runtime.getAllSessions();
      return { sessions };
    });

    // 语音控制
    this.server.post('/api/sessions/:sessionId/listening', async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string };
      await this.runtime.startListening(sessionId);
      return { success: true };
    });

    this.server.delete('/api/sessions/:sessionId/listening', async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string };
      await this.runtime.stopListening(sessionId);
      return { success: true };
    });

    // TTS（发送文本到语音）
    this.server.post('/api/sessions/:sessionId/tts', async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string };
      const { text } = request.body as { text: string };

      // TODO: 实现 TTS
      return { success: true, message: 'TTS not yet implemented' };
    });

    // Webhook 接收
    this.server.post(`${this.config.webhookPath}`, async (request, reply) => {
      const payload = request.body as WebhookPayload;
      const signature = this.getSingleHeaderValue(request.headers['x-webhook-signature']);
      const timestamp = this.getSingleHeaderValue(request.headers['x-webhook-timestamp']);
      const legacySecret = this.getSingleHeaderValue(request.headers['x-webhook-secret']);

      if (signature && timestamp) {
        if (!isWebhookTimestampFresh(timestamp)) {
          return reply.code(401).send({ error: 'Stale webhook timestamp' });
        }

        if (!verifyWebhookSignature(payload, this.config.webhookSecret, signature, timestamp)) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }
      } else if (!legacySecret || !this.constantTimeEquals(legacySecret, this.config.webhookSecret)) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      // 处理 webhook
      // TODO: 实现完整的 webhook 处理逻辑

      return { success: true };
    });

    // 状态
    this.server.get('/api/status', async () => {
      return {
        running: this.runtime.isActive(),
        activeSessions: this.runtime.getActiveSessionCount(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      };
    });
  }

  /** 设置 WebSocket */
  private setupWebSocket(): void {
    const self = this;
    this.server.register(async function (fastify) {
      fastify.get('/ws', { websocket: true }, async (connection, req) => {
        const socket = connection.socket;

        // 发送欢迎消息
        socket.send(JSON.stringify({
          type: 'connected',
          timestamp: Date.now(),
        }));

        // 处理接收到的消息
        socket.on('message', async (data) => {
          try {
            const message = JSON.parse(data.toString());

            switch (message.type) {
              case 'ping':
                socket.send(JSON.stringify({
                  type: 'pong',
                  timestamp: Date.now(),
                }));
                break;

              case 'create_session':
                const sessionId = await self.runtime.createSession(
                  message.userId,
                  message.channelId
                );
                socket.send(JSON.stringify({
                  type: 'session_created',
                  sessionId,
                  timestamp: Date.now(),
                }));
                break;

              case 'destroy_session':
                await self.runtime.destroySession(message.sessionId);
                socket.send(JSON.stringify({
                  type: 'session_destroyed',
                  sessionId: message.sessionId,
                  timestamp: Date.now(),
                }));
                break;

              case 'start_listening':
                await self.runtime.startListening(message.sessionId);
                socket.send(JSON.stringify({
                  type: 'listening_started',
                  sessionId: message.sessionId,
                  timestamp: Date.now(),
                }));
                break;

              case 'stop_listening':
                await self.runtime.stopListening(message.sessionId);
                socket.send(JSON.stringify({
                  type: 'listening_stopped',
                  sessionId: message.sessionId,
                  timestamp: Date.now(),
                }));
                break;

              default:
                socket.send(JSON.stringify({
                  type: 'error',
                  message: `Unknown message type: ${message.type}`,
                  timestamp: Date.now(),
                }));
            }
          } catch (error) {
            socket.send(JSON.stringify({
              type: 'error',
              message: error instanceof Error ? error.message : String(error),
              timestamp: Date.now(),
            }));
          }
        });

        socket.on('close', () => {
          // 清理
        });
      });
    });
  }

  /** 启动服务器 */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    await this.server.listen({
      port: this.config.webhookPort,
      host: '0.0.0.0',
    });

    this.isRunning = true;
  }

  /** 停止服务器 */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    await this.server.close();
    this.isRunning = false;
  }

  /** 获取服务器地址 */
  getAddress(): string {
    const address = this.server.server.address();
    if (typeof address === 'string') {
      return address;
    }
    if (address === null) {
      return 'unknown';
    }
    return `http://${address.address}:${address.port}`;
  }

  private getSingleHeaderValue(value: string | string[] | undefined): string | null {
    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value) && value.length > 0) {
      return value[0] ?? null;
    }

    return null;
  }

  private constantTimeEquals(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left, 'utf8');
    const rightBuffer = Buffer.from(right, 'utf8');

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }
}
