/**
 * @voice-hub/audio-engine
 *
 * 音频接收泵 - 从 Discord 接收音频数据
 */

import type { AudioFrame, AudioStats } from "@voice-hub/shared-types";
import type { AudioEngineConfig, AudioReceiverCallbacks } from "./types.js";
import { AudioReceiverState } from "./types.js";
import { JitterBuffer } from "./jitter-buffer.js";

/** 音频接收泵 */
export class AudioIngressPump {
  private config: AudioEngineConfig;
  private state: AudioReceiverState = AudioReceiverState.IDLE;
  private jitterBuffer: JitterBuffer;
  private callbacks: AudioReceiverCallbacks;
  private stats: AudioStats = {
    packetsReceived: 0,
    packetsSent: 0,
    packetsLost: 0,
    jitter: 0,
    latency: 0,
  };
  private receiveTimer: ReturnType<typeof setInterval> | null = null;
  private lastFrameTime = 0;
  private lastPacketTime = 0;
  private timeoutNotified = false;

  constructor(config: AudioEngineConfig, callbacks: AudioReceiverCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
    this.jitterBuffer = new JitterBuffer(config.jitterBufferMs);
  }

  /** 启动接收 */
  start(): void {
    if (this.state === AudioReceiverState.RECEIVING) {
      return;
    }

    this.state = AudioReceiverState.RECEIVING;
    this.lastPacketTime = Date.now();
    this.timeoutNotified = false;

    // 定时从 jitter buffer 取出音频帧
    const frameIntervalMs = this.config.frameDurationMs;
    this.receiveTimer = setInterval(() => {
      this.processJitterBuffer();
      this.checkTimeout();
    }, frameIntervalMs);
  }

  /** 停止接收 */
  stop(): void {
    if (this.receiveTimer) {
      clearInterval(this.receiveTimer);
      this.receiveTimer = null;
    }

    this.state = AudioReceiverState.IDLE;
    this.timeoutNotified = false;
  }

  /** 接收音频数据包（来自 Discord） */
  receivePacket(packet: Buffer, sequenceNumber: number): void {
    if (this.state !== AudioReceiverState.RECEIVING) {
      return;
    }

    this.stats.packetsReceived++;

    // 添加到 jitter buffer
    this.jitterBuffer.push(packet, sequenceNumber);
    this.lastPacketTime = Date.now();
    this.timeoutNotified = false;
  }

  /** 处理 jitter buffer 中的数据 */
  private processJitterBuffer(): void {
    const frame = this.jitterBuffer.pop();

    if (!frame) {
      // 没有可用的帧，静音处理
      this.state = AudioReceiverState.SILENCE;
      return;
    }

    this.state = AudioReceiverState.RECEIVING;

    if (frame.byteLength % 2 !== 0) {
      this.callbacks.onError(new Error("Invalid PCM16 packet length"));
      return;
    }

    const sampleCount = frame.byteLength / 2;
    const pcm = new Int16Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      pcm[i] = frame.readInt16LE(i * 2);
    }

    // 创建音频帧
    const audioFrame: AudioFrame = {
      data: pcm,
      sampleRate: this.config.targetSampleRate,
      channels: this.config.targetChannels,
      timestamp: Date.now(),
      sequence: this.stats.packetsReceived,
    };

    this.lastFrameTime = audioFrame.timestamp;

    // 回调
    this.callbacks.onFrame(audioFrame);
  }

  /** 检查接收超时 */
  private checkTimeout(): void {
    if (!this.config.enableWatchdog) {
      return;
    }

    const now = Date.now();
    const elapsed = now - this.lastPacketTime;

    if (elapsed > this.config.watchdogTimeoutMs && !this.timeoutNotified) {
      this.timeoutNotified = true;
      this.callbacks.onTimeout();
    }
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
  getState(): AudioReceiverState {
    return this.state;
  }
}
