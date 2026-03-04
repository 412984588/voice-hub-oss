import { describe, expect, it, vi } from 'vitest';
import type { AudioFrame } from '@voice-hub/shared-types';
import { AudioEgressPump } from '../src/audio-egress-pump.js';

describe('AudioEgressPump', () => {
  it('drains newly queued frames while already playing', async () => {
    vi.useFakeTimers();

    try {
      const pump = new AudioEgressPump({
        targetSampleRate: 16000,
        targetChannels: 1,
        frameDurationMs: 20,
        jitterBufferMs: 200,
        enableWatchdog: true,
        watchdogTimeoutMs: 1000,
      });
      const sendPacketSpy = vi
        .spyOn(
          pump as unknown as {
            sendPacket: (packet: Buffer) => Promise<void>;
          },
          'sendPacket'
        )
        .mockResolvedValue(undefined);
      const frame: AudioFrame = {
        data: new Int16Array(320),
        sampleRate: 16000,
        channels: 1,
        timestamp: Date.now(),
        sequence: 1,
      };

      pump.start();
      pump.sendFrame(frame);

      await vi.advanceTimersByTimeAsync(25);

      expect(sendPacketSpy).toHaveBeenCalledTimes(1);
      expect(pump.getQueueLength()).toBe(0);
      expect(pump.getStats().packetsSent).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
