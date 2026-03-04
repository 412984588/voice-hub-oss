/**
 * @voice-hub/audio-engine
 *
 * Jitter Buffer - 平滑网络抖动的缓冲区
 */

/** Jitter buffer 项 */
interface JitterItem {
  buffer: Buffer;
  sequenceNumber: number;
  receivedAt: number;
}

/** Jitter 缓冲区 */
export class JitterBuffer {
  private capacityMs: number;
  private items: Map<number, JitterItem> = new Map();
  private nextSequenceNumber = 0;
  private maxBufferSize: number;

  constructor(capacityMs: number) {
    this.capacityMs = capacityMs;
    // 假设 20ms 一帧，计算最大缓冲区大小
    this.maxBufferSize = Math.ceil(capacityMs / 20) * 2;
  }

  /** 添加数据包 */
  push(buffer: Buffer, sequenceNumber: number): void {
    // 如果这是第一个包，设置序列号
    if (this.items.size === 0) {
      this.nextSequenceNumber = sequenceNumber;
    }

    // 添加到缓冲区
    this.items.set(sequenceNumber, {
      buffer,
      sequenceNumber,
      receivedAt: Date.now(),
    });

    // 清理旧的包
    this.cleanup();

    // 检查缓冲区大小
    if (this.items.size > this.maxBufferSize) {
      // 缓冲区溢出，清理最旧的包
      const oldestKey = Math.min(...Array.from(this.items.keys()));
      this.items.delete(oldestKey);
    }
  }

  /** 取出下一个数据包 */
  pop(): Buffer | null {
    // 如果没有数据，返回空（静音）
    if (this.items.size === 0) {
      return null;
    }

    // 检查是否有期望的序列号
    if (this.items.has(this.nextSequenceNumber)) {
      const item = this.items.get(this.nextSequenceNumber)!;
      this.items.delete(this.nextSequenceNumber);
      this.nextSequenceNumber = (this.nextSequenceNumber + 1) % 0xffff;
      return item.buffer;
    }

    // 检查是否有更新的包（可能是丢包了）
    const keys = Array.from(this.items.keys()).sort((a, b) => a - b);
    const newestKey = keys[keys.length - 1];

    // 如果最新的包比期望的包新很多，说明丢包了，跳过
    const seqDiff = (newestKey - this.nextSequenceNumber + 0x10000) % 0x10000;
    if (seqDiff > 10) {
      // 跳过丢失的包
      this.nextSequenceNumber = newestKey;
      const item = this.items.get(newestKey)!;
      this.items.delete(newestKey);
      this.nextSequenceNumber = (this.nextSequenceNumber + 1) % 0xffff;
      return item.buffer;
    }

    // 等待期望的包
    return null;
  }

  /** 清理过期数据 */
  private cleanup(): void {
    const now = Date.now();
    const expireTime = this.capacityMs * 2;

    for (const [seq, item] of this.items.entries()) {
      if (now - item.receivedAt > expireTime) {
        this.items.delete(seq);
      }
    }
  }

  /** 重置缓冲区 */
  reset(): void {
    this.items.clear();
    this.nextSequenceNumber = 0;
  }

  /** 获取缓冲区大小 */
  size(): number {
    return this.items.size;
  }

  /** 是否为空 */
  isEmpty(): boolean {
    return this.items.size === 0;
  }
}
