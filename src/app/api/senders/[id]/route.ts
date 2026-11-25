import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAuditEntry } from "@/lib/audit";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/senders/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json();
  const before = await prisma.sender.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "not found" }, { status: 404 });

  const sender = await prisma.sender.update({
    where: { id },
    data: {
      value: body.value !== undefined ? String(body.value).toLowerCase().trim() : undefined,
      kind: body.kind,
      category: body.category,
      assignee: body.assignee,
      notes: body.notes,
    },
  });

  await writeAuditEntry("Sender", id, "update", { before, after: sender });

  return NextResponse.json({ sender });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/senders/[id]">) {
  const { id } = await ctx.params;
  const before = await prisma.sender.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.sender.delete({ where: { id } });
  await writeAuditEntry("Sender", id, "delete", before);

  return NextResponse.json({ ok: true });
}
