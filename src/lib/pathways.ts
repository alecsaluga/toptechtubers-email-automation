import { prisma } from "./db";
import type { PathwayKey } from "@prisma/client";

export const PATHWAY_KEYS: PathwayKey[] = ["GOOD_OPPORTUNITY", "IMP_OUTREACH", "AGENCY_MARKUP", "NOISE_SPAM"];

export const PATHWAY_LABELS: Record<PathwayKey, string> = {
  GOOD_OPPORTUNITY: "Good Opportunity",
  IMP_OUTREACH: "IMP Outreach",
  AGENCY_MARKUP: "Agency Markup",
  NOISE_SPAM: "Noise / Spam",
};

// What flipping each pathway "live" actually does to a real inbound email --
// shown in the Command Center so this is never a mystery toggle.
export const PATHWAY_DESCRIPTIONS: Record<PathwayKey, string> = {
  GOOD_OPPORTUNITY: "Sends the creator's rate card as a real Gmail reply.",
  IMP_OUTREACH: "Sends the creator's rate card as a real Gmail reply.",
  AGENCY_MARKUP: "Sends the creator's rate card (+15% markup) as a real Gmail reply, after a spam gate check.",
  NOISE_SPAM: "Applies a Gmail label only -- nothing is sent, nothing is moved or deleted.",
};

// Maps a pipeline's finalCategory outcome to the pathway that governs
// whether a REAL action is allowed. Returns null for outcomes with no real
// action (skip -- internal/thread-reply, already handled).
export function mapFinalCategoryToPathway(finalCategory: string): PathwayKey | null {
  switch (finalCategory) {
    case "good_opportunity":
      return "GOOD_OPPORTUNITY";
    case "imp_outreach":
      return "IMP_OUTREACH";
    case "agency_markup":
      return "AGENCY_MARKUP";
    case "noise":
    case "spam":
    case "agency_spam_gated":
      return "NOISE_SPAM";
    default:
      return null;
  }
}

export async function getAllPathways() {
  const rows = await prisma.pathwayConfig.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r.live]));
  return PATHWAY_KEYS.map((key) => ({
    key,
    label: PATHWAY_LABELS[key],
    description: PATHWAY_DESCRIPTIONS[key],
    live: byKey.get(key) ?? false,
  }));
}

export async function isPathwayLive(key: PathwayKey): Promise<boolean> {
  const row = await prisma.pathwayConfig.findUnique({ where: { key } });
  return row?.live ?? false;
}

export async function setPathwayLive(key: PathwayKey, live: boolean): Promise<void> {
  await prisma.pathwayConfig.upsert({
    where: { key },
    update: { live },
    create: { key, live },
  });
}
