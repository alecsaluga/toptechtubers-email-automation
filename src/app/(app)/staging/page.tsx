import { prisma } from "@/lib/db";
import { getAllPathways } from "@/lib/pathways";
import { StagingReviewPanel } from "@/components/StagingReviewPanel";

const STAGED_CATEGORIES = ["good_opportunity", "imp_outreach", "agency_markup"] as const;

export default async function StagingPage() {
  const [entries, pathways] = await Promise.all([
    prisma.replyLog.findMany({
      where: {
        status: "shadow",
        finalCategory: { in: [...STAGED_CATEGORIES] },
        renderedHtml: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    getAllPathways(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-neutral-900">Staging Review</h1>
        <p className="text-neutral-500 mt-1 max-w-2xl text-[15px]">
          Every email that would have gotten a real rate-card reply from Good Opportunity, IMP Outreach,
          or Agency Markup &mdash; rendered exactly as it would send, but not actually sent since those
          pathways are still off. Mark each as good or bad as you review, then turn the pathway on in{" "}
          <a href="/command-center" className="text-brand-600 font-medium hover:underline">
            Command Center
          </a>{" "}
          once it looks right.
        </p>
      </div>

      <StagingReviewPanel initialEntries={entries} pathways={pathways} />
    </div>
  );
}
