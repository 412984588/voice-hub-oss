/**
 * @voice-hub/app
 *
 * CLI 入口
 */

import 'dotenv/config';
import { VoiceHubApp } from './index.js';

function logInfo(message: string): void {
  process.stdout.write(`${message}\n`);
}

function logError(message: string, error: unknown): void {
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`${message}: ${detail}\n`);
}

async function main(): Promise<void> {
  const app = new VoiceHubApp();

  // 优雅关闭处理
  const shutdown = async (signal: string) => {
    logInfo(`\nReceived ${signal}, shutting down gracefully...`);
    await app.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon

  // 启动应用
  try {
    await app.start();
  } catch (error) {
    logError('Failed to start Voice Hub', error);
    process.exit(1);
  }

  // 定期输出状态
  setInterval(() => {
    const status = app.getStatus();
    logInfo(JSON.stringify(status));
  }, 60000);
}

main().catch((error) => {
  logError('Fatal error', error);
  process.exit(1);
});
