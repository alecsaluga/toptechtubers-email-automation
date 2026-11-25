import type { PrismaClient } from "@prisma/client";
import type { RosterRow } from "./rosterRow";
import { toAssignee, slugifyCreatorName } from "./rosterMapping";

export interface RateCardSyncResult {
  updated: string[];
  created: string[];
}

// Incremental, non-destructive: updates rate-card fields for creators that
// already exist (matched case-insensitively by name) and creates any new
// ones found in `rows`. Never touches a creator that's missing from `rows`
// -- unlike prisma/seed.ts's seedCreators (a one-time full DB build), this
// is meant to be re-run repeatedly against a live sheet without wiping
// senders, reply logs, or creators the sheet doesn't know about.
export async function syncRateCardFromRosterRows(
  db: PrismaClient,
  rows: RosterRow[]
): Promise<RateCardSyncResult> {
  const result: RateCardSyncResult = { updated: [], created: [] };

  for (const row of rows) {
    const rateCardData = {
      youtubeSubs: row.youtubeSubs,
      dedicatedPrice: row.dedicatedPrice,
      midRoll60Price: row.midRoll60Price,
      midRoll120Price: row.midRoll120Price,
      tiktokFollowers: row.tiktokFollowers,
      instagramFollowers: row.instagramFollowers,
      xFollowers: row.xFollowers,
      threadsFollowers: row.threadsFollowers,
      facebookFollowers: row.facebookFollowers,
      oneCrossPostPrice: row.oneCrossPostPrice,
      threePlatformPrice: row.threePlatformPrice,
      allPlatformPrice: row.allPlatformPrice,
    };

    const existing = await db.creator.findFirst({
      where: { name: { equals: row.name, mode: "insensitive" } },
    });

    if (existing) {
      await db.rateCard.upsert({
        where: { creatorId: existing.id },
        update: rateCardData,
        create: { creatorId: existing.id, ...rateCardData },
      });
      result.updated.push(row.name);
    } else {
      await db.creator.create({
        data: {
          name: row.name,
          slug: row.slug ?? slugifyCreatorName(row.name),
          channelUrl: row.channelUrl,
          niche: row.niche,
          country: row.country,
          assignee: toAssignee(row.manager),
          ccRules: row.ccNote,
          rateCard: { create: rateCardData },
        },
      });
      result.created.push(row.name);
    }
  }

  return result;
}
