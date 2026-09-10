import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "fabrica_session";
export const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export function checkPassword(input: string, expected: string): boolean {
  if (!input || !expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function createSessionToken(secret: string, userId: string): string {
  const payload = `${userId}.${Date.now()}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string, secret: string): boolean {
  if (!token || !secret) return false;
  const lastDot = token.lastIndexOf(".");
  if (lastDot <= 0) return false;
  const payload = token.slice(0, lastDot);
  const signature = token.slice(lastDot + 1);
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function parseSessionUserId(
  token: string,
  secret: string,
  now = Date.now(),
): string | null {
  if (!verifySessionToken(token, secret)) return null;
  const lastDot = token.lastIndexOf(".");
  const payload = token.slice(0, lastDot);
  const [userId, issuedAtRaw] = payload.split(".");
  const issuedAt = Number(issuedAtRaw);
  if (!userId || !Number.isFinite(issuedAt)) return null;
  if (now - issuedAt > SESSION_MAX_AGE_MS) return null;
  return userId;
}
