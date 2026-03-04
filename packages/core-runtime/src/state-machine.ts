/**
 * @voice-hub/core-runtime
 *
 * 会话状态机
 */

import { EventEmitter } from 'eventemitter3';
import { SessionState } from '@voice-hub/shared-types';
import type { IStateMachine, RuntimeEvent } from './types.js';

/** 状态转换表 */
const STATE_TRANSITIONS: Partial<Record<SessionState, SessionState[]>> = {
  [SessionState.IDLE]: [SessionState.LISTENING, SessionState.PROCESSING],
  [SessionState.LISTENING]: [SessionState.PROCESSING, SessionState.IDLE],
  [SessionState.PROCESSING]: [SessionState.LISTENING, SessionState.RESPONDING, SessionState.IDLE],
  [SessionState.RESPONDING]: [SessionState.LISTENING, SessionState.IDLE],
  [SessionState.CONNECTING]: [SessionState.CONNECTED],
  [SessionState.CONNECTED]: [SessionState.IDLE, SessionState.LISTENING],
  [SessionState.SPEAKING]: [SessionState.IDLE, SessionState.LISTENING],
  [SessionState.DISCONNECTING]: [SessionState.DISCONNECTED],
  [SessionState.ERROR]: [SessionState.IDLE],
};

/** 会话状态机 */
export class StateMachine extends EventEmitter implements IStateMachine {
  private _currentState: SessionState = SessionState.IDLE;
  private sessionId: string;

  constructor(sessionId: string) {
    super();
    this.sessionId = sessionId;
  }

  get currentState(): SessionState {
    return this._currentState;
  }

  /** 转换到新状态 */
  async transitionTo(newState: SessionState): Promise<boolean> {
    if (!this.canTransitionTo(newState)) {
      this.emit('error', {
        type: 'error',
        sessionId: this.sessionId,
        timestamp: Date.now(),
        data: {
          message: `Invalid state transition: ${this._currentState} -> ${newState}`,
        },
      } as RuntimeEvent);
      return false;
    }

    const oldState = this._currentState;
    this._currentState = newState;

    this.emit('state_changed', {
      type: 'state_changed',
      sessionId: this.sessionId,
      timestamp: Date.now(),
      data: { oldState, newState },
    } as RuntimeEvent);

    return true;
  }

  /** 检查是否可以转换 */
  canTransitionTo(state: SessionState): boolean {
    if (this._currentState === state) {
      return true; // 允许自转换
    }

    const allowedStates = STATE_TRANSITIONS[this._currentState];
    return allowedStates?.includes(state) ?? false;
  }

  /** 重置状态 */
  reset(): void {
    const oldState = this._currentState;
    this._currentState = SessionState.IDLE;

    this.emit('state_changed', {
      type: 'state_changed',
      sessionId: this.sessionId,
      timestamp: Date.now(),
      data: { oldState, newState: SessionState.IDLE },
    } as RuntimeEvent);
  }

  /** 强制设置状态（用于恢复） */
  forceSetState(state: SessionState): void {
    this._currentState = state;
  }
}
