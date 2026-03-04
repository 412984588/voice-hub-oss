import { describe, expect, it, vi } from "vitest";
import { LocalMockProvider } from "../src/local-mock-provider.js";

describe("provider events", () => {
  it("dispatches connected event to legacy channel and provider channel once", async () => {
    const provider = new LocalMockProvider({
      sessionId: "s1",
      url: "ws://mock.local",
      sampleRate: 16000,
      channels: 1,
    });

    const connected = vi.fn();
    const providerEvent = vi.fn();
    provider.on("connected", connected);
    provider.on("provider", providerEvent);

    await provider.connect();

    expect(connected).toHaveBeenCalledTimes(1);
    expect(providerEvent).toHaveBeenCalledTimes(1);
    expect(providerEvent.mock.calls[0]?.[0]).toMatchObject({
      type: "provider",
      subType: "connected",
      provider: "local-mock",
    });
  });
});
