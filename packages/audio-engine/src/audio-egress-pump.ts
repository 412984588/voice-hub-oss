/**
 * @voice-hub/audio-engine
 *
 * 音频发送泵 - 向 Discord 发送音频数据
 */

import type { AudioFrame, AudioStats } from '@voice-hub/shared-types';
import type { AudioEngineConfig } from './types.js';
import { AudioSenderState } from './types.js';
import { Packetizer } from './packetizer.js';

/** 音频发送泵 */
export class AudioEgressPump {
  private config: AudioEngineConfig;
  private state: AudioSenderState = AudioSenderState.IDLE;
  private packetizer: Packetizer;
  private stats: AudioStats = {
    packetsReceived: 0,
    packetsSent: 0,
    packetsLost: 0,
    jitter: 0,
    latency: 0,
  };
  private queue: AudioFrame[] = [];
  private isSending = false;

  constructor(config: AudioEngineConfig) {
    this.config = config;
    this.packetizer = new Packetizer(config);
  }

  /** 启动发送 */
  start(): void {
    if (this.state === AudioSenderState.PLAYING) {
      return;
    }

    this.state = AudioSenderState.PLAYING;
    this.processQueue();
  }

  /** 停止发送 */
  stop(): void {
    this.state = AudioSenderState.IDLE;
    this.isSending = false;
  }

  /** 暂停发送 */
  pause(): void {
    this.state = AudioSenderState.PAUSED;
  }

  /** 恢复发送 */
  resume(): void {
    if (this.state === AudioSenderState.PAUSED) {
      this.state = AudioSenderState.PLAYING;
      this.processQueue();
    }
  }

  /** 发送音频帧 */
  sendFrame(frame: AudioFrame): void {
    this.stats.packetsReceived++;

    if (this.queue.length >= 10) {
      // 队列过长，丢弃最旧的帧
      this.queue.shift();
      this.stats.packetsLost++;
    }

    this.queue.push(frame);

    if (this.state === AudioSenderState.PLAYING && !this.isSending) {
      void this.processQueue();
    }
  }

  /** 处理队列 */
  private async processQueue(): Promise<void> {
    if (this.isSending || this.state !== AudioSenderState.PLAYING) {
      return;
    }

    this.isSending = true;

    while (this.queue.length > 0 && this.state === AudioSenderState.PLAYING) {
      const frame = this.queue.shift()!;

      try {
        // 封包
        const packets = this.packetizer.packetize(frame);

        // 发送数据包
        for (const packet of packets) {
          await this.sendPacket(packet);
          this.stats.packetsSent++;
        }
      } catch (error) {
        this.logError('Error sending audio frame', error);
        this.state = AudioSenderState.ERROR;
        break;
      }

      // 等待一个帧的时长
      await this.sleep(this.config.frameDurationMs);
    }

    this.isSending = false;
  }

  /** 发送数据包（抽象方法，由具体实现） */
  private async sendPacket(packet: Buffer): Promise<void> {
    // 这里应该调用 Discord 的发送方法
    // 简化实现：空操作
  }

  /** 获取统计信息 */
  getStats(): AudioStats {
    return { ...this.stats };
  }

  /** 重置统计信息 */
  resetStats(): void {
    this.stats = {
      packetsReceived: 0,
      packetsSent: 0,
      packetsLost: 0,
      jitter: 0,
      latency: 0,
    };
  }

  /** 获取状态 */
  getState(): AudioSenderState {
    return this.state;
  }

  /** 获取队列长度 */
  getQueueLength(): number {
    return this.queue.length;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private logError(message: string, error: unknown): void {
    const detail = error instanceof Error
      ? (error.stack ?? error.message)
      : String(error);
    process.stderr.write(`[audio-egress-pump] ${message}: ${detail}\n`);
  }
}
