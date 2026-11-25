import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAuditEntry } from "@/lib/audit";

const REVIEW_STATUSES = ["PENDING", "GOOD", "BAD"] as const;

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/reply-log/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json();

  const data: { reviewStatus?: (typeof REVIEW_STATUSES)[number]; reviewNotes?: string | null; reviewedAt?: Date } = {};

  if (body.reviewStatus !== undefined) {
    if (!REVIEW_STATUSES.includes(body.reviewStatus)) {
      return NextResponse.json({ error: "invalid reviewStatus" }, { status: 400 });
    }
    data.reviewStatus = body.reviewStatus;
    data.reviewedAt = new Date();
  }
  if (body.reviewNotes !== undefined) {
    data.reviewNotes = typeof body.reviewNotes === "string" ? body.reviewNotes : null;
  }

  const entry = await prisma.replyLog.update({ where: { id }, data });
  await writeAuditEntry("ReplyLog", id, "update", { reviewStatus: data.reviewStatus, notesChanged: body.reviewNotes !== undefined });

  return NextResponse.json({ entry });
}
