import crypto from "node:crypto";

// AES-256-GCM at-rest encryption for client-entered credentials (see
// src/lib/secrets.ts). ENCRYPTION_KEY must be a 32-byte key, base64-encoded,
// set only as a Vercel/infra env var -- never client-editable, never logged.
// Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY is not set -- required to store credentials securely. Generate one with " +
        `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" and set it as an env var.`
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(`ENCRYPTION_KEY must decode to exactly 32 bytes (got ${key.length})`);
  }
  return key;
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
