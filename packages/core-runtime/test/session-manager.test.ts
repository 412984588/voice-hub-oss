import { describe, expect, it, vi } from 'vitest';
import type { IAudioProvider } from '@voice-hub/provider';
import { SessionManager } from '../src/session-manager.js';

describe('SessionManager', () => {
  it('swallows timeout destroy failures to avoid unhandled rejections', async () => {
    vi.useFakeTimers();

    try {
      const manager = new SessionManager({
        sessionTimeoutMs: 10,
        maxReconnectAttempts: 3,
        reconnectDelayMs: 1000,
        autoSaveAudio: false,
        audioSaveDir: './tmp/audio',
        enableMemoryStore: false,
        enableBackendDispatch: false,
      });
      const sessionId = await manager.createSession();
      const error = new Error('disconnect failed');
      const provider = {
        disconnect: vi.fn(async () => {
          throw error;
        }),
      } as unknown as IAudioProvider;

      manager.setSessionProvider(sessionId, provider);

      const unhandled: unknown[] = [];
      const onUnhandled = (reason: unknown): void => {
        unhandled.push(reason);
      };
      process.on('unhandledRejection', onUnhandled);

      manager.setSessionTimeout(sessionId);
      await vi.advanceTimersByTimeAsync(20);
      await Promise.resolve();
      process.off('unhandledRejection', onUnhandled);

      expect(unhandled).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
