import { describe, expect, it } from "vitest";
import type { AudioFrame } from "@voice-hub/shared-types";
import { Packetizer } from "../src/packetizer.js";

function createFrame(sampleCount: number): AudioFrame {
  const data = new Int16Array(sampleCount);
  for (let i = 0; i < data.length; i++) {
    data[i] = i;
  }

  return {
    data,
    sampleRate: 16000,
    channels: 1,
    timestamp: Date.now(),
    sequence: 1,
  };
}

describe("Packetizer", () => {
  it("splits audio by sample count and preserves payload boundaries", () => {
    const packetizer = new Packetizer({
      targetSampleRate: 16000,
      targetChannels: 1,
      frameDurationMs: 20,
      jitterBufferMs: 200,
      enableWatchdog: true,
      watchdogTimeoutMs: 1000,
    });

    const packets = packetizer.packetize(createFrame(640));

    expect(packets).toHaveLength(2);
    expect(packets[0]?.byteLength).toBe(12 + 640);
    expect(packets[1]?.byteLength).toBe(12 + 640);

    const firstPayload = packets[0]?.subarray(12) ?? Buffer.alloc(0);
    const secondPayload = packets[1]?.subarray(12) ?? Buffer.alloc(0);
    expect(firstPayload.readInt16LE(0)).toBe(0);
    expect(firstPayload.readInt16LE(638)).toBe(319);
    expect(secondPayload.readInt16LE(0)).toBe(320);
    expect(secondPayload.readInt16LE(638)).toBe(639);
  });

  it("uses RTP-compatible uint32 timestamps without overflow errors", () => {
    const packetizer = new Packetizer({
      targetSampleRate: 16000,
      targetChannels: 1,
      frameDurationMs: 20,
      jitterBufferMs: 200,
      enableWatchdog: true,
      watchdogTimeoutMs: 1000,
    });

    expect(() => packetizer.packetize(createFrame(320))).not.toThrow();
  });
});
