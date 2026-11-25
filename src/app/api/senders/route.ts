import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAuditEntry } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category") || undefined;
  const q = searchParams.get("q") || undefined;

  const senders = await prisma.sender.findMany({
    where: {
      category: category as never,
      value: q ? { contains: q.toLowerCase() } : undefined,
    },
    orderBy: [{ category: "asc" }, { value: "asc" }],
  });

  return NextResponse.json({ senders });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { value, kind, category, assignee, notes } = body;

  if (!value || !kind || !category) {
    return NextResponse.json({ error: "value, kind, and category are required" }, { status: 400 });
  }

  const sender = await prisma.sender.create({
    data: {
      value: String(value).toLowerCase().trim(),
      kind,
      category,
      assignee: assignee || "UNASSIGNED",
      notes: notes || null,
      source: "manual",
    },
  });

  await writeAuditEntry("Sender", sender.id, "create", sender);

  return NextResponse.json({ sender }, { status: 201 });
}
