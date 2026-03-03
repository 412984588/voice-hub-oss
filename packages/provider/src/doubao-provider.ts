/**
 * @voice-hub/provider
 *
 * 豆包实时语音提供商
 */

import { randomUUID } from 'node:crypto';
import { WebSocket } from 'ws';
import type { AudioFrame, ProviderEvent } from '@voice-hub/shared-types';
import type { ProviderConfig } from './types.js';
import { BaseProvider } from './base-provider.js';
import { ProviderState } from './types.js';

interface DoubaoConfig extends ProviderConfig {
  appId: string;
  accessToken: string;
}

interface DoubaoServerMessage {
  type: 'session_started' | 'audio' | 'error' | 'session_ended';
  data?: unknown;
}

interface DoubaoAudioData {
  audio: string; // base64 encoded audio
  format?: 'pcm' | 'opus';
  sampleRate?: number;
  channels?: number;
}

interface DoubaoErrorMessage {
  code: number;
  message: string;
}

/** 豆包实时语音提供商 */
export class DoubaoProvider extends BaseProvider {
  readonly capabilities = {
    fullDuplex: true,
    interruption: true,
    codecs: ['pcm', 'opus'] as const,
    sampleRates: [8000, 12000, 16000, 24000],
  };

  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: DoubaoConfig) {
    super(config);
    if (!config.appId || !config.accessToken) {
      throw new Error('Doubao provider requires appId and accessToken');
    }
  }

  async connect(): Promise<void> {
    if (this._state === ProviderState.CONNECTING || this._state === ProviderState.READY) {
      return;
    }

    this.setState(ProviderState.CONNECTING);

    try {
      const url = new URL(this._config.url);
      url.searchParams.set('app_id', (this._config as DoubaoConfig).appId);
      url.searchParams.set('authorization', (this._config as DoubaoConfig).accessToken);
      url.searchParams.set('session_id', this._config.sessionId);

      this.ws = new WebSocket(url.toString(), {
        headers: {
          'User-Agent': 'voice-hub/0.1.0',
        },
      });

      this.ws.binaryType = 'arraybuffer';

      await new Promise<void>((resolve, reject) => {
        if (!this.ws) return reject(new Error('WebSocket not initialized'));

        this.ws.onopen = () => {
          this.setState(ProviderState.READY);
          this._stats.connectedAt = Date.now();
          this.emitEvent({
            type: 'provider',
            timestamp: Date.now(),
            eventId: crypto.randomUUID(),
            provider: 'doubao',
            subType: 'connected',
          });
          this.startHeartbeat();
          resolve();
        };

        this.ws.onerror = (error) => {
          this.setState(ProviderState.ERROR);
          this.incrementErrors();
          this.emitEvent({
            type: 'provider',
            timestamp: Date.now(),
            eventId: randomUUID(),
            provider: 'doubao',
            subType: 'error',
            data: {
              code: 'WS_ERROR',
              message: 'WebSocket connection error',
              details: error,
            },
          });
          reject(error);
        };

        this.ws.onclose = () => {
          this.handleDisconnect();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data as Buffer);
        };
      });
    } catch (error) {
      this.setState(ProviderState.ERROR);
      this.incrementErrors();
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setState(ProviderState.CLOSED);
    this.emitEvent({
      type: 'provider',
      timestamp: Date.now(),
      eventId: randomUUID(),
      provider: 'doubao',
      subType: 'disconnected',
    });
  }

  async startStream(): Promise<void> {
    if (this._state !== ProviderState.READY) {
      throw new Error(`Cannot start stream in state: ${this._state}`);
    }

    this.setState(ProviderState.STREAMING);

    // 发送开始流消息
    this.sendJSON({
      type: 'start_stream',
      config: {
        sample_rate: this._config.sampleRate,
        channels: this._config.channels,
        format: 'pcm',
      },
    });
  }

  async stopStream(): Promise<void> {
    if (this._state !== ProviderState.STREAMING) {
      return;
    }

    this.setState(ProviderState.READY);

    // 发送停止流消息
    this.sendJSON({
      type: 'stop_stream',
    });
  }

  async sendFrame(frame: AudioFrame): Promise<void> {
    if (this._state !== ProviderState.STREAMING || !this.ws) {
      return;
    }

    try {
      // 转换音频数据为需要的格式
      const audioData = this.prepareAudioData(frame);
      this.ws.send(audioData);
      this.incrementFramesSent(audioData.byteLength);
    } catch (error) {
      this.incrementErrors();
      throw error;
    }
  }

  private handleMessage(data: Buffer | string | ArrayBuffer): void {
    try {
      let jsonStr: string;
      if (typeof data === 'string') {
        jsonStr = data;
      } else if (data instanceof Buffer) {
        jsonStr = data.toString();
      } else if (data instanceof ArrayBuffer) {
        jsonStr = Buffer.from(data).toString();
      } else {
        throw new Error('Unknown data type');
      }

      const message = JSON.parse(jsonStr) as DoubaoServerMessage;

      switch (message.type) {
        case 'session_started':
          this.emitEvent({
            type: 'provider',
            timestamp: Date.now(),
            eventId: randomUUID(),
            provider: 'doubao',
            subType: 'connected',
          });
          break;

        case 'audio':
          this.handleAudioData(message.data as DoubaoAudioData);
          break;

        case 'error':
          this.handleError(message.data as DoubaoErrorMessage);
          break;

        case 'session_ended':
          this.handleDisconnect();
          break;
      }
    } catch (error) {
      this.incrementErrors();
      this.emitEvent({
        type: 'provider',
        timestamp: Date.now(),
        eventId: randomUUID(),
        provider: 'doubao',
        subType: 'error',
        data: {
          code: 'DOUBAO_PARSE_ERROR',
          message: 'Failed to parse server message',
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  private handleAudioData(data: DoubaoAudioData): void {
    if (!data.audio) return;

    // 解码 base64 音频
    const audioBuffer = Buffer.from(data.audio, 'base64');

    const frame: AudioFrame = {
      data: new Int16Array(audioBuffer.buffer),
      sampleRate: data.sampleRate || 16000,
      channels: data.channels || 1,
      timestamp: Date.now(),
      sequence: this._stats.framesReceived,
    };

    this.incrementFramesReceived(audioBuffer.byteLength);
    this.emitAudio(frame);
  }

  private handleError(error: DoubaoErrorMessage): void {
    this.incrementErrors();
    this.emitEvent({
      type: 'provider',
      timestamp: Date.now(),
      eventId: randomUUID(),
      provider: 'doubao',
      subType: 'error',
      data: {
        code: `DOUBAO_${error.code}`,
        message: error.message,
      },
    });
  }

  private handleDisconnect(): void {
    this.stopHeartbeat();
    this.setState(ProviderState.CLOSED);
    this.emitEvent({
      type: 'provider',
      timestamp: Date.now(),
      eventId: randomUUID(),
      provider: 'doubao',
      subType: 'disconnected',
    });
  }

  private sendJSON(obj: unknown): void {
    if (!this.ws) return;
    this.ws.send(JSON.stringify(obj));
  }

  private prepareAudioData(frame: AudioFrame): Buffer {
    // 将 Int16Array 转换为 Buffer
    return Buffer.from(frame.data.buffer);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendJSON({ type: 'ping' });
    }, 30000); // 每 30 秒发送一次心跳
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}
