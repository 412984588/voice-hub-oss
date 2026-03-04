import { describe, expect, it, vi } from 'vitest';
import { QwenDashscopeProvider } from '../src/qwen-dashscope-provider.js';

describe('QwenDashscopeProvider', () => {
  it('does not duplicate connected when session.created is emitted repeatedly', () => {
    const provider = new QwenDashscopeProvider({
      sessionId: 's1',
      url: 'wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime',
      sampleRate: 16000,
      channels: 1,
      apiKey: 'test-key',
      model: 'qwen3-omni-flash-realtime',
    });

    const connected = vi.fn();
    provider.on('connected', connected);

    const handleMessage = (
      provider as unknown as {
        handleMessage: (data: Buffer | string | ArrayBuffer) => void;
      }
    ).handleMessage;

    handleMessage.call(provider, JSON.stringify({ type: 'session.created' }));
    handleMessage.call(provider, JSON.stringify({ type: 'session.created' }));

    expect(connected).toHaveBeenCalledTimes(1);
  });

  it('emits audio frame for response.audio.delta', () => {
    const provider = new QwenDashscopeProvider({
      sessionId: 's1',
      url: 'wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime',
      sampleRate: 16000,
      channels: 1,
      apiKey: 'test-key',
      model: 'qwen3-omni-flash-realtime',
    });
    const onAudio = vi.fn();
    provider.on('audio', onAudio);
    const pcm = Buffer.from([1, 0, 2, 0, 3, 0]);
    const handleMessage = (
      provider as unknown as {
        handleMessage: (data: Buffer | string | ArrayBuffer) => void;
      }
    ).handleMessage;

    handleMessage.call(
      provider,
      JSON.stringify({
        type: 'response.audio.delta',
        delta: pcm.toString('base64'),
      })
    );

    expect(onAudio).toHaveBeenCalledTimes(1);
    const frame = onAudio.mock.calls[0]?.[0];
    expect(Array.from(frame.data as Int16Array)).toEqual([1, 2, 3]);
  });

  it('emits provider error event for invalid payload', () => {
    const provider = new QwenDashscopeProvider({
      sessionId: 's1',
      url: 'wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime',
      sampleRate: 16000,
      channels: 1,
      apiKey: 'test-key',
      model: 'qwen3-omni-flash-realtime',
    });
    const onError = vi.fn();
    provider.on('error', onError);
    const handleMessage = (
      provider as unknown as {
        handleMessage: (data: Buffer | string | ArrayBuffer) => void;
      }
    ).handleMessage;

    handleMessage.call(provider, '{invalid json}');

    expect(onError).toHaveBeenCalledTimes(1);
  });
});
