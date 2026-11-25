import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const senderCounts = await prisma.sender.groupBy({
    by: ["category", "kind"],
    _count: true,
  });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const replyCounts = await prisma.replyLog.groupBy({
    by: ["finalCategory"],
    _count: true,
    where: { createdAt: { gte: startOfToday } },
  });

  const totalRepliesToday = await prisma.replyLog.count({ where: { createdAt: { gte: startOfToday } } });

  return NextResponse.json({
    senderCounts,
    replyCountsToday: replyCounts,
    totalRepliesToday,
  });
}
