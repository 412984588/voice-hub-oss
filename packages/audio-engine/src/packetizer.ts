/**
 * @voice-hub/audio-engine
 *
 * 音频封包器 - 将音频帧分割为适合发送的 UDP 数据包
 */

import type { AudioFrame } from '@voice-hub/shared-types';
import type { AudioEngineConfig } from './types.js';

/** 数据包头 */
interface PacketHeader {
  sequenceNumber: number;
  timestamp: number;
  ssrc: number;
}

/** 音频封包器 */
export class Packetizer {
  private config: AudioEngineConfig;
  private sequenceNumber = 0;
  private ssrc = Math.floor(Math.random() * 0xFFFFFFFF);
  private rtpTimestamp = Math.floor(Math.random() * 0xFFFFFFFF);

  constructor(config: AudioEngineConfig) {
    this.config = config;
  }

  /** 将音频帧封包 */
  packetize(frame: AudioFrame): Buffer[] {
    const samplesPerChannel = Math.max(
      1,
      Math.floor((this.config.targetSampleRate * this.config.frameDurationMs) / 1000)
    );
    const samplesPerPacket = samplesPerChannel * this.config.targetChannels;

    const packets: Buffer[] = [];
    const data = frame.data;

    // 计算需要多少个包
    const packetCount = Math.ceil(data.length / samplesPerPacket);

    for (let i = 0; i < packetCount; i++) {
      const start = i * samplesPerPacket;
      const end = Math.min(start + samplesPerPacket, data.length);
      const payload = data.subarray(start, end);
      const payloadBuffer = Buffer.from(
        payload.buffer,
        payload.byteOffset,
        payload.byteLength
      );

      // 创建 RTP 格式包头（简化）
      const header = this.createHeader();

      // 合并头和数据
      const packet = Buffer.concat([header, payloadBuffer]);
      packets.push(packet);

      this.sequenceNumber = (this.sequenceNumber + 1) % 0x10000;
      const emittedSamplesPerChannel = Math.floor(payload.length / this.config.targetChannels);
      this.rtpTimestamp = (this.rtpTimestamp + emittedSamplesPerChannel) >>> 0;
    }

    return packets;
  }

  /** 创建包头 */
  private createHeader(): Buffer {
    const header = Buffer.alloc(12); // RTP 固定头长度

    // Byte 0: V=2, P=0, X=0, CC=0
    header.writeUInt8(0x80, 0);

    // Byte 1: M=0, PT=111 (dynamic)
    header.writeUInt8(0x6F, 1);

    // Byte 2-3: Sequence Number
    header.writeUInt16BE(this.sequenceNumber, 2);

    // Byte 4-7: Timestamp
    header.writeUInt32BE(this.rtpTimestamp >>> 0, 4);

    // Byte 8-11: SSRC
    header.writeUInt32BE(this.ssrc, 8);

    return header;
  }

  /** 重置序列号 */
  reset(): void {
    this.sequenceNumber = 0;
    this.rtpTimestamp = Math.floor(Math.random() * 0xFFFFFFFF);
  }

  /** 设置 SSRC */
  setSSRC(ssrc: number): void {
    this.ssrc = ssrc;
  }
}
