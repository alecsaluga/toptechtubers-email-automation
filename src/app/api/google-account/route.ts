import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAuditEntry } from "@/lib/audit";

export async function GET() {
  const account = await prisma.googleAccount.findFirst({
    select: { email: true, connectedAt: true, lastPolledAt: true, scope: true },
  });
  return NextResponse.json({ account });
}

export async function DELETE() {
  const account = await prisma.googleAccount.findFirst();
  if (account) {
    await prisma.googleAccount.delete({ where: { id: account.id } });
    await writeAuditEntry("GoogleAccount", account.id, "delete", { email: account.email });
  }
  return NextResponse.json({ ok: true });
}
