import { describe, expect, it, vi } from 'vitest';
import { DoubaoProvider } from '../src/doubao-provider.js';
import { LocalMockProvider } from '../src/local-mock-provider.js';

describe('provider events', () => {
  it('dispatches connected event to legacy channel and provider channel once', async () => {
    const provider = new LocalMockProvider({
      sessionId: 's1',
      url: 'ws://mock.local',
      sampleRate: 16000,
      channels: 1,
    });

    const connected = vi.fn();
    const providerEvent = vi.fn();
    provider.on('connected', connected);
    provider.on('provider', providerEvent);

    await provider.connect();

    expect(connected).toHaveBeenCalledTimes(1);
    expect(providerEvent).toHaveBeenCalledTimes(1);
    expect(providerEvent.mock.calls[0]?.[0]).toMatchObject({
      type: 'provider',
      subType: 'connected',
      provider: 'local-mock',
    });
  });

  it('does not duplicate connected when session_started is emitted repeatedly', () => {
    const provider = new DoubaoProvider({
      sessionId: 's1',
      url: 'ws://mock.local',
      sampleRate: 16000,
      channels: 1,
      appId: 'app-id',
      accessToken: 'token',
    });

    const connected = vi.fn();
    provider.on('connected', connected);
    const handleMessage = (
      provider as unknown as {
        handleMessage: (data: Buffer | string | ArrayBuffer) => void;
      }
    ).handleMessage;
    handleMessage.call(provider, JSON.stringify({ type: 'session_started' }));
    handleMessage.call(provider, JSON.stringify({ type: 'session_started' }));

    expect(connected).toHaveBeenCalledTimes(1);
  });
});
