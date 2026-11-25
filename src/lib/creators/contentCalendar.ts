import type { PrismaClient } from "@prisma/client";
import type { ContentCalendarRow } from "../integrations/sheets/contentCalendarSheet";

export const normalizeChannelName = (s: string) =>
  s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "");

const MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"];

// "11. November" / "November" / "Nov 2026" -> 0-based month index, or null.
export function parseMonthIndex(s: string | null | undefined): number | null {
  if (!s) return null;
  const lower = s.toLowerCase();
  const m = MONTHS.findIndex((name) => lower.includes(name) || lower.includes(name.slice(0, 3) + " ") || lower.endsWith(name.slice(0, 3)));
  if (m >= 0) return m;
  const num = lower.match(/^\s*(\d{1,2})\b/);
  if (num) {
    const n = Number(num[1]);
    if (n >= 1 && n <= 12) return n - 1;
  }
  return null;
}

export interface UpcomingVideo {
  videoTitle: string | null;
  launchMonth: string | null;
  launchTiming: string | null;
  niche: string | null;
}

export function isOpenUpcoming(
  e: { status: string | null; sponsorInfo: string | null; launchMonth: string | null },
  now = new Date(),
  monthsAhead = 2
): boolean {
  if (e.status && /sold/i.test(e.status)) return false;
  if (e.sponsorInfo && e.sponsorInfo.trim()) return false;
  const m = parseMonthIndex(e.launchMonth);
  if (m === null) return false;
  const diff = (m - now.getMonth() + 12) % 12;
  return diff <= monthsAhead;
}

export async function getUpcomingVideosForCreator(
  db: PrismaClient,
  creator: { id: string; name: string },
  limit = 3
): Promise<UpcomingVideo[]> {
  try {
    const entries = await db.contentCalendarEntry.findMany({
      where: { creatorId: creator.id },
      orderBy: { rowIndex: "asc" },
    });
    const now = new Date();
    return entries
      .filter((e) => isOpenUpcoming(e, now))
      .sort(
        (a, b) =>
          ((parseMonthIndex(a.launchMonth)! - now.getMonth() + 12) % 12) -
          ((parseMonthIndex(b.launchMonth)! - now.getMonth() + 12) % 12)
      )
      .slice(0, limit)
      .map((e) => ({ videoTitle: e.videoTitle, launchMonth: e.launchMonth, launchTiming: e.launchTiming, niche: e.niche }));
  } catch {
    // Never let the calendar lookup break a reply.
    return [];
  }
}

export interface CalendarSyncResult {
  rows: number;
  matchedRows: number;
  matchedCreators: number;
  unmatchedChannels: string[];
}

// Replace-all mirror of the sheet tab, in one transaction.
export async function syncContentCalendarRows(
  db: PrismaClient,
  rows: ContentCalendarRow[]
): Promise<CalendarSyncResult> {
  const creators = await db.creator.findMany({ select: { id: true, name: true } });
  const byNorm = new Map(creators.map((c) => [normalizeChannelName(c.name), c.id]));
  const unmatched = new Set<string>();
  const matchedCreators = new Set<string>();
  const data = rows.map((r) => {
    const creatorId = byNorm.get(normalizeChannelName(r.channelName)) ?? null;
    if (creatorId) matchedCreators.add(creatorId);
    else unmatched.add(r.channelName);
    return { ...r, creatorId };
  });
  await db.$transaction([
    db.contentCalendarEntry.deleteMany({}),
    db.contentCalendarEntry.createMany({ data }),
  ]);
  return {
    rows: data.length,
    matchedRows: data.filter((d) => d.creatorId).length,
    matchedCreators: matchedCreators.size,
    unmatchedChannels: [...unmatched].sort(),
  };
}
