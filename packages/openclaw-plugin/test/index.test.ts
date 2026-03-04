/**
 * @voice-hub/openclaw-plugin Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpenClawVoiceHubPlugin, createPlugin } from "../src/index.js";

interface MockFetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<unknown>;
}

function jsonResponse(payload: unknown, status = 200): MockFetchResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: async () => payload,
  };
}

describe("OpenClawVoiceHubPlugin", () => {
  let plugin: OpenClawVoiceHubPlugin;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    plugin = new OpenClawVoiceHubPlugin(
      "http://localhost:8848",
      "test-api-key",
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("createPlugin factory returns plugin instance", () => {
    const instance = createPlugin("http://localhost:8848");
    expect(instance).toBeInstanceOf(OpenClawVoiceHubPlugin);
  });

  it("createSession calls POST /api/sessions with Authorization header", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ sessionId: "new-session-123" }));

    const sessionId = await plugin.createSession("user-456", "channel-789");

    expect(sessionId).toBe("new-session-123");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8848/api/sessions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-api-key",
        }),
        body: JSON.stringify({ userId: "user-456", channelId: "channel-789" }),
      }),
    );
  });

  it("createSession omits Authorization when apiKey is not set", async () => {
    const noKeyPlugin = new OpenClawVoiceHubPlugin("http://localhost:8848");
    mockFetch.mockResolvedValue(jsonResponse({ sessionId: "new-session-123" }));

    await noKeyPlugin.createSession();

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8848/api/sessions",
      expect.objectContaining({
        headers: expect.not.objectContaining({
          Authorization: expect.any(String),
        }),
      }),
    );
  });

  it("destroySession calls DELETE /api/sessions/:sessionId", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ success: true }));

    await plugin.destroySession("session-123");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8848/api/sessions/session-123",
      expect.objectContaining({
        method: "DELETE",
      }),
    );
  });

  it("startListening calls POST /api/sessions/:sessionId/listening", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ success: true }));

    await plugin.startListening("session-123");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8848/api/sessions/session-123/listening",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("stopListening calls DELETE /api/sessions/:sessionId/listening", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ success: true }));

    await plugin.stopListening("session-123");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8848/api/sessions/session-123/listening",
      expect.objectContaining({
        method: "DELETE",
      }),
    );
  });

  it("sendAudio calls POST /api/sessions/:sessionId/audio with base64 payload", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ success: true }));
    const audioData = new Uint8Array([1, 2, 3, 4]).buffer;

    await plugin.sendAudio("session-123", audioData);

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8848/api/sessions/session-123/audio",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ audioBase64: "AQIDBA==" }),
      }),
    );
  });

  it("getSessionStatus calls GET /api/sessions/:sessionId/status", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ state: "listening", isActive: true }),
    );

    const status = await plugin.getSessionStatus("session-123");

    expect(status).toEqual({ state: "listening", isActive: true });
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8848/api/sessions/session-123/status",
      expect.objectContaining({
        method: "GET",
      }),
    );
  });

  it("throws when upstream returns non-2xx", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ error: "nope" }, 500));

    await expect(plugin.startListening("session-123")).rejects.toThrow(
      "Voice Hub error: 500 Error",
    );
  });
});
