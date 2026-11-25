import type { RateCard } from "@prisma/client";

// Prisma's Decimal isn't a plain object, so it can't cross the Server ->
// Client Component boundary as-is (Next.js throws at request time even
// though the build succeeds). Convert money fields to plain numbers before
// passing rate card data down to a client component.
export type PlainRateCard = {
  [K in keyof RateCard]: RateCard[K] extends { toNumber: () => number } | null
    ? number | null
    : RateCard[K];
};

export function toPlainRateCard(rateCard: RateCard | null): PlainRateCard | null {
  if (!rateCard) return null;
  return {
    ...rateCard,
    dedicatedPrice: rateCard.dedicatedPrice === null ? null : Number(rateCard.dedicatedPrice),
    midRoll60Price: rateCard.midRoll60Price === null ? null : Number(rateCard.midRoll60Price),
    midRoll120Price: rateCard.midRoll120Price === null ? null : Number(rateCard.midRoll120Price),
    oneCrossPostPrice: rateCard.oneCrossPostPrice === null ? null : Number(rateCard.oneCrossPostPrice),
    threePlatformPrice: rateCard.threePlatformPrice === null ? null : Number(rateCard.threePlatformPrice),
    allPlatformPrice: rateCard.allPlatformPrice === null ? null : Number(rateCard.allPlatformPrice),
  };
}
