import { describe, expect, it, vi } from "vitest";
import type { Config } from "@voice-hub/shared-config";
import type { AudioFrame, ProviderEvent } from "@voice-hub/shared-types";
import { SessionState } from "@voice-hub/shared-types";
import type {
  EventListener,
  IAudioProvider,
  ProviderCapabilities,
  ProviderStats,
  PushAudioCallback,
} from "@voice-hub/provider";
import { ProviderState } from "@voice-hub/provider";
import { VoiceRuntime } from "../src/voice-runtime.js";

class MockProvider implements IAudioProvider {
  state = ProviderState.IDLE;
  capabilities: ProviderCapabilities = {
    fullDuplex: true,
    interruption: true,
    codecs: ["pcm"],
    sampleRates: [16000],
  };
  stats: ProviderStats = {
    connectedAt: null,
    framesSent: 0,
    framesReceived: 0,
    bytesSent: 0,
    bytesReceived: 0,
    errorCount: 0,
  };
  connect = vi.fn(async () => {
    this.state = ProviderState.READY;
  });
  disconnect = vi.fn(async () => {
    this.state = ProviderState.CLOSED;
  });
  startStream = vi.fn(async () => {
    this.state = ProviderState.STREAMING;
  });
  stopStream = vi.fn(async () => {
    this.state = ProviderState.READY;
  });
  sendFrame = vi.fn(async (_frame: AudioFrame) => undefined);

  private listeners: Map<string, Set<EventListener | PushAudioCallback>> =
    new Map();

  onAudio(callback: PushAudioCallback): void {
    this.on("audio", callback);
  }

  on(event: "provider", listener: EventListener): void;
  on(
    event: "connected" | "disconnected" | "ready" | "error",
    listener: EventListener,
  ): void;
  on(event: "audio", listener: PushAudioCallback): void;
  on(event: string, listener: EventListener | PushAudioCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(listener);
  }

  off(event: string, listener: EventListener | PushAudioCallback): void {
    this.listeners.get(event)?.delete(listener);
  }

  getState(): ProviderState {
    return this.state;
  }

  getStats(): ProviderStats {
    return { ...this.stats };
  }

  emit(event: string, payload: unknown): void {
    const listeners = this.listeners.get(event);
    if (!listeners) {
      return;
    }

    for (const listener of listeners) {
      (listener as (arg: unknown) => void)(payload);
    }
  }

  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}

function createConfig(): Config {
  return {
    discordBotToken: "token",
    discordGuildId: "guild",
    discordVoiceChannelId: "voice",
    discordClientId: "client",
    doubaoRealtimeWsUrl: undefined,
    doubaoAppId: undefined,
    doubaoAccessToken: undefined,
    backendDispatchUrl: undefined,
    backendTimeoutMs: 30000,
    backendMaxRetries: 3,
    webhookPort: 8911,
    webhookSecret: "test-webhook-secret",
    webhookPath: "/webhook/callback",
    voiceHubApiKey: undefined,
    webhookLegacySecretHeader: false,
    webhookShadowMode: false,
    corsAllowedOrigins: ["http://localhost:3000"],
    memoryDbPath: "./data/memory_bank.db",
    memoryWalEnabled: true,
    memoryBusyTimeout: 5000,
    logLevel: "info",
    logFormat: "json",
    logPretty: false,
    audioSampleRate: 16000,
    audioChannels: 1,
    audioBitsPerSample: 16,
    audioFrameDurationMs: 20,
    audioJitterBufferMs: 200,
    sessionTimeoutMs: 300000,
    sessionMaxReconnectAttempts: 5,
    sessionReconnectDelayMs: 2000,
    voiceProvider: "local-mock",
  };
}

describe("VoiceRuntime", () => {
  it("attaches and detaches provider listeners across start/stop", async () => {
    const provider = new MockProvider();
    const runtime = new VoiceRuntime({
      config: createConfig(),
      provider,
    });

    await runtime.start();
    expect(provider.connect).toHaveBeenCalledTimes(1);
    expect(provider.listenerCount("audio")).toBe(1);
    expect(provider.listenerCount("provider")).toBe(1);

    await runtime.stop();
    expect(provider.disconnect).toHaveBeenCalledTimes(1);
    expect(provider.listenerCount("audio")).toBe(0);
    expect(provider.listenerCount("provider")).toBe(0);
  });

  it("emits ready and error when provider channel emits events", async () => {
    const provider = new MockProvider();
    const runtime = new VoiceRuntime({
      config: createConfig(),
      provider,
    });
    const readyListener = vi.fn();
    const errorListener = vi.fn();
    runtime.on("ready", readyListener);
    runtime.on("error", errorListener);

    await runtime.start();

    provider.emit("provider", {
      type: "provider",
      provider: "local-mock",
      subType: "connected",
      timestamp: Date.now(),
      eventId: "evt-1",
    } satisfies ProviderEvent);
    provider.emit("provider", {
      type: "provider",
      provider: "local-mock",
      subType: "error",
      timestamp: Date.now(),
      eventId: "evt-2",
      data: { code: "E_FAIL" },
    } satisfies ProviderEvent);

    expect(readyListener).toHaveBeenCalledTimes(1);
    expect(errorListener).toHaveBeenCalledTimes(1);
  });

  it("throws when state transition to listening is rejected", async () => {
    const runtime = new VoiceRuntime({
      config: createConfig(),
    });

    const sessionId = await runtime.createSession();
    const sessionManager = (
      runtime as unknown as {
        sessionManager: {
          getStateMachine(
            id: string,
          ): { transitionTo(state: SessionState): Promise<boolean> } | null;
        };
      }
    ).sessionManager;
    const machine = sessionManager.getStateMachine(sessionId);
    if (!machine) {
      throw new Error("state machine not found");
    }

    vi.spyOn(machine, "transitionTo").mockResolvedValue(false);

    await expect(runtime.startListening(sessionId)).rejects.toThrow(
      "Invalid state transition",
    );
  });
});
