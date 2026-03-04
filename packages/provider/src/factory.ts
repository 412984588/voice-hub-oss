/**
 * @voice-hub/provider
 *
 * 提供商工厂 - 根据配置创建相应的提供商实例
 */

import type { Config } from '@voice-hub/shared-config';
import type { IAudioProvider } from './types.js';
import { DoubaoProvider } from './doubao-provider.js';
import { LocalMockProvider, type LocalMockConfig } from './local-mock-provider.js';
import { QwenDashscopeProvider } from './qwen-dashscope-provider.js';
import { ProviderState } from './types.js';

/** 提供商类型 */
export type ProviderType = 'disabled' | 'local-mock' | 'doubao' | 'qwen-dashscope';

/** 创建提供商实例 */
export function createProvider(
  config: Config,
  sessionId: string
): IAudioProvider | null {
  const providerType = config.voiceProvider;

  if (providerType === 'disabled') {
    return null;
  }

  const baseConfig = {
    sessionId,
    sampleRate: config.audioSampleRate,
    channels: config.audioChannels,
  };

  switch (providerType) {
    case 'local-mock':
      return new LocalMockProvider({
        ...baseConfig,
        url: 'ws://mock.local',
        mode: 'silence',
        latencyMs: 50,
      } as LocalMockConfig);

    case 'doubao':
      if (!config.doubaoRealtimeWsUrl || !config.doubaoAppId || !config.doubaoAccessToken) {
        throw new Error('Doubao provider requires DOUBAO_REALTIME_WS_URL, DOUBAO_APP_ID, and DOUBAO_ACCESS_TOKEN');
      }
      return new DoubaoProvider({
        ...baseConfig,
        url: config.doubaoRealtimeWsUrl,
        appId: config.doubaoAppId,
        accessToken: config.doubaoAccessToken,
      });

    case 'qwen-dashscope':
      if (!config.qwenRealtimeWsUrl || !config.qwenApiKey) {
        throw new Error('Qwen provider requires QWEN_REALTIME_WS_URL and QWEN_API_KEY');
      }
      return new QwenDashscopeProvider({
        ...baseConfig,
        url: config.qwenRealtimeWsUrl,
        apiKey: config.qwenApiKey,
        model: config.qwenModel || 'qwen3-omni-flash-realtime',
        voice: config.qwenVoice,
        region: config.qwenRegion,
      });

    default:
      throw new Error(`Unknown provider type: ${providerType}`);
  }
}

/** 验证提供商配置 */
export function validateProviderConfig(config: Config): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  switch (config.voiceProvider) {
    case 'doubao':
      if (!config.doubaoRealtimeWsUrl) {
        errors.push('DOUBAO_REALTIME_WS_URL is required for doubao provider');
      }
      if (!config.doubaoAppId) {
        errors.push('DOUBAO_APP_ID is required for doubao provider');
      }
      if (!config.doubaoAccessToken) {
        errors.push('DOUBAO_ACCESS_TOKEN is required for doubao provider');
      }
      break;

    case 'local-mock':
      // 无需额外配置
      break;

    case 'qwen-dashscope':
      if (!config.qwenRealtimeWsUrl) {
        errors.push('QWEN_REALTIME_WS_URL is required for qwen-dashscope provider');
      }
      if (!config.qwenApiKey) {
        errors.push('QWEN_API_KEY is required for qwen-dashscope provider');
      }
      break;

    case 'disabled':
      // 禁用状态无需配置
      break;

    default:
      errors.push(`Unknown voice provider: ${config.voiceProvider}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/** 检查提供商是否可用 */
export function isProviderAvailable(provider: IAudioProvider | null): boolean {
  return provider !== null && provider.getState() !== ProviderState.CLOSED;
}
