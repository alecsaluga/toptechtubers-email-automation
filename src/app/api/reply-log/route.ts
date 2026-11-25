import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAuditEntry } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status") || undefined;

  const entries = await prisma.replyLog.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ entries });
}

// Clears every entry -- used to reset test/demo runs before a real account
// goes live. Not scoped to a date range on purpose: the ask this exists for
// is "wipe everything from testing," not selective deletion.
export async function DELETE() {
  const { count } = await prisma.replyLog.deleteMany();
  await writeAuditEntry("ReplyLog", "all", "delete", { count });
  return NextResponse.json({ ok: true, deleted: count });
}
