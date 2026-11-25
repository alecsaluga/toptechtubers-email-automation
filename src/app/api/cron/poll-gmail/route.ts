import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pollGmailOnce } from "@/lib/pipeline/pollGmail";
import { runCalendarSyncIfStale } from "@/lib/creators/runCalendarSync";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await pollGmailOnce(prisma);

  // Content calendar mirror refresh -- must never break Gmail polling.
  let calendarSync: unknown;
  try {
    calendarSync = await runCalendarSyncIfStale(prisma);
  } catch (err) {
    calendarSync = { error: err instanceof Error ? err.message : String(err) };
  }

  console.log("[calendarSync]", JSON.stringify(calendarSync).slice(0, 3000));
  return NextResponse.json({ ...result, calendarSync });
}
