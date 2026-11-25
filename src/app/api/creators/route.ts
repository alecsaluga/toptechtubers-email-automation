import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAuditEntry } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || undefined;

  const creators = await prisma.creator.findMany({
    where: q ? { name: { contains: q } } : undefined,
    include: { emails: true, rateCard: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ creators });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const creator = await prisma.creator.create({
    data: {
      name: body.name,
      slug: body.slug || null,
      channelUrl: body.channelUrl || null,
      niche: body.niche || null,
      country: body.country || null,
      assignee: body.assignee || "UNASSIGNED",
      ccRules: body.ccRules || null,
    },
  });

  await writeAuditEntry("Creator", creator.id, "create", creator);

  return NextResponse.json({ creator }, { status: 201 });
}
