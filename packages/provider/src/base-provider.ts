/**
 * @voice-hub/provider
 *
 * 音频提供商基类
 */

import { EventEmitter } from 'eventemitter3';
import type {
  AudioFrame,
  ProviderEvent,
  ProviderError,
} from '@voice-hub/shared-types';
import type {
  IAudioProvider,
  ProviderCapabilities,
  ProviderConfig,
  ProviderStats,
  PushAudioCallback,
  EventListener,
} from './types.js';
import { ProviderState } from './types.js';

export abstract class BaseProvider extends EventEmitter implements IAudioProvider {
  protected _state: ProviderState = ProviderState.IDLE;
  protected _stats: ProviderStats = {
    connectedAt: null,
    framesSent: 0,
    framesReceived: 0,
    bytesSent: 0,
    bytesReceived: 0,
    errorCount: 0,
  };
  protected _config: ProviderConfig;
  protected _audioCallbacks: Set<PushAudioCallback> = new Set();
  protected _eventListeners: Map<string, Set<EventListener>> = new Map();

  abstract readonly capabilities: ProviderCapabilities;

  constructor(config: ProviderConfig) {
    super();
    this._config = config;
  }

  get state(): ProviderState {
    return this._state;
  }

  get stats(): ProviderStats {
    return { ...this._stats };
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract startStream(): Promise<void>;
  abstract stopStream(): Promise<void>;
  abstract sendFrame(frame: AudioFrame): Promise<void>;

  onAudio(callback: PushAudioCallback): void {
    this._audioCallbacks.add(callback);
  }

  on(event: 'audio', listener: PushAudioCallback): this;
  on(event: 'provider' | 'connected' | 'disconnected' | 'ready' | 'error', listener: EventListener): this;
  on(event: string, listener: EventListener | PushAudioCallback): this {
    if (event === 'audio') {
      this._audioCallbacks.add(listener as PushAudioCallback);
    } else {
      if (!this._eventListeners.has(event)) {
        this._eventListeners.set(event, new Set());
      }
      this._eventListeners.get(event)!.add(listener as EventListener);
    }
    return this;
  }

  off(event: string | symbol, listener: EventListener | PushAudioCallback): this {
    if (event === 'audio') {
      this._audioCallbacks.delete(listener as PushAudioCallback);
    } else {
      const listeners = this._eventListeners.get(String(event));
      if (listeners) {
        listeners.delete(listener as EventListener);
      }
    }
    return this;
  }

  getState(): ProviderState {
    return this._state;
  }

  getStats(): ProviderStats {
    return { ...this._stats };
  }

  protected setState(state: ProviderState): void {
    const oldState = this._state;
    this._state = state;
    this.emit('stateChanged', { oldState, newState: state });
  }

  protected emitAudio(frame: AudioFrame): void {
    for (const callback of this._audioCallbacks) {
      try {
        callback(frame);
      } catch (error) {
        this.logCallbackError('Audio callback error', error);
      }
    }
  }

  protected emitEvent(event: ProviderEvent): void {
    this.notifyEventListeners(event.type, event);

    if (event.type === 'provider') {
      this.notifyEventListeners(event.subType, event);
    }
  }

  private notifyEventListeners(eventName: string, event: ProviderEvent): void {
    const listeners = this._eventListeners.get(eventName);
    if (!listeners) {
      return;
    }

    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        this.logCallbackError('Event listener error', error);
      }
    }
  }

  protected incrementFramesSent(bytes: number): void {
    this._stats.framesSent++;
    this._stats.bytesSent += bytes;
  }

  protected incrementFramesReceived(bytes: number): void {
    this._stats.framesReceived++;
    this._stats.bytesReceived += bytes;
  }

  protected incrementErrors(): void {
    this._stats.errorCount++;
  }

  protected logCallbackError(prefix: string, error: unknown): void {
    const detail = error instanceof Error
      ? (error.stack ?? error.message)
      : String(error);
    process.stderr.write(`[provider] ${prefix}: ${detail}\n`);
  }
}
