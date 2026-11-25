import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const labels = await prisma.label.findMany({ orderBy: { gmailId: "asc" } });
  return NextResponse.json({ labels });
}
