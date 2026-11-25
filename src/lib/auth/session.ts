import crypto from "node:crypto";

export const SESSION_COOKIE_NAME = "ttt_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
}

// Stateless session token: "<expiresAtMs>.<hmac>" -- no DB lookup needed to
// verify a request, so the proxy gate (see src/proxy.ts) stays fast and
// doesn't add a DB round-trip to every single request.
export function createSessionCookieValue(): string {
  const payload = String(Date.now() + SESSION_DURATION_MS);
  return `${payload}.${sign(payload)}`;
}

export function verifySessionCookie(value: string): boolean {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return false;

  const expectedSig = sign(payload);
  const sigBuf = Buffer.from(signature, "hex");
  const expectedBuf = Buffer.from(expectedSig, "hex");
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}
