/**
 * @voice-hub/openclaw-plugin
 *
 * OpenClaw 插件类型定义
 */

/** Voice Hub 命令类型 */
export type VoiceHubCommand =
  | {
      action: 'create_session';
      userId?: string;
      channelId?: string;
    }
  | {
      action: 'destroy_session';
      sessionId: string;
    }
  | {
      action: 'start_listening';
      sessionId: string;
    }
  | {
      action: 'stop_listening';
      sessionId: string;
    }
  | {
      action: 'send_audio';
      sessionId: string;
      audio: string; // base64 encoded
    }
  | {
      action: 'get_status';
      sessionId: string;
    };

/** Voice Hub 响应类型 */
export interface VoiceHubResponse {
  success: boolean;
  sessionId?: string;
  status?: {
    state: string;
    isActive: boolean;
  };
  error?: string;
  timestamp: number;
}

/** OpenClaw 集成接口 */
export interface OpenClawIntegration {
  /** 插件名称 */
  name: 'voice-hub';

  /** 插件版本 */
  version: string;

  /** 初始化插件 */
  init(config: { runtimeUrl: string; apiKey?: string }): Promise<void>;

  /** 创建会话 */
  createSession(userId?: string): Promise<string>;

  /** 销毁会话 */
  destroySession(sessionId: string): Promise<void>;

  /** 开始语音处理 */
  startVoiceProcessing(sessionId: string): Promise<void>;

  /** 停止语音处理 */
  stopVoiceProcessing(sessionId: string): Promise<void>;

  /** 发送音频 */
  sendAudio(sessionId: string, audio: ArrayBuffer): Promise<void>;

  /** 接收音频（注册回调） */
  onAudio(callback: (audio: ArrayBuffer) => void): void;
}
