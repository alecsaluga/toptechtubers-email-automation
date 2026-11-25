import { prisma } from "@/lib/db";
import { CreatorManager } from "@/components/CreatorManager";
import { toPlainRateCard } from "@/lib/serialize";

export default async function CreatorsPage() {
  const rows = await prisma.creator.findMany({
    include: { emails: true, rateCard: true },
    orderBy: { name: "asc" },
  });
  const creators = rows.map((c) => ({ ...c, rateCard: toPlainRateCard(c.rateCard) }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-neutral-900">Creators</h1>
        <p className="text-neutral-500 mt-1 max-w-2xl text-[15px]">
          Every creator&apos;s known inbound emails, channel info, assignee, and rate card. Rate card
          numbers came from the real roster spreadsheet where available; creators without a slug or rate
          data are flagged so they&apos;re easy to find and fill in.
        </p>
      </div>
      <CreatorManager initialCreators={creators} />
    </div>
  );
}
