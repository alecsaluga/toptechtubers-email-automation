import { prisma } from "@/lib/db";
import { SenderManager } from "@/components/SenderManager";

export default async function SendersPage() {
  const [senders, conflictRows] = await Promise.all([
    prisma.sender.findMany({ orderBy: [{ category: "asc" }, { value: "asc" }] }),
    prisma.sender.findMany(),
  ]);

  const byValue = new Map<string, typeof conflictRows>();
  for (const s of conflictRows) {
    const list = byValue.get(s.value) ?? [];
    list.push(s);
    byValue.set(s.value, list);
  }
  const conflictValues = new Set(
    [...byValue.entries()].filter(([, rows]) => new Set(rows.map((r) => r.category)).size > 1).map(([v]) => v)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-neutral-900">Sender List</h1>
        <p className="text-neutral-500 mt-1 max-w-2xl text-[15px]">
          The Good Opportunity / IMP / Agency / Auto-close lists the routing waterfall checks. A sender
          can appear in more than one category on purpose — the waterfall order decides the winner (see{" "}
          <a href="/how-it-works" className="text-brand-600 font-medium hover:underline">
            How It Works
          </a>
          ); those are flagged below as conflicts rather than silently resolved.
        </p>
      </div>
      <SenderManager initialSenders={senders} conflictValues={[...conflictValues]} />
    </div>
  );
}
