/**
 * @voice-hub/app
 *
 * CLI 入口
 */

import "dotenv/config";
import { VoiceHubApp } from "./index.js";

function logInfo(message: string): void {
  process.stdout.write(`${message}\n`);
}

function logError(message: string, error: unknown): void {
  const detail =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`${message}: ${detail}\n`);
}

async function main(): Promise<void> {
  const app = new VoiceHubApp();
  let isShuttingDown = false;

  // 优雅关闭处理
  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;
    logInfo(`\nReceived ${signal}, shutting down gracefully...`);
    try {
      await app.stop();
      process.exit(0);
    } catch (error) {
      logError("Failed to stop Voice Hub", error);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
  process.on("SIGUSR2", () => {
    void shutdown("SIGUSR2");
  }); // nodemon

  // 启动应用
  try {
    await app.start();
  } catch (error) {
    logError("Failed to start Voice Hub", error);
    process.exit(1);
  }

  // 定期输出状态
  const statusTimer = setInterval(() => {
    const status = app.getStatus();
    logInfo(JSON.stringify(status));
  }, 60000);
  statusTimer.unref();
}

main().catch((error) => {
  logError("Fatal error", error);
  process.exit(1);
});
