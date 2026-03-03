/**
 * @voice-hub/audio-engine
 *
 * 音频重采样器 - 转换采样率和声道数
 */

import type { AudioFrame } from '@voice-hub/shared-types';

/** 重采样器 */
export class Resampler {
  /** 重采样音频帧 */
  static resample(
    frame: AudioFrame,
    targetSampleRate: number,
    targetChannels: number
  ): AudioFrame {
    const { data, sampleRate, channels } = frame;

    // 如果目标格式相同，直接返回
    if (sampleRate === targetSampleRate && channels === targetChannels) {
      return frame;
    }

    let processed = data;

    // 声道转换
    if (channels !== targetChannels) {
      processed = this.convertChannels(processed, channels, targetChannels);
    }

    // 采样率转换
    if (sampleRate !== targetSampleRate) {
      processed = this.convertSampleRate(
        processed,
        sampleRate,
        targetSampleRate,
        targetChannels
      );
    }

    return {
      data: processed,
      sampleRate: targetSampleRate,
      channels: targetChannels,
      timestamp: frame.timestamp,
      sequence: frame.sequence,
    };
  }

  /** 转换声道数 */
  private static convertChannels(
    data: Int16Array,
    fromChannels: number,
    toChannels: number
  ): Int16Array {
    if (fromChannels === toChannels) {
      return data;
    }

    // 单声道 -> 立体声：复制每个样本
    if (fromChannels === 1 && toChannels === 2) {
      const result = new Int16Array(data.length * 2);
      for (let i = 0; i < data.length; i++) {
        result[i * 2] = data[i];
        result[i * 2 + 1] = data[i];
      }
      return result;
    }

    // 立体声 -> 单声道：取平均值
    if (fromChannels === 2 && toChannels === 1) {
      const result = new Int16Array(data.length / 2);
      for (let i = 0; i < result.length; i++) {
        const left = data[i * 2];
        const right = data[i * 2 + 1];
        result[i] = (left + right) / 2;
      }
      return result;
    }

    // 其他情况：简单的交错复制或丢弃
    const ratio = toChannels / fromChannels;
    const result = new Int16Array(Math.floor(data.length * ratio));
    for (let i = 0; i < result.length; i++) {
      const srcIndex = Math.floor(i / ratio);
      result[i] = data[srcIndex];
    }
    return result;
  }

  /** 转换采样率（使用线性插值） */
  private static convertSampleRate(
    data: Int16Array,
    fromRate: number,
    toRate: number,
    channels: number
  ): Int16Array {
    const ratio = fromRate / toRate;
    const outputLength = Math.floor(data.length / ratio);
    const result = new Int16Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const srcPos = i * ratio;
      const srcIndex = Math.floor(srcPos);
      const fraction = srcPos - srcIndex;

      // 线性插值
      if (srcIndex + 1 < data.length) {
        const a = data[srcIndex];
        const b = data[srcIndex + 1];
        result[i] = Math.floor(a + fraction * (b - a));
      } else {
        result[i] = data[srcIndex];
      }
    }

    return result;
  }

  /** 计算重采样后的长度 */
  static calculateOutputLength(
    inputLength: number,
    inputRate: number,
    outputRate: number
  ): number {
    return Math.floor((inputLength * outputRate) / inputRate);
  }
}
