import { describe, expect, it } from 'vitest';
import { JitterBuffer } from '../src/jitter-buffer.js';

describe('JitterBuffer', () => {
  it('preserves packet order across uint16 sequence rollover', () => {
    const jitter = new JitterBuffer(200);
    const packet65535 = Buffer.from([0x35]);
    const packet0 = Buffer.from([0x00]);
    const packet1 = Buffer.from([0x01]);

    jitter.push(packet65535, 0xffff);
    jitter.push(packet0, 0);
    expect(jitter.pop()).toEqual(packet65535);

    jitter.push(packet1, 1);

    expect(jitter.pop()).toEqual(packet0);
    expect(jitter.pop()).toEqual(packet1);
  });
});
