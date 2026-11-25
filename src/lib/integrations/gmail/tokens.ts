import type { PrismaClient } from "@prisma/client";
import { refreshAccessToken } from "./oauth";

const EXPIRY_BUFFER_MS = 60_000; // refresh a minute before actual expiry

export async function getValidAccessToken(db: PrismaClient): Promise<{ email: string; accessToken: string } | null> {
  const account = await db.googleAccount.findFirst();
  if (!account) return null;

  if (account.tokenExpiresAt.getTime() - EXPIRY_BUFFER_MS > Date.now()) {
    return { email: account.email, accessToken: account.accessToken };
  }

  const refreshed = await refreshAccessToken(account.refreshToken);
  const tokenExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

  await db.googleAccount.update({
    where: { id: account.id },
    data: { accessToken: refreshed.access_token, tokenExpiresAt },
  });

  return { email: account.email, accessToken: refreshed.access_token };
}
