// One-off backfill: re-resolves creator + rebuilds the reply preview for
// ReplyLog entries that were affected by the "wrong Delivered-To header"
// bug (fixed in src/lib/integrations/gmail/client.ts -- it was reading the
// final shared-inbox address instead of the original creator-specific one
// from forwarded mail). Re-fetches each affected message from Gmail and
// re-runs resolution with the corrected extraction logic.
//
// Usage: npx tsx scripts/backfill-creator-resolution.ts
import { PrismaClient } from "@prisma/client";
import { getValidAccessToken } from "../src/lib/integrations/gmail/tokens";
import { extractOriginalRecipient } from "../src/lib/integrations/gmail/client";
import { resolveCreatorByDeliveredTo } from "../src/lib/creators/resolveCreator";
import { buildRateCardHtml } from "../src/lib/reply-builder/rateCardTemplate";

const prisma = new PrismaClient();
const REPLY_ELIGIBLE = ["good_opportunity", "imp_outreach", "agency_markup"];

async function main() {
  const token = await getValidAccessToken(prisma);
  if (!token) throw new Error("No Google account connected -- can't refetch message headers.");

  const candidates = await prisma.replyLog.findMany({
    where: {
      finalCategory: { in: REPLY_ELIGIBLE },
      renderedHtml: null,
      gmailMessageId: { not: null },
    },
  });

  console.log(`Found ${candidates.length} entries to re-check.`);

  let fixed = 0;
  let stillUnresolved = 0;

  for (const entry of candidates) {
    const res = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${entry.gmailMessageId}?format=metadata&metadataHeaders=Delivered-To&metadataHeaders=X-Forwarded-For&metadataHeaders=To`, {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    });
    if (!res.ok) {
      console.log(`  ${entry.id}: fetch failed (${res.status}), skipping`);
      continue;
    }
    const data = await res.json();
    const headers: { name: string; value: string }[] = data.payload?.headers || [];
    const correctedTo = extractOriginalRecipient(headers);

    const creator = await resolveCreatorByDeliveredTo(prisma, correctedTo);
    if (!creator) {
      stillUnresolved++;
      continue;
    }

    const renderedHtml = buildRateCardHtml(creator, { applyMarkup: entry.finalCategory === "agency_markup" });
    await prisma.replyLog.update({
      where: { id: entry.id },
      data: {
        inboundTo: correctedTo,
        creatorName: creator.name,
        renderedHtml,
        ccPreview: creator.ccRules ?? undefined,
      },
    });
    fixed++;
    console.log(`  ${entry.id}: resolved to ${creator.name}`);
  }

  console.log(`\nDone. Fixed ${fixed}, still unresolved (no matching creator) ${stillUnresolved}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
