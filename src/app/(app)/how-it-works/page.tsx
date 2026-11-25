import Link from "next/link";
import { ArrowRight, CircleCheck, Sparkles, Sliders } from "lucide-react";
import { prisma } from "@/lib/db";
import { getAllPathways } from "@/lib/pathways";
import type { PathwayKey } from "@prisma/client";

interface Step {
  n: number;
  title: string;
  description: string;
  outcome: string;
  countKey?: "GOOD_OPP" | "IMP" | "AGENCY" | "AUTOCLOSE";
  listHref?: string;
  pathway?: PathwayKey;
  isTerminal: boolean;
}

const STEPS: Step[] = [
  {
    n: 1,
    title: "Thread reply, not IMP-tagged",
    description: "The message is a reply within an existing thread (messageId ≠ threadId) and doesn't carry the IMP Gmail label.",
    outcome: "skip — no action taken",
    isTerminal: true,
  },
  {
    n: 2,
    title: "Thread reply, IMP-tagged",
    description: "A reply within a thread that IS tagged with the IMP label (marks an active IMP-platform conversation).",
    outcome: "→ good_opportunity",
    pathway: "GOOD_OPPORTUNITY",
    isTerminal: true,
  },
  {
    n: 3,
    title: "Internal sender",
    description: "Sender's domain is toptechtubers.com — internal team mail, never routed externally.",
    outcome: "skip — no action taken",
    isTerminal: true,
  },
  {
    n: 4,
    title: "Good Opportunity list",
    description: "Sender's exact address or domain is on the Good Opportunity list — credible brand/PR outreach.",
    outcome: "→ good_opportunity (rate card sent)",
    countKey: "GOOD_OPP",
    listHref: "/lists/senders?category=GOOD_OPP",
    pathway: "GOOD_OPPORTUNITY",
    isTerminal: true,
  },
  {
    n: 5,
    title: "IMP platform list",
    description: "Sender matches a known Chinese influencer-marketing-platform address or domain.",
    outcome: "→ imp_outreach (rate card sent)",
    countKey: "IMP",
    listHref: "/lists/senders?category=IMP",
    pathway: "IMP_OUTREACH",
    isTerminal: true,
  },
  {
    n: 6,
    title: "Agency list",
    description: "Sender matches a known small-agency address or domain.",
    outcome: "→ agency_markup (rate card + 15% sent, after a spam gate check)",
    countKey: "AGENCY",
    listHref: "/lists/senders?category=AGENCY",
    pathway: "AGENCY_MARKUP",
    isTerminal: true,
  },
  {
    n: 7,
    title: "Auto-close list",
    description: "Sender matches a known low-value/spam address or domain.",
    outcome: "→ noise — label applied, no reply sent",
    countKey: "AUTOCLOSE",
    listHref: "/lists/senders?category=AUTOCLOSE",
    pathway: "NOISE_SPAM",
    isTerminal: true,
  },
  {
    n: 8,
    title: "Unknown sender → AI classifies",
    description: "No list matched. The email body is extracted and sent to the 4-way classifier (GOOD_OPPORTUNITY / IMP_OUTREACH / SPAM / NOISE). SPAM and NOISE outcomes share the same Noise/Spam pathway as step 7 -- just a label, never a reply.",
    outcome: "→ whichever category the classifier returns",
    isTerminal: false,
  },
];

const ROUTE_LABELS: Record<string, string> = {
  skip: "Skipped (steps 1 or 3)",
  noise: "Auto-closed (step 7)",
  good_opportunity: "Good Opportunity (step 4 or 2)",
  imp_outreach: "IMP Outreach (step 5)",
  agency_markup: "Agency Markup (step 6)",
  classify: "Sent to AI classifier (step 8)",
};

export default async function HowItWorksPage() {
  const [senderCounts, routeCountsToday, classifyBreakdownToday, pathways] = await Promise.all([
    prisma.sender.groupBy({ by: ["category"], _count: true }),
    prisma.replyLog.groupBy({
      by: ["route"],
      _count: true,
      where: { createdAt: { gte: startOfToday() } },
    }),
    prisma.replyLog.groupBy({
      by: ["finalCategory"],
      _count: true,
      where: { route: "classify", createdAt: { gte: startOfToday() } },
    }),
    getAllPathways(),
  ]);

  const countByCategory = new Map(senderCounts.map((c) => [c.category, c._count]));
  const routeCountMap = new Map(routeCountsToday.map((r) => [r.route, r._count]));
  const pathwayByKey = new Map(pathways.map((p) => [p.key, p]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-neutral-900">How It Works</h1>
        <p className="text-neutral-500 mt-1 max-w-2xl text-[15px]">
          Every inbound email is checked against these rules in order, top to bottom. The first rule
          that matches decides what happens &mdash; later rules never run for that email. This is a
          direct port of the original n8n workflow&apos;s routing logic.
        </p>
      </div>

      <div className="card card-pad">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-medium flex items-center gap-2 text-neutral-900">
            <Sliders size={16} className="text-brand-500" />
            Live pathway status
          </h2>
          <Link href="/command-center" className="text-sm text-brand-600 font-medium hover:underline">
            Open Command Center →
          </Link>
        </div>
        <p className="text-sm text-neutral-500 mb-3">
          This is what actually happens on the connected real inbox right now. Turn pathways on or off
          in the Command Center.
        </p>
        <div className="flex flex-wrap gap-2">
          {pathways.map((p) => (
            <span key={p.key} className={"pill " + (p.live ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500")}>
              <span className={"w-1.5 h-1.5 rounded-full " + (p.live ? "bg-emerald-500" : "bg-neutral-400")} />
              {p.label}: {p.live ? "Live" : "Off"}
            </span>
          ))}
        </div>
      </div>

      <div className="card card-pad">
        <h2 className="font-medium mb-4 flex items-center gap-2 text-neutral-900">
          <Sparkles size={16} className="text-brand-500" />
          Pipeline overview
        </h2>
        <PipelineDiagram />
      </div>

      <div>
        <h2 className="font-medium mb-3 text-neutral-900">The routing waterfall (checked in this order)</h2>
        <ol className="space-y-3">
          {STEPS.map((step) => {
            const configCount = step.countKey ? countByCategory.get(step.countKey) ?? 0 : null;
            return (
              <li key={step.n} className="card card-pad flex gap-4">
                <div className="flex-none w-8 h-8 rounded-full bg-brand-600 text-white text-sm font-medium flex items-center justify-center">
                  {step.n}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="font-medium text-neutral-900">{step.title}</h3>
                    <div className="flex items-center gap-2">
                      {step.pathway && (
                        <span
                          className={
                            "pill " +
                            (pathwayByKey.get(step.pathway)?.live
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-neutral-100 text-neutral-500")
                          }
                        >
                          {pathwayByKey.get(step.pathway)?.live ? "Live" : "Off"}
                        </span>
                      )}
                      {configCount !== null && (
                        <Link href={step.listHref!} className="pill bg-neutral-100 text-neutral-600 hover:bg-neutral-200">
                          {configCount} configured
                        </Link>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-neutral-500 mt-1">{step.description}</p>
                  <p className="text-sm font-medium mt-2 text-neutral-800 flex items-center gap-1.5">
                    {step.outcome}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="card card-pad">
        <h2 className="font-medium mb-3 text-neutral-900">Today&apos;s live counts</h2>
        {routeCountsToday.length === 0 ? (
          <div className="flex flex-col items-center text-center py-8">
            <div className="icon-tile bg-neutral-100 text-neutral-400 mb-3">
              <CircleCheck size={16} />
            </div>
            <p className="text-sm text-neutral-500">No emails processed today yet.</p>
          </div>
        ) : (
          <ul className="text-sm space-y-1">
            {Object.entries(ROUTE_LABELS).map(([route, label]) => (
              <li key={route} className="flex justify-between border-b border-neutral-100 py-2">
                <span className="text-neutral-500">{label}</span>
                <span className="font-medium text-neutral-900">{routeCountMap.get(route) ?? 0}</span>
              </li>
            ))}
          </ul>
        )}
        {classifyBreakdownToday.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2 text-neutral-900">Step 8 AI classifier breakdown (today)</h3>
            <ul className="text-sm space-y-1">
              {classifyBreakdownToday.map((c) => (
                <li key={c.finalCategory} className="flex justify-between border-b border-neutral-100 py-2">
                  <span className="text-neutral-500">{c.finalCategory}</span>
                  <span className="font-medium text-neutral-900">{c._count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function PipelineDiagram() {
  const nodes = [
    "Inbound email\n(Gmail)",
    "Normalize\n(extract sender / body)",
    "Routing waterfall\n(8 rules, in order)",
    "AI classifier\n(unknown senders only)",
    "Creator resolver\n(delivered-to → creator)",
    "Reply builder\n(rate card + markup)",
    "Reply Log +\nGmail label/send (if pathway live)",
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {nodes.map((n, i) => (
        <div key={n} className="flex items-center gap-2">
          <div className="rounded-xl border border-brand-100 bg-brand-50/60 text-brand-900 px-3 py-2.5 whitespace-pre-line text-center min-w-[9rem] font-medium">
            {n}
          </div>
          {i < nodes.length - 1 && <ArrowRight size={14} className="text-neutral-300 flex-none" />}
        </div>
      ))}
    </div>
  );
}
