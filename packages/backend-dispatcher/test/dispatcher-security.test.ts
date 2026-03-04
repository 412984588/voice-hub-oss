import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dispatcher } from '../src/dispatcher.js';
import {
  signWebhookPayload,
  verifyWebhookSignature,
} from '../src/signature.js';

describe('Dispatcher webhook security headers', () => {
  const payload = {
    id: 'evt_1',
    event: 'backend_task.completed',
    timestamp: 1_700_000_000_000,
    data: { ok: true },
  };

  const config = {
    url: 'https://example.com/webhook',
    timeoutMs: 3000,
    maxRetries: 0,
    retryDelayMs: 1,
    secret: 'ut-secret',
    exponentialBackoff: false,
  };

  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends signature + timestamp headers instead of raw secret', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: () => 'application/json',
      },
      json: async () => ({ status: 'ok' }),
    });

    const dispatcher = new Dispatcher(config);
    await dispatcher.dispatch(payload);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;

    expect(headers['X-Webhook-Signature']).toMatch(/^sha256=/);
    expect(headers['X-Webhook-Timestamp']).toBe(String(payload.timestamp));
    expect(headers['X-Webhook-Secret']).toBeUndefined();
  });
});

describe('Webhook signature helpers', () => {
  const payload = {
    id: 'evt_2',
    event: 'custom.notification',
    timestamp: 1_700_000_000_001,
    data: { message: 'hello' },
  };

  it('creates verifiable signatures', () => {
    const timestamp = String(payload.timestamp);
    const signature = signWebhookPayload(payload, 'secret-a', timestamp);

    expect(signature.startsWith('sha256=')).toBe(true);
    expect(verifyWebhookSignature(payload, 'secret-a', signature, timestamp)).toBe(true);
  });

  it('rejects signature with wrong secret', () => {
    const timestamp = String(payload.timestamp);
    const signature = signWebhookPayload(payload, 'secret-a', timestamp);

    expect(verifyWebhookSignature(payload, 'secret-b', signature, timestamp)).toBe(false);
  });
});

describe('Dispatcher timeout isolation', () => {
  const config = {
    url: 'https://example.com/webhook',
    timeoutMs: 3000,
    maxRetries: 0,
    retryDelayMs: 1,
    secret: 'ut-secret',
    exponentialBackoff: false,
  };

  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('isolates timeout cancellation between concurrent dispatch calls', async () => {
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      const signal = init?.signal as AbortSignal;

      return new Promise((resolve, reject) => {
        const onAbort = () => reject(new Error('This operation was aborted'));
        signal.addEventListener('abort', onAbort, { once: true });

        setTimeout(() => {
          signal.removeEventListener('abort', onAbort);
          resolve({
            ok: true,
            status: 200,
            headers: {
              get: () => 'application/json',
            },
            json: async () => ({ status: 'ok' }),
          });
        }, 60);
      });
    });

    const dispatcher = new Dispatcher(config);

    const firstCall = dispatcher.dispatch(
      {
        id: 'evt-timeout-1',
        event: 'custom.notification',
        timestamp: 1_700_000_000_100,
      },
      {
        timeout: 15,
        maxRetries: 0,
      }
    );

    const secondCall = dispatcher.dispatch(
      {
        id: 'evt-timeout-2',
        event: 'custom.notification',
        timestamp: 1_700_000_000_101,
      },
      {
        timeout: 250,
        maxRetries: 0,
      }
    );

    const [firstResult, secondResult] = await Promise.all([firstCall, secondCall]);

    expect(firstResult.success).toBe(false);
    expect(firstResult.error).toMatch(/abort/i);
    expect(secondResult.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
