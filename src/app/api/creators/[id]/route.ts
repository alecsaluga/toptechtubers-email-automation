import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAuditEntry } from "@/lib/audit";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/creators/[id]">) {
  const { id } = await ctx.params;
  const creator = await prisma.creator.findUnique({ where: { id }, include: { emails: true, rateCard: true } });
  if (!creator) return NextResponse.json({ error: "not found" }, { status: 404 });

  const auditLog = await prisma.auditLog.findMany({
    where: { entityType: "Creator", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ creator, auditLog });
}

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/creators/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json();

  const before = await prisma.creator.findUnique({ where: { id }, include: { emails: true, rateCard: true } });
  if (!before) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.creator.update({
    where: { id },
    data: {
      name: body.name,
      slug: body.slug,
      channelUrl: body.channelUrl,
      niche: body.niche,
      country: body.country,
      assignee: body.assignee,
      ccRules: body.ccRules,
    },
  });

  if (Array.isArray(body.emails)) {
    await prisma.creatorEmail.deleteMany({ where: { creatorId: id } });
    const emails = body.emails.filter((e: unknown) => typeof e === "string" && e.trim());
    if (emails.length) {
      await prisma.creatorEmail.createMany({
        data: emails.map((email: string) => ({ email: email.toLowerCase().trim(), creatorId: id })),
      });
    }
  }

  if (body.rateCard) {
    await prisma.rateCard.upsert({
      where: { creatorId: id },
      update: body.rateCard,
      create: { creatorId: id, ...body.rateCard },
    });
  }

  const after = await prisma.creator.findUnique({ where: { id }, include: { emails: true, rateCard: true } });
  await writeAuditEntry("Creator", id, "update", { before, after });

  return NextResponse.json({ creator: after });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/creators/[id]">) {
  const { id } = await ctx.params;
  const before = await prisma.creator.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.creator.delete({ where: { id } });
  await writeAuditEntry("Creator", id, "delete", before);

  return NextResponse.json({ ok: true });
}
