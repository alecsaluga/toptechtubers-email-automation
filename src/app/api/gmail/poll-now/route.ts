import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pollGmailOnce } from "@/lib/pipeline/pollGmail";

// Manual trigger for the Command Center's "Check for new emails now" button.
// Same underlying logic as the scheduled cron (see pollGmail.ts) -- this
// exists because Vercel Cron's minimum interval depends on the plan tier,
// and a manual button works regardless.
export async function POST() {
  const result = await pollGmailOnce(prisma);
  return NextResponse.json(result);
}
