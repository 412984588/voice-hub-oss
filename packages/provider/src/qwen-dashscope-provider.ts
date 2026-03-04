/**
 * @voice-hub/provider
 *
 * Qwen DashScope 实时语音提供商
 */

import { randomUUID } from 'node:crypto';
import { WebSocket } from 'ws';
import type { AudioFrame } from '@voice-hub/shared-types';
import type { ProviderConfig } from './types.js';
import { BaseProvider } from './base-provider.js';
import { ProviderState } from './types.js';

interface QwenDashscopeConfig extends ProviderConfig {
  apiKey: string;
  model: string;
  voice?: string;
  region?: 'intl' | 'cn';
}

interface QwenErrorPayload {
  code?: string;
  message?: string;
}

interface QwenServerMessage {
  type: string;
  delta?: string;
  audio?: string;
  code?: string;
  message?: string;
  error?: QwenErrorPayload;
  data?: {
    delta?: string;
    audio?: string;
    error?: QwenErrorPayload;
  };
}

/** Qwen DashScope 提供商 */
export class QwenDashscopeProvider extends BaseProvider {
  readonly capabilities = {
    fullDuplex: true,
    interruption: true,
    codecs: ['pcm'] as const,
    sampleRates: [16000, 24000, 48000],
  };

  private ws: WebSocket | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private connectedEventEmitted = false;
  private readonly config: QwenDashscopeConfig;

  constructor(config: QwenDashscopeConfig) {
    super(config);
    if (!config.apiKey) {
      throw new Error('Qwen DashScope provider requires apiKey');
    }
    if (!config.model) {
      throw new Error('Qwen DashScope provider requires model');
    }
    this.config = config;
  }

  async connect(): Promise<void> {
    if (
      this._state === ProviderState.CONNECTING ||
      this._state === ProviderState.READY
    ) {
      return;
    }

    this.setState(ProviderState.CONNECTING);
    this.connectedEventEmitted = false;

    try {
      const url = new URL(this._config.url);
      if (!url.searchParams.has('model')) {
        url.searchParams.set('model', this.config.model);
      }

      this.ws = new WebSocket(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'X-DashScope-DataInspection': 'disable',
          'User-Agent': 'voice-hub/0.1.0',
        },
      });
      this.ws.binaryType = 'arraybuffer';

      await new Promise<void>((resolve, reject) => {
        if (!this.ws) {
          reject(new Error('WebSocket not initialized'));
          return;
        }

        this.ws.onopen = () => {
          this.setState(ProviderState.READY);
          this._stats.connectedAt = Date.now();
          this.emitConnectedEventOnce();
          this.startHeartbeat();
          resolve();
        };

        this.ws.onerror = (error) => {
          this.setState(ProviderState.ERROR);
          this.incrementErrors();
          this.emitProviderError(
            'QWEN_WS_ERROR',
            'WebSocket connection error',
            error
          );
          reject(new Error('Qwen websocket connection error'));
        };

        this.ws.onclose = () => {
          this.handleDisconnect();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data as Buffer | string | ArrayBuffer);
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
    const ws = this.ws;
    this.ws = null;

    if (ws) {
      ws.onclose = null;
      ws.close();
    }

    this.connectedEventEmitted = false;
    this.setState(ProviderState.CLOSED);
    this.emitEvent({
      type: 'provider',
      timestamp: Date.now(),
      eventId: randomUUID(),
      provider: 'qwen-dashscope',
      subType: 'disconnected',
    });
  }

  async startStream(): Promise<void> {
    if (this._state !== ProviderState.READY) {
      throw new Error(`Cannot start stream in state: ${this._state}`);
    }

    this.setState(ProviderState.STREAMING);
    this.sendJSON({
      type: 'session.update',
      session: {
        modalities: ['audio', 'text'],
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        voice: this.config.voice,
      },
    });
  }

  async stopStream(): Promise<void> {
    if (this._state !== ProviderState.STREAMING) {
      return;
    }

    this.sendJSON({ type: 'input_audio_buffer.commit' });
    this.sendJSON({ type: 'response.create' });
    this.setState(ProviderState.READY);
  }

  async sendFrame(frame: AudioFrame): Promise<void> {
    if (this._state !== ProviderState.STREAMING || !this.ws) {
      return;
    }

    const payload = Buffer.from(
      frame.data.buffer,
      frame.data.byteOffset,
      frame.data.byteLength
    ).toString('base64');

    this.sendJSON({
      type: 'input_audio_buffer.append',
      audio: payload,
    });
    this.incrementFramesSent(frame.data.byteLength);
  }

  private handleMessage(data: Buffer | string | ArrayBuffer): void {
    try {
      const raw = this.toUtf8(data);
      const message = JSON.parse(raw) as QwenServerMessage;

      switch (message.type) {
        case 'session.created':
          this.emitConnectedEventOnce();
          break;
        case 'response.audio.delta':
        case 'response.output_audio.delta':
        case 'output_audio.delta':
          this.handleAudioDelta(message);
          break;
        case 'error':
        case 'response.error':
          this.handleRemoteError(message);
          break;
        default:
          this.handleAudioDelta(message);
          break;
      }
    } catch (error) {
      this.incrementErrors();
      this.emitProviderError(
        'QWEN_PARSE_ERROR',
        'Failed to parse Qwen message',
        error
      );
    }
  }

  private handleAudioDelta(message: QwenServerMessage): void {
    const delta =
      message.delta ??
      message.audio ??
      message.data?.delta ??
      message.data?.audio;

    if (!delta) {
      return;
    }

    const audioBuffer = Buffer.from(delta, 'base64');
    if (audioBuffer.byteLength < 2) {
      return;
    }

    const sampleCount = Math.floor(audioBuffer.byteLength / 2);
    const pcm = new Int16Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      pcm[i] = audioBuffer.readInt16LE(i * 2);
    }

    const frame: AudioFrame = {
      data: pcm,
      sampleRate: this._config.sampleRate,
      channels: this._config.channels,
      timestamp: Date.now(),
      sequence: this._stats.framesReceived,
    };

    this.incrementFramesReceived(audioBuffer.byteLength);
    this.emitAudio(frame);
  }

  private handleRemoteError(message: QwenServerMessage): void {
    const code =
      message.error?.code ??
      message.data?.error?.code ??
      message.code ??
      'QWEN_ERROR';
    const detail =
      message.error?.message ??
      message.data?.error?.message ??
      message.message ??
      'Qwen server error';

    this.incrementErrors();
    this.emitProviderError(code, detail, message);
  }

  private handleDisconnect(): void {
    this.stopHeartbeat();
    this.ws = null;
    this.connectedEventEmitted = false;
    this.setState(ProviderState.CLOSED);
    this.emitEvent({
      type: 'provider',
      timestamp: Date.now(),
      eventId: randomUUID(),
      provider: 'qwen-dashscope',
      subType: 'disconnected',
    });
  }

  private emitConnectedEventOnce(): void {
    if (this.connectedEventEmitted) {
      return;
    }
    this.connectedEventEmitted = true;
    this.emitEvent({
      type: 'provider',
      timestamp: Date.now(),
      eventId: randomUUID(),
      provider: 'qwen-dashscope',
      subType: 'connected',
    });
  }

  private emitProviderError(
    code: string,
    message: string,
    details: unknown
  ): void {
    this.emitEvent({
      type: 'provider',
      timestamp: Date.now(),
      eventId: randomUUID(),
      provider: 'qwen-dashscope',
      subType: 'error',
      data: {
        code,
        message,
        details,
      },
    });
  }

  private sendJSON(payload: unknown): void {
    if (!this.ws) {
      return;
    }
    this.ws.send(JSON.stringify(payload));
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendJSON({ type: 'ping' });
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (!this.heartbeatInterval) {
      return;
    }
    clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = null;
  }

  private toUtf8(data: Buffer | string | ArrayBuffer): string {
    if (typeof data === 'string') {
      return data;
    }
    if (Buffer.isBuffer(data)) {
      return data.toString();
    }
    return Buffer.from(new Uint8Array(data)).toString();
  }
}
