/**
 * @voice-hub/app
 *
 * Web 服务器 - 提供 API 和 WebSocket 接口
 */

import type { Config } from '@voice-hub/shared-config';
import type { VoiceRuntime } from '@voice-hub/core-runtime';
import type { AudioFrame, WebhookPayload } from '@voice-hub/shared-types';
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
  private readonly ttsRequestTimeoutMs = 5000;
  private readonly ttsRetryCount = 2;

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
      const { text } = request.body as { text?: string };

      if (typeof text !== 'string' || text.trim().length === 0) {
        return reply.code(400).send({ error: 'text is required' });
      }

      const session = this.runtime.getSession(sessionId);
      if (!session) {
        return reply.code(404).send({ error: 'Session not found' });
      }

      const synthesis = await this.synthesizeText(text.trim());
      await this.runtime.sendAudio(sessionId, synthesis.frame);

      return {
        success: true,
        source: synthesis.source,
        samples: synthesis.frame.data.length,
      };
    });

    // Webhook 接收
    this.server.post(`${this.config.webhookPath}`, async (request, reply) => {
      const payload = request.body;
      const signature = this.getSingleHeaderValue(request.headers['x-webhook-signature']);
      const timestamp = this.getSingleHeaderValue(request.headers['x-webhook-timestamp']);
      const legacySecret = this.getSingleHeaderValue(request.headers['x-webhook-secret']);

      if (!this.isWebhookPayload(payload)) {
        return reply.code(400).send({ error: 'Invalid webhook payload' });
      }

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

      const result = await this.processWebhookPayload(payload);
      return { success: true, ...result };
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

  private isWebhookPayload(payload: unknown): payload is WebhookPayload {
    if (typeof payload !== 'object' || payload === null) {
      return false;
    }

    const record = payload as Record<string, unknown>;
    return (
      typeof record.id === 'string' &&
      typeof record.event === 'string' &&
      typeof record.timestamp === 'number'
    );
  }

  private async processWebhookPayload(payload: WebhookPayload): Promise<Record<string, unknown>> {
    switch (payload.event) {
      case 'backend_task.completed': {
        const sessionId = this.extractSessionId(payload);
        const announceText = this.extractAnnouncementText(payload);
        const announced = sessionId && announceText
          ? await this.emitTts(sessionId, announceText)
          : false;
        return { handled: true, event: payload.event, announced };
      }
      case 'custom.notification': {
        const sessionId = this.extractSessionId(payload);
        const announceText = this.extractNotificationText(payload);
        const announced = sessionId && announceText
          ? await this.emitTts(sessionId, announceText)
          : false;
        return { handled: true, event: payload.event, announced };
      }
      default:
        return { handled: false, event: payload.event };
    }
  }

  private extractSessionId(payload: WebhookPayload): string | null {
    if (payload.sessionId) {
      return payload.sessionId;
    }

    if (typeof payload.data === 'object' && payload.data !== null) {
      const sessionId = (payload.data as Record<string, unknown>).sessionId;
      if (typeof sessionId === 'string' && sessionId.length > 0) {
        return sessionId;
      }
    }

    return null;
  }

  private extractAnnouncementText(payload: WebhookPayload): string | null {
    if (typeof payload.data !== 'object' || payload.data === null) {
      return null;
    }

    const data = payload.data as Record<string, unknown>;
    const result = data.result;
    if (typeof result !== 'object' || result === null) {
      return null;
    }

    const normalized = result as Record<string, unknown>;
    const shouldAnnounce = normalized.shouldAnnounce === true;
    if (!shouldAnnounce) {
      return null;
    }

    if (typeof normalized.announcementText === 'string' && normalized.announcementText.trim().length > 0) {
      return normalized.announcementText.trim();
    }

    if (typeof normalized.summary === 'string' && normalized.summary.trim().length > 0) {
      return normalized.summary.trim();
    }

    return null;
  }

  private extractNotificationText(payload: WebhookPayload): string | null {
    if (typeof payload.data !== 'object' || payload.data === null) {
      return null;
    }

    const text = (payload.data as Record<string, unknown>).text;
    if (typeof text === 'string' && text.trim().length > 0) {
      return text.trim();
    }

    return null;
  }

  private async emitTts(sessionId: string, text: string): Promise<boolean> {
    const session = this.runtime.getSession(sessionId);
    if (!session) {
      return false;
    }

    const synthesis = await this.synthesizeText(text);
    await this.runtime.sendAudio(sessionId, synthesis.frame);
    return true;
  }

  private async synthesizeText(text: string): Promise<{ frame: AudioFrame; source: 'tts-api' | 'fallback' }> {
    const fromApi = await this.synthesizeFromApi(text);
    if (fromApi) {
      return { frame: fromApi, source: 'tts-api' };
    }
    return { frame: this.synthesizeFallback(text), source: 'fallback' };
  }

  private async synthesizeFromApi(text: string): Promise<AudioFrame | null> {
    const ttsApiUrl = process.env.TTS_API_URL?.trim();
    if (!ttsApiUrl) {
      return null;
    }

    const apiKey = process.env.TTS_API_KEY?.trim();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.ttsRetryCount; attempt++) {
      try {
        const response = await fetch(ttsApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({ text }),
          signal: AbortSignal.timeout(this.ttsRequestTimeoutMs),
        });

        if (!response.ok) {
          throw new Error(`TTS API error: ${response.status}`);
        }

        const body = await response.json() as Record<string, unknown>;
        const audioBase64 = body.audioBase64;
        if (typeof audioBase64 !== 'string' || audioBase64.length === 0) {
          throw new Error('TTS API missing audioBase64');
        }

        const sampleRate = Number(body.sampleRate ?? this.config.audioSampleRate);
        const channels = Number(body.channels ?? this.config.audioChannels);
        return this.decodePcm16(audioBase64, sampleRate, channels);
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.ttsRetryCount) {
          await this.sleep(200 * (attempt + 1));
        }
      }
    }

    this.server.log.warn({ err: lastError }, 'TTS API failed, falling back to local synth');
    return null;
  }

  private decodePcm16(audioBase64: string, sampleRate: number, channels: number): AudioFrame {
    const buffer = Buffer.from(audioBase64, 'base64');
    const length = Math.floor(buffer.byteLength / 2);
    const pcm = new Int16Array(length);

    for (let i = 0; i < length; i++) {
      pcm[i] = buffer.readInt16LE(i * 2);
    }

    return {
      data: pcm,
      sampleRate,
      channels,
      timestamp: Date.now(),
      sequence: Date.now() % Number.MAX_SAFE_INTEGER,
    };
  }

  private synthesizeFallback(text: string): AudioFrame {
    const sampleRate = this.config.audioSampleRate;
    const channels = this.config.audioChannels;
    const durationMs = Math.min(2000, Math.max(200, text.length * 30));
    const sampleCount = Math.max(1, Math.floor(sampleRate * durationMs / 1000));
    const pcm = new Int16Array(sampleCount * channels);

    const amplitude = Math.floor(0.2 * 32767);
    const frequency = 220;
    for (let i = 0; i < sampleCount; i++) {
      const value = Math.floor(amplitude * Math.sin((2 * Math.PI * frequency * i) / sampleRate));
      for (let ch = 0; ch < channels; ch++) {
        pcm[(i * channels) + ch] = value;
      }
    }

    return {
      data: pcm,
      sampleRate,
      channels,
      timestamp: Date.now(),
      sequence: Date.now() % Number.MAX_SAFE_INTEGER,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
