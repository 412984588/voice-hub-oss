/**
 * @voice-hub/core-runtime
 *
 * 会话管理器
 */

import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'eventemitter3';
import { SessionState } from '@voice-hub/shared-types';
import type {
  SessionContext,
  ISessionManager,
  RuntimeConfig,
  RuntimeEvent,
} from './types.js';
import { StateMachine } from './state-machine.js';
import type { IAudioProvider } from '@voice-hub/provider';
import type { MemoryStore } from '@voice-hub/memory-bank';
import type { Dispatcher } from '@voice-hub/backend-dispatcher';

/** 会话数据 */
interface SessionData {
  context: SessionContext;
  stateMachine: StateMachine;
  provider?: IAudioProvider;
  destroyTimeout?: ReturnType<typeof setTimeout>;
}

/** 会话管理器实现 */
export class SessionManager extends EventEmitter implements ISessionManager {
  private sessions: Map<string, SessionData> = new Map();
  private config: RuntimeConfig;
  private memoryStore?: MemoryStore;
  private dispatcher?: Dispatcher;

  constructor(
    config: RuntimeConfig,
    memoryStore?: MemoryStore,
    dispatcher?: Dispatcher
  ) {
    super();
    this.config = config;
    this.memoryStore = memoryStore;
    this.dispatcher = dispatcher;
  }

  /** 创建会话 */
  async createSession(
    userId?: string,
    channelId?: string
  ): Promise<string> {
    const sessionId = randomUUID();
    const now = Date.now();

    const context: SessionContext = {
      sessionId,
      userId,
      channelId,
      createdAt: now,
      lastActiveAt: now,
    };

    const stateMachine = new StateMachine(sessionId);

    // 监听状态变化
    stateMachine.on('state_changed', (event: RuntimeEvent) => {
      this.emit('state_changed', event);
      this.updateSessionActivity(sessionId);

      // 同步到记忆存储
      if (this.memoryStore) {
        const data = event.data as { oldState: SessionState; newState: SessionState };
        this.memoryStore.updateSessionState(sessionId, data.newState);
      }
    });

    const sessionData: SessionData = {
      context,
      stateMachine,
    };

    this.sessions.set(sessionId, sessionData);

    // 在记忆存储中创建会话
    if (this.memoryStore) {
      this.memoryStore.createSession(sessionId, userId, channelId);
    }

    this.emit('session_created', {
      type: 'session_created',
      sessionId,
      timestamp: now,
      data: { userId, channelId },
    } as RuntimeEvent);

    return sessionId;
  }

  /** 销毁会话 */
  async destroySession(sessionId: string): Promise<void> {
    const sessionData = this.sessions.get(sessionId);

    if (!sessionData) {
      return;
    }

    // 清除超时定时器
    if (sessionData.destroyTimeout) {
      clearTimeout(sessionData.destroyTimeout);
    }

    // 断开提供商连接
    if (sessionData.provider) {
      await sessionData.provider.disconnect();
    }

    // 更新状态为 idle
    sessionData.stateMachine.reset();

    this.sessions.delete(sessionId);

    this.emit('session_destroyed', {
      type: 'session_destroyed',
      sessionId,
      timestamp: Date.now(),
    } as RuntimeEvent);
  }

  /** 获取会话 */
  getSession(sessionId: string): SessionContext | null {
    const sessionData = this.sessions.get(sessionId);
    return sessionData?.context || null;
  }

  /** 获取所有会话 */
  getAllSessions(): SessionContext[] {
    return Array.from(this.sessions.values()).map((s) => s.context);
  }

  /** 获取活跃会话数 */
  getActiveSessionCount(): number {
    let count = 0;
    for (const sessionData of this.sessions.values()) {
      const state = sessionData.stateMachine.currentState;
      if (state !== SessionState.IDLE) {
        count++;
      }
    }
    return count;
  }

  /** 为会话设置提供商 */
  setSessionProvider(sessionId: string, provider: IAudioProvider): void {
    const sessionData = this.sessions.get(sessionId);
    if (sessionData) {
      sessionData.provider = provider;
    }
  }

  /** 获取会话的状态机 */
  getStateMachine(sessionId: string): StateMachine | null {
    const sessionData = this.sessions.get(sessionId);
    return sessionData?.stateMachine || null;
  }

  /** 更新会话活动时间 */
  private updateSessionActivity(sessionId: string): void {
    const sessionData = this.sessions.get(sessionId);
    if (sessionData) {
      sessionData.context.lastActiveAt = Date.now();
    }
  }

  /** 设置会话超时销毁 */
  setSessionTimeout(sessionId: string): void {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) return;

    // 清除现有超时
    if (sessionData.destroyTimeout) {
      clearTimeout(sessionData.destroyTimeout);
    }

    // 设置新超时
    sessionData.destroyTimeout = setTimeout(() => {
      // 检查会话是否仍然空闲
      if (sessionData.stateMachine.currentState === SessionState.IDLE) {
        void this.destroySession(sessionId).catch((error) => {
          this.emit('error', {
            type: 'error',
            sessionId,
            timestamp: Date.now(),
            data: {
              code: 'SESSION_TIMEOUT_DESTROY_FAILED',
              message: error instanceof Error ? error.message : String(error),
            },
          } as RuntimeEvent);
        });
      }
    }, this.config.sessionTimeoutMs);
  }

  /** 取消会话超时 */
  clearSessionTimeout(sessionId: string): void {
    const sessionData = this.sessions.get(sessionId);
    if (sessionData?.destroyTimeout) {
      clearTimeout(sessionData.destroyTimeout);
      sessionData.destroyTimeout = undefined;
    }
  }

  /** 清理所有会话 */
  async destroyAllSessions(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());
    await Promise.all(sessionIds.map((id) => this.destroySession(id)));
  }
}
