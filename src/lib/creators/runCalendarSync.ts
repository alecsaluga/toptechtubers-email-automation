import type { PrismaClient } from "@prisma/client";
import { getValidAccessToken } from "../integrations/gmail/tokens";
import { fetchSheetValues } from "../integrations/sheets/client";
import { mapSheetValuesToCalendarRows } from "../integrations/sheets/contentCalendarSheet";
import { syncContentCalendarRows, type CalendarSyncResult } from "./contentCalendar";

// Fixed by the client: the calendar always lives in this sheet/tab.
export const CONTENT_CALENDAR_SPREADSHEET_ID = "1tpH5cFJ_KL3JKOGTzNMhSQHtq98IQiQqNo2hfFBLEMs";
export const CONTENT_CALENDAR_TAB = "DO NOT EDIT";
export const CALENDAR_SYNC_MAX_AGE_MS = 60 * 60 * 1000;

export async function getCalendarSyncStatus(db: PrismaClient) {
  const [agg, total, matched] = await Promise.all([
    db.contentCalendarEntry.aggregate({ _max: { syncedAt: true } }),
    db.contentCalendarEntry.count(),
    db.contentCalendarEntry.count({ where: { creatorId: { not: null } } }),
  ]);
  return { lastSyncedAt: agg._max.syncedAt, rows: total, matchedRows: matched };
}

export async function runCalendarSync(db: PrismaClient): Promise<CalendarSyncResult> {
  const token = await getValidAccessToken(db);
  if (!token) throw new Error("No Google account connected.");
  const values = await fetchSheetValues(
    token.accessToken,
    CONTENT_CALENDAR_SPREADSHEET_ID,
    `'${CONTENT_CALENDAR_TAB}'!A:AZ`
  );
  return syncContentCalendarRows(db, mapSheetValuesToCalendarRows(values));
}

// Called from the Gmail cron; syncs only when the mirror is empty or stale.
export async function runCalendarSyncIfStale(db: PrismaClient) {
  const { lastSyncedAt } = await getCalendarSyncStatus(db);
  if (lastSyncedAt && Date.now() - lastSyncedAt.getTime() < CALENDAR_SYNC_MAX_AGE_MS) {
    return { skipped: true as const, lastSyncedAt };
  }
  return { skipped: false as const, ...(await runCalendarSync(db)) };
}
