/**
 * @voice-hub/provider
 *
 * 本地 Mock 提供商 - 用于测试和开发
 */

import { randomUUID } from 'node:crypto';
import type { AudioFrame, ProviderEvent } from '@voice-hub/shared-types';
import type { ProviderConfig } from './types.js';
import { BaseProvider } from './base-provider.js';
import { ProviderState } from './types.js';

/** 本地 Mock 提供商配置 */
export interface LocalMockConfig extends ProviderConfig {
  /** 模拟音频生成模式 */
  mode?: 'silence' | 'sine' | 'noise';
  /** 延迟（毫秒） */
  latencyMs?: number;
  /** 模拟错误率（0-1） */
  errorRate?: number;
}

/** 本地 Mock 提供商 - 用于测试和开发 */
export class LocalMockProvider extends BaseProvider {
  readonly capabilities = {
    fullDuplex: true,
    interruption: true,
    codecs: ['pcm'] as const,
    sampleRates: [8000, 12000, 16000, 24000, 48000],
  };

  private config: LocalMockConfig;
  private streamingInterval: ReturnType<typeof setInterval> | null = null;
  private frameCount = 0;

  constructor(config: LocalMockConfig) {
    super(config);
    this.config = {
      mode: 'silence',
      latencyMs: 100,
      errorRate: 0,
      ...config,
    };
  }

  async connect(): Promise<void> {
    if (this._state === ProviderState.READY) return;

    this.setState(ProviderState.CONNECTING);

    // 模拟连接延迟
    await this.delay(100);

    this.setState(ProviderState.READY);
    this._stats.connectedAt = Date.now();

    this.emitEvent({
      type: 'provider',
      timestamp: Date.now(),
      eventId: randomUUID(),
      provider: 'local-mock',
      subType: 'connected',
    });
  }

  async disconnect(): Promise<void> {
    if (this.streamingInterval) {
      clearInterval(this.streamingInterval);
      this.streamingInterval = null;
    }

    this.setState(ProviderState.CLOSED);

    this.emitEvent({
      type: 'provider',
      timestamp: Date.now(),
      eventId: randomUUID(),
      provider: 'local-mock',
      subType: 'disconnected',
    });
  }

  async startStream(): Promise<void> {
    if (this._state !== ProviderState.READY) {
      throw new Error(`Cannot start stream in state: ${this._state}`);
    }

    this.setState(ProviderState.STREAMING);

    // 模拟产生音频帧
    const frameDurationMs = 20; // 20ms per frame
    this.streamingInterval = setInterval(() => {
      if (this._state === ProviderState.STREAMING) {
        this.generateMockFrame();
      }
    }, frameDurationMs);
  }

  async stopStream(): Promise<void> {
    if (this._state !== ProviderState.STREAMING) return;

    if (this.streamingInterval) {
      clearInterval(this.streamingInterval);
      this.streamingInterval = null;
    }

    this.setState(ProviderState.READY);
  }

  async sendFrame(frame: AudioFrame): Promise<void> {
    if (this._state !== ProviderState.STREAMING) return;

    // 模拟随机错误
    if (Math.random() < (this.config.errorRate || 0)) {
      this.incrementErrors();
      throw new Error('Mock send error');
    }

    // 模拟发送延迟
    await this.delay(this.config.latencyMs || 0);

    this.incrementFramesSent(frame.data.length * 2); // Int16 = 2 bytes
  }

  private generateMockFrame(): void {
    const sampleRate = this._config.sampleRate;
    const channels = this._config.channels;
    const frameDurationMs = 20;
    const samplesPerFrame = (sampleRate * frameDurationMs) / 1000;

    const data = new Int16Array(samplesPerFrame * channels);

    switch (this.config.mode) {
      case 'sine':
        this.generateSineWave(data, this.frameCount, sampleRate);
        break;
      case 'noise':
        this.generateNoise(data);
        break;
      case 'silence':
      default:
        // 静音 - 全零
        break;
    }

    const frame: AudioFrame = {
      data,
      sampleRate,
      channels,
      timestamp: Date.now(),
      sequence: this.frameCount,
    };

    this.frameCount++;
    this.incrementFramesReceived(data.byteLength);
    this.emitAudio(frame);
  }

  private generateSineWave(data: Int16Array, frameCount: number, sampleRate: number): void {
    const frequency = 440; // A4
    const amplitude = 0.3 * 32768; // 30% of max

    for (let i = 0; i < data.length; i++) {
      const t = (frameCount * data.length + i) / sampleRate;
      data[i] = Math.floor(Math.sin(2 * Math.PI * frequency * t) * amplitude);
    }
  }

  private generateNoise(data: Int16Array): void {
    const amplitude = 0.1 * 32768; // 10% of max

    for (let i = 0; i < data.length; i++) {
      data[i] = Math.floor((Math.random() * 2 - 1) * amplitude);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
