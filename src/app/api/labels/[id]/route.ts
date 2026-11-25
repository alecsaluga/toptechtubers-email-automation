import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAuditEntry } from "@/lib/audit";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/labels/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json();

  const label = await prisma.label.update({
    where: { id },
    data: { name: body.name ?? null },
  });

  await writeAuditEntry("Label", id, "update", { name: body.name });

  return NextResponse.json({ label });
}
