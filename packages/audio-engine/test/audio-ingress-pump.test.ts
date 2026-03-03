import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioIngressPump } from '../src/audio-ingress-pump.js';

describe('AudioIngressPump', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('triggers timeout when watchdog is enabled and no packet arrives', () => {
    const onFrame = vi.fn();
    const onTimeout = vi.fn();
    const pump = new AudioIngressPump(
      {
        targetSampleRate: 16000,
        targetChannels: 1,
        frameDurationMs: 20,
        jitterBufferMs: 200,
        enableWatchdog: true,
        watchdogTimeoutMs: 50,
      },
      {
        onFrame,
        onError: vi.fn(),
        onTimeout,
      }
    );

    pump.start();
    vi.advanceTimersByTime(70);

    expect(onFrame).not.toHaveBeenCalled();
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('does not fire timeout immediately when receiving the first packet', () => {
    const onTimeout = vi.fn();
    const pump = new AudioIngressPump(
      {
        targetSampleRate: 16000,
        targetChannels: 1,
        frameDurationMs: 20,
        jitterBufferMs: 200,
        enableWatchdog: true,
        watchdogTimeoutMs: 100,
      },
      {
        onFrame: vi.fn(),
        onError: vi.fn(),
        onTimeout,
      }
    );

    pump.start();
    pump.receivePacket(Buffer.from([1, 0, 2, 0]), 1);

    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('builds audio frame from packet using exact buffer slice', () => {
    const onFrame = vi.fn();
    const pump = new AudioIngressPump(
      {
        targetSampleRate: 16000,
        targetChannels: 1,
        frameDurationMs: 20,
        jitterBufferMs: 200,
        enableWatchdog: true,
        watchdogTimeoutMs: 100,
      },
      {
        onFrame,
        onError: vi.fn(),
        onTimeout: vi.fn(),
      }
    );

    const source = Buffer.from([9, 9, 1, 0, 2, 0, 9, 9]);
    pump.start();
    pump.receivePacket(source.subarray(2, 6), 1);
    vi.advanceTimersByTime(25);

    expect(onFrame).toHaveBeenCalledTimes(1);
    const frame = onFrame.mock.calls[0]?.[0];
    expect(Array.from(frame.data as Int16Array)).toEqual([1, 2]);
  });
});
