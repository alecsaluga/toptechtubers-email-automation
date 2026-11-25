import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// A sender rule "wins" in the waterfall based on category priority order:
// GOOD_OPP > IMP > AGENCY > AUTOCLOSE (see src/lib/router/waterfall.ts).
const CATEGORY_PRIORITY = ["GOOD_OPP", "IMP", "AGENCY", "AUTOCLOSE"];

export async function GET() {
  const senders = await prisma.sender.findMany({
    orderBy: { value: "asc" },
  });

  const byValue = new Map<string, typeof senders>();
  for (const s of senders) {
    const list = byValue.get(s.value) ?? [];
    list.push(s);
    byValue.set(s.value, list);
  }

  const conflicts = [...byValue.entries()]
    .filter(([, rows]) => new Set(rows.map((r) => r.category)).size > 1)
    .map(([value, rows]) => {
      const categories = [...new Set(rows.map((r) => r.category))];
      const winner = categories.sort(
        (a, b) => CATEGORY_PRIORITY.indexOf(a) - CATEGORY_PRIORITY.indexOf(b)
      )[0];
      return {
        value,
        rows: rows.map((r) => ({ id: r.id, category: r.category, kind: r.kind })),
        winner,
      };
    });

  return NextResponse.json({ conflicts });
}
