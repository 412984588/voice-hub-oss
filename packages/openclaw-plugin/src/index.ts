/**
 * @voice-hub/openclaw-plugin
 *
 * OpenClaw 插件入口
 * 提供 OpenClaw 系统集成接口
 */

import type { VoiceHubCommand, VoiceHubResponse } from './types.js';

/** OpenClaw 插件类 */
export class OpenClawVoiceHubPlugin {
  private runtimeUrl: string;
  private apiKey?: string;

  constructor(runtimeUrl: string, apiKey?: string) {
    this.runtimeUrl = runtimeUrl;
    this.apiKey = apiKey;
  }

  private buildHeaders(includeJson = false): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': 'openclaw-voice-hub/0.1.0',
    };

    if (includeJson) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${this.runtimeUrl}${path}`, init);
    if (!response.ok) {
      throw new Error(`Voice Hub error: ${response.status} ${response.statusText}`);
    }
    return await response.json() as T;
  }

  /** 发送命令到 Voice Hub */
  async sendCommand(command: VoiceHubCommand): Promise<VoiceHubResponse> {
    switch (command.action) {
      case 'create_session': {
        const sessionId = await this.createSession(command.userId, command.channelId);
        return { success: true, sessionId, timestamp: Date.now() };
      }
      case 'destroy_session':
        await this.destroySession(command.sessionId);
        return { success: true, timestamp: Date.now() };
      case 'start_listening':
        await this.startListening(command.sessionId);
        return { success: true, timestamp: Date.now() };
      case 'stop_listening':
        await this.stopListening(command.sessionId);
        return { success: true, timestamp: Date.now() };
      case 'send_audio':
        await this.sendAudio(
          command.sessionId,
          Uint8Array.from(Buffer.from(command.audio, 'base64')).buffer
        );
        return { success: true, timestamp: Date.now() };
      case 'get_status': {
        const status = await this.getSessionStatus(command.sessionId);
        return { success: true, status, timestamp: Date.now() };
      }
      default:
        throw new Error('Unknown command');
    }
  }

  /** 创建新会话 */
  async createSession(userId?: string, channelId?: string): Promise<string> {
    const response = await this.request<{ sessionId: string }>('/api/sessions', {
      method: 'POST',
      headers: this.buildHeaders(true),
      body: JSON.stringify({ userId, channelId }),
    });
    return response.sessionId;
  }

  /** 销毁会话 */
  async destroySession(sessionId: string): Promise<void> {
    await this.request<{ success: boolean }>(`/api/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: this.buildHeaders(),
    });
  }

  /** 开始语音输入 */
  async startListening(sessionId: string): Promise<void> {
    await this.request<{ success: boolean }>(`/api/sessions/${sessionId}/listening`, {
      method: 'POST',
      headers: this.buildHeaders(),
    });
  }

  /** 停止语音输入 */
  async stopListening(sessionId: string): Promise<void> {
    await this.request<{ success: boolean }>(`/api/sessions/${sessionId}/listening`, {
      method: 'DELETE',
      headers: this.buildHeaders(),
    });
  }

  /** 发送音频数据 */
  async sendAudio(sessionId: string, audioData: ArrayBuffer): Promise<void> {
    await this.request<{ success: boolean }>(`/api/sessions/${sessionId}/audio`, {
      method: 'POST',
      headers: this.buildHeaders(true),
      body: JSON.stringify({
        audioBase64: Buffer.from(audioData).toString('base64'),
      }),
    });
  }

  /** 获取会话状态 */
  async getSessionStatus(sessionId: string): Promise<{
    state: string;
    isActive: boolean;
  }> {
    return await this.request<{
      state: string;
      isActive: boolean;
    }>(`/api/sessions/${sessionId}/status`, {
      method: 'GET',
      headers: this.buildHeaders(),
    });
  }
}

/** OpenClaw 插件工厂 */
export function createPlugin(runtimeUrl: string, apiKey?: string): OpenClawVoiceHubPlugin {
  return new OpenClawVoiceHubPlugin(runtimeUrl, apiKey);
}

// ========== 类型定义 ==========

export type { VoiceHubCommand, VoiceHubResponse } from './types.js';
