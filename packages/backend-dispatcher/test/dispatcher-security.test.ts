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
