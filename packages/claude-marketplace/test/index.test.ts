/**
 * @voice-hub/claude-marketplace Tests
 */

import { describe, it, expect } from "vitest";
import {
  MANIFEST,
  CLAUDE_CODE_PLUGIN,
  INSTALLATION_INSTRUCTIONS,
} from "../src/index.js";

describe("@voice-hub/claude-marketplace", () => {
  describe("MANIFEST", () => {
    it("should have required manifest fields", () => {
      expect(MANIFEST).toBeDefined();
      expect(MANIFEST.id).toBe("voice-hub");
      expect(MANIFEST.name).toBe("Voice Hub");
      expect(MANIFEST.version).toBe("0.1.0");
    });

    it("should have description", () => {
      expect(MANIFEST.description).toBe(
        "Real-time voice interaction middleware for Claude Code and OpenClaw",
      );
    });

    it("should have author and license", () => {
      expect(MANIFEST.author).toBe("Voice Hub Team");
      expect(MANIFEST.license).toBe("MIT");
    });

    it("should have repository URLs", () => {
      expect(MANIFEST.homepage).toBe("https://github.com/voice-hub/voice-hub");
      expect(MANIFEST.repository).toBe(
        "https://github.com/voice-hub/voice-hub",
      );
    });

    it("should have relevant keywords", () => {
      expect(MANIFEST.keywords).toContain("voice");
      expect(MANIFEST.keywords).toContain("audio");
      expect(MANIFEST.keywords).toContain("discord");
      expect(MANIFEST.keywords).toContain("realtime");
    });

    it("should have capabilities defined", () => {
      expect(MANIFEST.capabilities).toBeDefined();
      expect(MANIFEST.capabilities.voiceInput).toBe(true);
      expect(MANIFEST.capabilities.voiceOutput).toBe(true);
      expect(MANIFEST.capabilities.sessionManagement).toBe(true);
      expect(MANIFEST.capabilities.memoryStorage).toBe(true);
      expect(MANIFEST.capabilities.backendDispatch).toBe(true);
    });

    it("should have compatibility requirements", () => {
      expect(MANIFEST.compatibility).toBeDefined();
      expect(MANIFEST.compatibility.claudeCode).toBe(">=1.0.0");
      expect(MANIFEST.compatibility.openclaw).toBe(">=0.1.0");
      expect(MANIFEST.compatibility.node).toBe(">=22.12.0");
    });

    it("should have dependencies defined", () => {
      expect(MANIFEST.dependencies).toBeDefined();
      expect(MANIFEST.dependencies.runtime).toContain(
        "@voice-hub/core-runtime",
      );
      expect(MANIFEST.dependencies.optional).toContain(
        "@voice-hub/openclaw-plugin",
      );
    });

    it("should have installation config", () => {
      expect(MANIFEST.installation).toBeDefined();
      expect(MANIFEST.installation.type).toBe("npm");
      expect(MANIFEST.installation.package).toBe(
        "@voice-hub/claude-marketplace",
      );
    });

    it("should have configuration env vars", () => {
      expect(MANIFEST.configuration).toBeDefined();
      expect(MANIFEST.configuration.env).toContain("DISCORD_BOT_TOKEN");
      expect(MANIFEST.configuration.env).toContain("VOICE_PROVIDER");
      expect(MANIFEST.configuration.env).toContain("WEBHOOK_PORT");
    });
  });

  describe("CLAUDE_CODE_PLUGIN", () => {
    it("should have plugin name and id", () => {
      expect(CLAUDE_CODE_PLUGIN.name).toBe("Voice Hub");
      expect(CLAUDE_CODE_PLUGIN.id).toBe("voice-hub");
    });

    it("should have voice commands defined", () => {
      expect(CLAUDE_CODE_PLUGIN.commands).toBeDefined();
      expect(CLAUDE_CODE_PLUGIN.commands.length).toBeGreaterThan(0);

      const startCommand = CLAUDE_CODE_PLUGIN.commands.find(
        (c: any) => c.name === "voice.start",
      );
      expect(startCommand).toBeDefined();
      expect(startCommand?.description).toBe("Start a new voice session");
    });

    it("should have settings defined", () => {
      expect(CLAUDE_CODE_PLUGIN.settings).toBeDefined();

      const providerSetting = CLAUDE_CODE_PLUGIN.settings.find(
        (s: any) => s.key === "voice.provider",
      );
      expect(providerSetting).toBeDefined();
      expect(providerSetting?.type).toBe("select");
      expect(providerSetting?.default).toBe("local-mock");
    });

    it("should have notifications defined", () => {
      expect(CLAUDE_CODE_PLUGIN.notifications).toBeDefined();

      const sessionStarted = CLAUDE_CODE_PLUGIN.notifications.find(
        (n: any) => n.event === "session.started",
      );
      expect(sessionStarted).toBeDefined();
      expect(sessionStarted?.type).toBe("info");
    });
  });

  describe("INSTALLATION_INSTRUCTIONS", () => {
    it("should be a non-empty string", () => {
      expect(typeof INSTALLATION_INSTRUCTIONS).toBe("string");
      expect(INSTALLATION_INSTRUCTIONS.length).toBeGreaterThan(0);
    });

    it("should contain prerequisites section", () => {
      expect(INSTALLATION_INSTRUCTIONS).toContain("Prerequisites");
    });

    it("should contain installation instructions", () => {
      expect(INSTALLATION_INSTRUCTIONS).toContain("Install");
    });

    it("should contain configuration section", () => {
      expect(INSTALLATION_INSTRUCTIONS).toContain("Configuration");
    });

    it("should contain usage example", () => {
      expect(INSTALLATION_INSTRUCTIONS).toContain("Usage");
      expect(INSTALLATION_INSTRUCTIONS).toContain("VoiceHub");
    });
  });

  describe("exports", () => {
    it("should export MANIFEST as default", async () => {
      const manifestModule = await import("../src/index.js");
      expect(manifestModule.default).toBeDefined();
      expect(manifestModule.default).toEqual(MANIFEST);
    });
  });
});
