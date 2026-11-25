import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runCalendarSync } from "@/lib/creators/runCalendarSync";

// Manual trigger for Command Center's "Sync calendar now" button. The cron
// (/api/cron/poll-gmail) also syncs automatically when the mirror is >1h old.
export async function POST() {
  try {
    const result = await runCalendarSync(prisma);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
