/**
 * @voice-hub/app
 *
 * Voice Hub 主应用入口
 */

import { loadConfig, validateConfigForProvider } from '@voice-hub/shared-config';
import { createProvider } from '@voice-hub/provider';
import { DatabaseManager, MemoryStore } from '@voice-hub/memory-bank';
import { Dispatcher } from '@voice-hub/backend-dispatcher';
import { VoiceRuntime } from '@voice-hub/core-runtime';
import { VoiceHubServer } from './server.js';
import { DiscordBot } from './discord-bot.js';

/** Voice Hub 应用类 */
export class VoiceHubApp {
  private config = loadConfig();
  private database: DatabaseManager;
  private memoryStore: MemoryStore;
  private dispatcher: Dispatcher | null = null;
  private runtime: VoiceRuntime | null = null;
  private discordBot: DiscordBot | null = null;
  private server: VoiceHubServer | null = null;
  private isRunning = false;

  constructor() {
    // 验证配置
    const validation = validateConfigForProvider(this.config);
    if (!validation.valid) {
      throw new Error(`Configuration error:\n${validation.errors.join('\n')}`);
    }

    // 初始化数据库
    this.database = new DatabaseManager({
      dbPath: this.config.memoryDbPath,
      walEnabled: this.config.memoryWalEnabled,
      busyTimeout: this.config.memoryBusyTimeout,
      foreignKeys: true,
    });
    this.database.init();

    // 初始化记忆存储
    this.memoryStore = new MemoryStore(this.database);

    // 初始化后端分发器
    if (this.config.backendDispatchUrl) {
      this.dispatcher = new Dispatcher({
        url: this.config.backendDispatchUrl,
        timeoutMs: this.config.backendTimeoutMs,
        maxRetries: this.config.backendMaxRetries,
        retryDelayMs: 1000,
        secret: this.config.webhookSecret,
        exponentialBackoff: true,
      });
    }

    // 创建提供商
    const provider = createProvider(this.config, 'default-session');

    // 创建运行时
    this.runtime = new VoiceRuntime({
      config: this.config,
      provider: provider || undefined,
      memoryStore: this.memoryStore,
      dispatcher: this.dispatcher || undefined,
    });

    // 创建 Discord Bot
    this.discordBot = new DiscordBot(this.config, this.runtime);

    // 创建 Web 服务器
    this.server = new VoiceHubServer(this.config, this.runtime);
  }

  /** 启动应用 */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Voice Hub is already running');
    }

    this.logInfo('Starting Voice Hub...');
    let runtimeStarted = false;
    let discordStarted = false;
    let serverStarted = false;

    try {
      // 启动运行时
      if (this.runtime) {
        await this.runtime.start();
        runtimeStarted = true;
      }

      // 启动 Discord Bot
      if (this.discordBot) {
        await this.discordBot.start();
        discordStarted = true;
        this.logInfo('Discord bot connected');
      }

      // 启动 Web 服务器
      if (this.server) {
        await this.server.start();
        serverStarted = true;
        this.logInfo(`Web server listening on port ${this.config.webhookPort}`);
      }

      this.isRunning = true;
      this.logInfo('Voice Hub is running');
    } catch (error) {
      // 启动失败时回滚已经启动的组件
      if (serverStarted && this.server) {
        await this.stopSafely(() => this.server!.stop(), 'web server');
      }

      if (discordStarted && this.discordBot) {
        await this.stopSafely(() => this.discordBot!.stop(), 'discord bot');
      }

      if (runtimeStarted && this.runtime) {
        await this.stopSafely(() => this.runtime!.stop(), 'runtime');
      }

      this.isRunning = false;
      throw error;
    }
  }

  /** 停止应用 */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logInfo('Stopping Voice Hub...');

    // 停止 Web 服务器
    if (this.server) {
      await this.server.stop();
    }

    // 停止 Discord Bot
    if (this.discordBot) {
      await this.discordBot.stop();
    }

    // 停止运行时
    if (this.runtime) {
      await this.runtime.stop();
    }

    // 关闭数据库
    this.database.close();

    this.isRunning = false;
    this.logInfo('Voice Hub stopped');
  }

  /** 获取运行状态 */
  getStatus(): {
    running: boolean;
    uptime: number;
    activeSessions: number;
  } {
    return {
      running: this.isRunning,
      uptime: this.isRunning ? process.uptime() : 0,
      activeSessions: this.runtime?.getActiveSessionCount() || 0,
    };
  }

  private logInfo(message: string): void {
    process.stdout.write(`[voice-hub-app] ${message}\n`);
  }

  private async stopSafely(stopFn: () => Promise<void>, component: string): Promise<void> {
    try {
      await stopFn();
    } catch (error) {
      const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
      process.stderr.write(`[voice-hub-app] Failed to rollback ${component}: ${detail}\n`);
    }
  }
}
