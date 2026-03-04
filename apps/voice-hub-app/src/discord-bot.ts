/**
 * @voice-hub/app
 *
 * Discord Bot 实现
 */

import { Client, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } from '@discordjs/voice';
import { Readable } from 'stream';
import type { Config } from '@voice-hub/shared-config';
import type { VoiceRuntime } from '@voice-hub/core-runtime';
import type { AudioFrame } from '@voice-hub/shared-types';
import type { IAudioProvider } from '@voice-hub/provider';

/** Discord Bot 类 */
export class DiscordBot {
  private config: Config;
  private runtime: VoiceRuntime;
  private client: Client;
  private audioPlayer = createAudioPlayer();
  private currentConnection: ReturnType<typeof joinVoiceChannel> | null = null;
  private sessionId: string | null = null;
  private isRunning = false;

  constructor(config: Config, runtime: VoiceRuntime) {
    this.config = config;
    this.runtime = runtime;

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
      ],
    });

    this.setupEventHandlers();
    this.setupAudioPlayer();
  }

  /** 设置事件处理器 */
  private setupEventHandlers(): void {
    this.client.once('ready', () => {
      this.logInfo(`Discord bot logged in as ${this.client.user?.tag}`);
    });

    this.client.on('voiceStateUpdate', async (oldState, newState) => {
      // 检测用户加入/离开语音频道
      if (newState.channelId && newState.channelId === this.config.discordVoiceChannelId) {
        // 用户加入
        if (!oldState.channelId) {
          this.logInfo(`User ${newState.member?.user.tag} joined voice channel`);
          await this.handleUserJoined(newState.member?.id);
        }
      } else if (oldState.channelId === this.config.discordVoiceChannelId) {
        // 用户离开
        this.logInfo(`User ${oldState.member?.user.tag} left voice channel`);
        await this.handleUserLeft(oldState.member?.id);
      }
    });

    this.client.on('error', (error) => {
      this.logError('Discord client error', error);
    });
  }

  /** 设置音频播放器 */
  private setupAudioPlayer(): void {
    this.audioPlayer.on(AudioPlayerStatus.Idle, () => {
      this.logInfo('Audio player is idle');
    });

    this.audioPlayer.on(AudioPlayerStatus.Playing, () => {
      this.logInfo('Audio player is playing');
    });

    this.audioPlayer.on('error', (error) => {
      this.logError('Audio player error', error);
    });
  }

  /** 启动 Bot */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    await this.client.login(this.config.discordBotToken);

    // 加入语音频道
    await this.joinVoiceChannel();

    // 创建会话
    this.sessionId = await this.runtime.createSession(
      this.client.user?.id,
      this.config.discordVoiceChannelId
    );

    this.isRunning = true;
  }

  /** 停止 Bot */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // 销毁会话
    if (this.sessionId) {
      await this.runtime.destroySession(this.sessionId);
      this.sessionId = null;
    }

    // 离开语音频道
    if (this.currentConnection) {
      this.currentConnection.destroy();
      this.currentConnection = null;
    }

    // 断开 Discord 连接
    this.client.destroy();

    this.isRunning = false;
  }

  /** 加入语音频道 */
  private async joinVoiceChannel(): Promise<void> {
    const guild = await this.client.guilds.fetch(this.config.discordGuildId);
    const channel = await guild.channels.fetch(this.config.discordVoiceChannelId);

    if (!channel || !channel.isVoiceBased()) {
      throw new Error('Channel is not a voice channel');
    }

    this.currentConnection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
    });

    // 订阅音频流
    const subscription = this.currentConnection.subscribe(this.audioPlayer);

    if (subscription) {
      this.logInfo('Subscribed to audio connection');
    }
  }

  /** 处理用户加入 */
  private async handleUserJoined(userId?: string): Promise<void> {
    if (!userId || !this.sessionId) {
      return;
    }

    // 开始监听
    await this.runtime.startListening(this.sessionId);
  }

  /** 处理用户离开 */
  private async handleUserLeft(userId?: string): Promise<void> {
    if (!userId || !this.sessionId) {
      return;
    }

    // 停止监听
    await this.runtime.stopListening(this.sessionId);
  }

  /** 播放音频 */
  playAudio(audioBuffer: Buffer): void {
    const resource = createAudioResource(Readable.from(audioBuffer));
    this.audioPlayer.play(resource);
  }

  private logInfo(message: string): void {
    process.stdout.write(`[discord-bot] ${message}\n`);
  }

  private logError(message: string, error: unknown): void {
    const detail = error instanceof Error
      ? (error.stack ?? error.message)
      : String(error);
    process.stderr.write(`[discord-bot] ${message}: ${detail}\n`);
  }
}
