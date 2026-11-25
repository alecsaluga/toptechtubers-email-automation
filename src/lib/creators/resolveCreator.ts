import type { PrismaClient } from "@prisma/client";

// DB-backed replacement for the hardcoded CREATOR_EMAIL_MAP in
// "Code in JavaScript14" -- same delivered-to -> creator lookup, now backed
// by the CreatorEmail table instead of a hardcoded object.
export async function resolveCreatorByDeliveredTo(db: PrismaClient, deliveredTo: string) {
  const match = deliveredTo.toLowerCase().match(/[\w.+%-]+@[\w.-]+\.[a-zA-Z]{2,}/);
  const toEmail = match ? match[0] : deliveredTo.toLowerCase().trim();
  if (!toEmail) return null;

  const creatorEmail = await db.creatorEmail.findUnique({
    where: { email: toEmail },
    include: { creator: { include: { rateCard: true } } },
  });

  return creatorEmail?.creator ?? null;
}
