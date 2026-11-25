import { prisma } from "./db";
import { encrypt, decrypt } from "./crypto";

// Client-editable credentials, stored encrypted in the DB and entered via
// the Command Center rather than Vercel env vars -- see prisma/schema.prisma
// `Secret` model for why. `getSecret` falls back to an env var of the same
// name so existing Vercel-configured deployments keep working without
// requiring the UI to be used.
export async function getSecret(key: string): Promise<string | null> {
  const row = await prisma.secret.findUnique({ where: { key } });
  if (row) return decrypt(row.valueEncrypted);
  return process.env[key] ?? null;
}

export async function requireSecret(key: string): Promise<string> {
  const value = await getSecret(key);
  if (!value) throw new Error(`${key} is not configured -- set it in the Command Center or as an env var.`);
  return value;
}

export async function setSecret(key: string, value: string): Promise<void> {
  const valueEncrypted = encrypt(value);
  await prisma.secret.upsert({
    where: { key },
    update: { valueEncrypted },
    create: { key, valueEncrypted },
  });
}

export async function deleteSecret(key: string): Promise<void> {
  await prisma.secret.deleteMany({ where: { key } });
}

export async function isSecretSet(key: string): Promise<boolean> {
  const row = await prisma.secret.findUnique({ where: { key } });
  if (row) return true;
  return !!process.env[key];
}
