import { createHmac, timingSafeEqual } from "node:crypto";

export type DownloadResource = "apk";

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = signPayload(payload, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function createResourceDownloadToken(
  orderId: string,
  resource: DownloadResource,
  secret: string,
  options?: { ttlMs?: number; now?: number },
): string {
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  const now = options?.now ?? Date.now();
  const exp = now + ttlMs;
  const payload = `${resource}.${orderId}.${exp}`;
  return `${payload}.${signPayload(payload, secret)}`;
}

export function verifyResourceDownloadToken(
  token: string,
  orderId: string,
  resource: DownloadResource,
  secret: string,
  options?: { now?: number },
): boolean {
  if (!token || !secret) return false;
  const lastDot = token.lastIndexOf(".");
  if (lastDot <= 0) return false;
  const payload = token.slice(0, lastDot);
  const signature = token.slice(lastDot + 1);
  if (!verifySignature(payload, signature, secret)) return false;

  const [kind, id, expRaw] = payload.split(".");
  if (kind !== resource || id !== orderId) return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp)) return false;
  const now = options?.now ?? Date.now();
  return now <= exp;
}

export function apkDownloadPath(orderId: string, token: string): string {
  return `/api/orders/${orderId}/apk?t=${encodeURIComponent(token)}`;
}
