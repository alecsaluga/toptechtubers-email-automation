import crypto from "node:crypto";

const KEYLEN = 64;

// scrypt (Node built-in, no dependency) with a random salt per password --
// stored as "saltHex:hashHex". One-way: even a DB + ENCRYPTION_KEY
// compromise doesn't directly recover the login password, unlike the
// reversible encryption used for third-party API credentials.
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, KEYLEN);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const derived = crypto.scryptSync(password, salt, KEYLEN);
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}
