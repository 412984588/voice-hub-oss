/**
 * @voice-hub/core-runtime
 *
 * 语音运行时 - 整合所有组件的核心运行时
 */

import type { Config } from '@voice-hub/shared-config';
import type { AudioFrame, WebhookPayload } from '@voice-hub/shared-types';
import { SessionState } from '@voice-hub/shared-types';
import type { IAudioProvider } from '@voice-hub/provider';
import type { createProvider } from '@voice-hub/provider';
import type { MemoryStore, DatabaseManager } from '@voice-hub/memory-bank';
import type { Dispatcher } from '@voice-hub/backend-dispatcher';
import type {
  RuntimeConfig,
  RuntimeEvent,
  SessionContext,
} from './types.js';
import { SessionManager } from './session-manager.js';
import { SessionEventType } from './types.js';

/** 运行时选项 */
export interface VoiceRuntimeOptions {
  config: Config;
  provider?: IAudioProvider;
  memoryStore?: MemoryStore;
  dispatcher?: Dispatcher;
}

/** 语音运行时类 */
export class VoiceRuntime {
  private config: Config;
  private runtimeConfig: RuntimeConfig;
  private provider: IAudioProvider | null;
  private memoryStore: MemoryStore | null;
  private dispatcher: Dispatcher | null;
  private sessionManager: SessionManager;
  private isRunning = false;

  constructor(options: VoiceRuntimeOptions) {
    this.config = options.config;
    this.provider = options.provider || null;
    this.memoryStore = options.memoryStore || null;
    this.dispatcher = options.dispatcher || null;

    this.runtimeConfig = {
      sessionTimeoutMs: this.config.sessionTimeoutMs,
      maxReconnectAttempts: this.config.sessionMaxReconnectAttempts,
      reconnectDelayMs: this.config.sessionReconnectDelayMs,
      autoSaveAudio: false,
      audioSaveDir: './audio',
      enableMemoryStore: !!this.memoryStore,
      enableBackendDispatch: !!this.dispatcher,
    };

    this.sessionManager = new SessionManager(
      this.runtimeConfig,
      this.memoryStore || undefined,
      this.dispatcher || undefined
    );
  }

  /** 启动运行时 */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    // 连接提供商
    if (this.provider) {
      await this.provider.connect();

      // 设置音频处理回调
      this.provider.on('audio', this.handleProviderAudio.bind(this));
      this.provider.on('connected', () => this.emit('ready'));
      this.provider.on('error', () => this.emit('error', {
        type: 'error',
        timestamp: Date.now(),
      } as RuntimeEvent));
    }

    this.isRunning = true;
    this.emit('started');
  }

  /** 停止运行时 */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // 断开提供商
    if (this.provider) {
      await this.provider.disconnect();
    }

    // 销毁所有会话
    await this.sessionManager.destroyAllSessions();

    this.isRunning = false;
    this.emit('stopped');
  }

  /** 创建新会话 */
  async createSession(userId?: string, channelId?: string): Promise<string> {
    const sessionId = await this.sessionManager.createSession(userId, channelId);

    this.emit('session_created', {
      type: 'session_created',
      sessionId,
      timestamp: Date.now(),
      data: { userId, channelId },
    } as RuntimeEvent);

    return sessionId;
  }

  /** 销毁会话 */
  async destroySession(sessionId: string): Promise<void> {
    await this.sessionManager.destroySession(sessionId);

    this.emit('session_destroyed', {
      type: 'session_destroyed',
      sessionId,
      timestamp: Date.now(),
    } as RuntimeEvent);
  }

  /** 发送音频帧到提供商 */
  async sendAudio(sessionId: string, frame: AudioFrame): Promise<void> {
    if (!this.provider) {
      throw new Error('No provider available');
    }

    const stateMachine = this.sessionManager.getStateMachine(sessionId);
    if (!stateMachine) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // 只有在 listening 状态才发送音频
    if (stateMachine.currentState !== SessionState.LISTENING) {
      return;
    }

    await this.provider.sendFrame(frame);

    this.emit('audio_sent', {
      type: 'audio_sent',
      sessionId,
      timestamp: Date.now(),
      data: { frameSize: frame.data.length },
    } as RuntimeEvent);
  }

  /** 开始监听 */
  async startListening(sessionId: string): Promise<void> {
    const stateMachine = this.sessionManager.getStateMachine(sessionId);
    if (!stateMachine) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    await stateMachine.transitionTo(SessionState.LISTENING);

    if (this.provider) {
      await this.provider.startStream();
    }
  }

  /** 停止监听 */
  async stopListening(sessionId: string): Promise<void> {
    const stateMachine = this.sessionManager.getStateMachine(sessionId);
    if (!stateMachine) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (this.provider) {
      await this.provider.stopStream();
    }

    await stateMachine.transitionTo(SessionState.IDLE);
  }

  /** 分发事件到后端 */
  async dispatchToBackend(payload: WebhookPayload): Promise<void> {
    if (!this.dispatcher) {
      return;
    }

    const result = await this.dispatcher.dispatch(payload);

    if (!result.success) {
      this.emit('error', {
        type: 'error',
        sessionId: payload.sessionId || '',
        timestamp: Date.now(),
      } as RuntimeEvent);
    }
  }

  /** 获取会话 */
  getSession(sessionId: string): SessionContext | null {
    return this.sessionManager.getSession(sessionId);
  }

  /** 获取所有会话 */
  getAllSessions(): SessionContext[] {
    return this.sessionManager.getAllSessions();
  }

  /** 获取活跃会话数 */
  getActiveSessionCount(): number {
    return this.sessionManager.getActiveSessionCount();
  }

  /** 检查是否运行中 */
  isActive(): boolean {
    return this.isRunning;
  }

  // ========== 事件处理 ==========

  private handleProviderAudio(frame: AudioFrame): void {
    // 这里需要确定是哪个会话的音频
    // 简化实现：假设只有一个活跃会话
    const sessions = this.sessionManager.getAllSessions();
    const activeSession = sessions.find((s) => {
      const sm = this.sessionManager.getStateMachine(s.sessionId);
      return sm?.currentState === SessionState.LISTENING;
    });

    if (activeSession) {
      this.emit('audio_received', {
        type: 'audio_received',
        sessionId: activeSession.sessionId,
        timestamp: Date.now(),
        data: { frame },
      } as RuntimeEvent);
    }
  }

  // ========== EventEmitter 风格的 emit/on ==========

  private listeners: Map<string, Array<(event: RuntimeEvent) => void>> = new Map();

  on(event: string, listener: (event: RuntimeEvent) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: string, listener: (event: RuntimeEvent) => void): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: RuntimeEvent): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(data || { type: event as any, timestamp: Date.now() });
        } catch (error) {
          this.logListenerError(event, error);
        }
      }
    }
  }

  private logListenerError(event: string, error: unknown): void {
    const detail = error instanceof Error
      ? (error.stack ?? error.message)
      : String(error);
    process.stderr.write(`[voice-runtime] Listener error for event "${event}": ${detail}\n`);
  }
}
