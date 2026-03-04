import { describe, expect, it } from "vitest";
import { configSchema, internalConfigSchema } from "../src/schema.js";

const minimalEnv = {
  DISCORD_BOT_TOKEN: "token",
  DISCORD_GUILD_ID: "guild",
  DISCORD_VOICE_CHANNEL_ID: "voice",
};

describe("config schema boolean parsing", () => {
  it('parses "false" and "0" as false', () => {
    const parsed = configSchema.parse({
      ...minimalEnv,
      MEMORY_WAL_ENABLED: "false",
      LOG_PRETTY: "0",
      WEBHOOK_LEGACY_SECRET_HEADER: "false",
      WEBHOOK_SHADOW_MODE: "0",
    });

    expect(parsed.MEMORY_WAL_ENABLED).toBe(false);
    expect(parsed.LOG_PRETTY).toBe(false);
    expect(parsed.WEBHOOK_LEGACY_SECRET_HEADER).toBe(false);
    expect(parsed.WEBHOOK_SHADOW_MODE).toBe(false);
  });

  it("parses enabled values as true", () => {
    const parsed = configSchema.parse({
      ...minimalEnv,
      MEMORY_WAL_ENABLED: "true",
      LOG_PRETTY: "1",
      WEBHOOK_LEGACY_SECRET_HEADER: "yes",
      WEBHOOK_SHADOW_MODE: "on",
    });

    expect(parsed.MEMORY_WAL_ENABLED).toBe(true);
    expect(parsed.LOG_PRETTY).toBe(true);
    expect(parsed.WEBHOOK_LEGACY_SECRET_HEADER).toBe(true);
    expect(parsed.WEBHOOK_SHADOW_MODE).toBe(true);
  });

  it("rejects invalid boolean strings", () => {
    expect(() =>
      configSchema.parse({
        ...minimalEnv,
        MEMORY_WAL_ENABLED: "maybe",
      }),
    ).toThrow();
  });
});

describe("internal config transform", () => {
  it("splits CORS allowlist by comma", () => {
    const parsed = internalConfigSchema.parse({
      ...minimalEnv,
      CORS_ALLOWED_ORIGINS: "https://a.example.com, https://b.example.com",
    });

    expect(parsed.corsAllowedOrigins).toEqual([
      "https://a.example.com",
      "https://b.example.com",
    ]);
  });
});
