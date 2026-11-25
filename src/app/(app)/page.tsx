import Link from "next/link";
import {
  ArrowRight,
  ListFilter,
  Users,
  History,
  TriangleAlert,
  Workflow,
  Sliders,
  Mail,
  FlaskConical,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getAllPathways } from "@/lib/pathways";

export default async function DashboardPage() {
  const [senderCount, creatorCount, replyCount, stagedCount, account, pathways, allSendersForConflicts] =
    await Promise.all([
      prisma.sender.count(),
      prisma.creator.count(),
      prisma.replyLog.count(),
      prisma.replyLog.count({
        where: {
          status: "shadow",
          finalCategory: { in: ["good_opportunity", "imp_outreach", "agency_markup"] },
          renderedHtml: { not: null },
        },
      }),
      prisma.googleAccount.findFirst(),
      getAllPathways(),
      prisma.sender.findMany({ select: { value: true, category: true } }),
    ]);

  const liveCount = pathways.filter((p) => p.live).length;

  // A real conflict is the same value spanning more than one CATEGORY (e.g.
  // AGENCY vs AUTOCLOSE) -- not just more than one row. The same value can
  // legitimately appear as both EXACT and DOMAIN within the same category
  // (see "aurafit.ai" in GOOD_OPP) without being a routing conflict.
  const categoriesByValue = new Map<string, Set<string>>();
  for (const s of allSendersForConflicts) {
    const set = categoriesByValue.get(s.value) ?? new Set();
    set.add(s.category);
    categoriesByValue.set(s.value, set);
  }
  const conflictCount = [...categoriesByValue.values()].filter((set) => set.size > 1).length;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-neutral-900">Welcome back 👋</h1>
          <p className="text-neutral-500 mt-1 max-w-xl text-[15px]">
            TopTechTubers&apos; email routing, rebuilt as a proper app instead of an n8n graph.
          </p>
        </div>
        <span className={"pill " + (liveCount > 0 ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600")}>
          <span className={"w-1.5 h-1.5 rounded-full " + (liveCount > 0 ? "bg-emerald-500" : "bg-neutral-400")} />
          {!account ? "Not connected" : liveCount > 0 ? `${liveCount} pathway${liveCount === 1 ? "" : "s"} live` : "Connected · 0 live"}
        </span>
      </div>

      {conflictCount > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-100 px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="icon-tile bg-amber-100 text-amber-700">
              <TriangleAlert size={16} />
            </div>
            <p className="text-sm text-amber-900">
              <strong>{conflictCount}</strong> sender{conflictCount === 1 ? "" : "s"} listed in more than
              one category &mdash; the waterfall order decides the winner.
            </p>
          </div>
          <Link
            href="/lists/senders"
            className="text-sm font-medium text-amber-800 hover:underline whitespace-nowrap"
          >
            Review conflicts →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={ListFilter} label="Sender rules" value={senderCount} href="/lists/senders" tint="brand" />
        <StatCard icon={Users} label="Creators" value={creatorCount} href="/lists/creators" tint="green" />
        <StatCard icon={History} label="Reply log entries" value={replyCount} href="/reply-log" tint="blue" />
        <StatCard
          icon={TriangleAlert}
          label="Sender conflicts"
          value={conflictCount}
          href="/lists/senders"
          tint={conflictCount > 0 ? "amber" : "neutral"}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <QuickLinkCard
          icon={Workflow}
          title="How It Works"
          description="The routing waterfall, live counts, and each pathway's current status."
          href="/how-it-works"
        />
        <QuickLinkCard
          icon={ListFilter}
          title="Sender & Creator Lists"
          description="Add, edit, and remove rules. Conflicts are flagged, not silently resolved."
          href="/lists/senders"
        />
        <QuickLinkCard
          icon={Sliders}
          title="Command Center"
          description="Connect Gmail, manage API credentials, and turn pathways live."
          href="/command-center"
        />
        <QuickLinkCard
          icon={FlaskConical}
          title="Staging Review"
          description={`${stagedCount} ${stagedCount === 1 ? "reply" : "replies"} rendered and waiting for review before their pathway goes live.`}
          href="/staging"
        />
        <QuickLinkCard
          icon={History}
          title="Reply Log"
          description="Every email the pipeline has processed, logged or actioned."
          href="/reply-log"
        />
      </div>

      {!account && (
        <div className="card card-pad flex items-start gap-3">
          <div className="icon-tile bg-neutral-100 text-neutral-500">
            <Mail size={16} />
          </div>
          <p className="text-sm text-neutral-500">
            <strong className="text-neutral-700">Not connected yet:</strong> the real Gmail inbox isn&apos;t
            connected, so no pathway can take real action. Connect it in{" "}
            <Link href="/command-center" className="text-brand-600 font-medium hover:underline">
              Command Center
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}

const TINTS = {
  brand: "bg-brand-50 text-brand-600",
  green: "bg-emerald-50 text-emerald-600",
  blue: "bg-sky-50 text-sky-600",
  amber: "bg-amber-50 text-amber-600",
  neutral: "bg-neutral-100 text-neutral-500",
};

function StatCard({
  icon: Icon,
  label,
  value,
  href,
  tint,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: number;
  href: string;
  tint: keyof typeof TINTS;
}) {
  return (
    <Link href={href} className="card card-pad hover:shadow-md transition-shadow block">
      <div className={"icon-tile " + TINTS[tint]}>
        <Icon size={16} />
      </div>
      <div className="text-2xl font-semibold mt-3 text-neutral-900">{value}</div>
      <div className="text-sm text-neutral-500">{label}</div>
    </Link>
  );
}

function QuickLinkCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href} className="card card-pad hover:shadow-md transition-shadow flex items-start gap-4 group">
      <div className="icon-tile bg-brand-50 text-brand-600">
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="font-medium text-neutral-900">{title}</h2>
        <p className="text-sm text-neutral-500 mt-0.5">{description}</p>
      </div>
      <ArrowRight size={16} className="text-neutral-300 group-hover:text-brand-500 transition-colors mt-1 flex-none" />
    </Link>
  );
}
