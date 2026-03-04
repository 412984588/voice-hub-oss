import { createHmac, timingSafeEqual } from "node:crypto";
import type { WebhookPayload } from "@voice-hub/shared-types";

export const DEFAULT_WEBHOOK_MAX_SKEW_MS = 5 * 60 * 1000;

function buildSigningMessage(
  payload: WebhookPayload,
  timestamp: string,
): string {
  return `${timestamp}.${JSON.stringify(payload)}`;
}

export function signWebhookPayload(
  payload: WebhookPayload,
  secret: string,
  timestamp: string,
): string {
  const hmac = createHmac("sha256", secret);
  hmac.update(buildSigningMessage(payload, timestamp));
  return `sha256=${hmac.digest("hex")}`;
}

export function verifyWebhookSignature(
  payload: WebhookPayload,
  secret: string,
  signature: string,
  timestamp: string,
): boolean {
  if (!signature.startsWith("sha256=")) {
    return false;
  }

  const expected = signWebhookPayload(payload, secret, timestamp);
  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export function isWebhookTimestampFresh(
  timestamp: string,
  now = Date.now(),
  maxSkewMs = DEFAULT_WEBHOOK_MAX_SKEW_MS,
): boolean {
  const parsed = Number(timestamp);

  if (!Number.isFinite(parsed)) {
    return false;
  }

  return Math.abs(now - parsed) <= maxSkewMs;
}
