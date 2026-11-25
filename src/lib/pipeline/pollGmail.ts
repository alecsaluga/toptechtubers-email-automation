import type { PrismaClient } from "@prisma/client";
import { getValidAccessToken } from "../integrations/gmail/tokens";
import { listRecentMessages } from "../integrations/gmail/client";
import { processGmailMessage } from "./processGmailMessage";

const OVERLAP_SECONDS = 5 * 60; // re-check a 5 min window each poll so nothing slips through a boundary
const FIRST_POLL_LOOKBACK_SECONDS = 24 * 60 * 60;

export interface PollResult {
  ok: true;
  skipped?: string;
  fetched?: number;
  processed?: number;
  alreadySeen?: number;
}

// Shared by the Vercel Cron route (/api/cron/poll-gmail) and the manual
// "Check now" button in the Command Center (/api/gmail/poll-now) -- one
// implementation, two triggers, since cron frequency depends on the Vercel
// plan tier and a manual trigger works regardless.
export async function pollGmailOnce(db: PrismaClient): Promise<PollResult> {
  const token = await getValidAccessToken(db);
  if (!token) {
    return { ok: true, skipped: "no Google account connected" };
  }

  const account = await db.googleAccount.findUnique({ where: { email: token.email } });
  const nowSeconds = Math.floor(Date.now() / 1000);
  const after = account?.lastPolledAt
    ? Math.floor(account.lastPolledAt.getTime() / 1000) - OVERLAP_SECONDS
    : nowSeconds - FIRST_POLL_LOOKBACK_SECONDS;

  const messages = await listRecentMessages(token.accessToken, after);

  let processed = 0;
  let skipped = 0;
  for (const message of messages) {
    const result = await processGmailMessage(db, token.accessToken, message);
    if (result) processed++;
    else skipped++;
  }

  await db.googleAccount.update({
    where: { email: token.email },
    data: { lastPolledAt: new Date() },
  });

  return { ok: true, fetched: messages.length, processed, alreadySeen: skipped };
}
