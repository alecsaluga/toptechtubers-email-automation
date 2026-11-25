import {
  Workflow,
  Sparkles,
  Send,
  Sliders,
  History,
  ArrowRight,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";

const MECHANICS = [
  {
    n: 1,
    icon: Workflow,
    title: "Routing waterfall",
    body: "Every inbound email is checked against maintained sender lists (known agencies, known spam sources, etc.) in a fixed priority order. Known senders route instantly, with zero AI cost.",
  },
  {
    n: 2,
    icon: Sparkles,
    title: "AI fallback for unknowns",
    body: "Anything that doesn't match a known sender gets classified by an LLM into one of four buckets: Good Opportunity, IMP Outreach, Spam, or Noise.",
  },
  {
    n: 3,
    icon: Send,
    title: "Automated response",
    body: "Legitimate opportunities get the right creator's rate card auto-drafted (with markup rules for agency deals); spam and noise get auto-labeled and left alone.",
  },
  {
    n: 4,
    icon: Sliders,
    title: "Command Center",
    body: "A control panel where the account owner connects their real Gmail account and turns on exactly which outcome categories are allowed to take real action. Everything defaults off — you can turn on just \"label spam/noise\" today and leave higher-stakes pathways (auto-sending a rate card) off until you trust the system. Same infrastructure, staged trust.",
  },
  {
    n: 5,
    icon: History,
    title: "Full audit trail",
    body: "Every decision the system makes (and why) is logged and reviewable, plus a non-technical admin UI for maintaining routing rules and creator data without touching code.",
  },
];

export default function OverviewPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-neutral-900">Project Overview</h1>
        <p className="text-neutral-500 mt-1 max-w-2xl text-[15px]">
          A plain-language summary of what this system does and why it&apos;s built the way it is —
          useful context if you&apos;re sharing this project or referencing its approach elsewhere.
        </p>
      </div>

      <div className="card card-pad">
        <h2 className="font-medium mb-2 text-neutral-900">What it is</h2>
        <p className="text-sm text-neutral-600 leading-relaxed">
          An email-triage-and-response automation for a talent agency (TopTechTubers, ~50 creator
          clients). It replaces a fragile n8n workflow with a real web app that watches a shared
          sponsorship inbox and handles it automatically.
        </p>
      </div>

      <div>
        <h2 className="font-medium mb-3 text-neutral-900">Core mechanics</h2>
        <ol className="space-y-3">
          {MECHANICS.map((m) => (
            <li key={m.n} className="card card-pad flex gap-4">
              <div className="flex-none w-8 h-8 rounded-full bg-brand-600 text-white text-sm font-medium flex items-center justify-center">
                {m.n}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-neutral-900 flex items-center gap-2">
                  <m.icon size={15} className="text-brand-500" />
                  {m.title}
                </h3>
                <p className="text-sm text-neutral-600 mt-1 leading-relaxed">{m.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="card card-pad flex items-start gap-3 bg-brand-50/60">
        <div className="icon-tile bg-brand-100 text-brand-700">
          <Lightbulb size={16} />
        </div>
        <div>
          <h2 className="font-medium text-neutral-900 mb-1">Why it&apos;s relevant as a pattern</h2>
          <p className="text-sm text-neutral-700 leading-relaxed">
            It&apos;s a template for &ldquo;AI-assisted inbox triage with human-controlled rollout.&rdquo;
            The interesting part is the <strong>staged trust model</strong> — shadow mode → granular
            per-category live toggles → full automation — rather than an all-or-nothing &ldquo;turn on
            AI and hope.&rdquo; That structure generalizes to any business drowning in inbound email that
            needs to be sorted and partially auto-handled.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/how-it-works" className="text-sm text-brand-600 font-medium hover:underline inline-flex items-center gap-1">
          See the routing logic in detail <ArrowRight size={13} />
        </Link>
        <Link href="/command-center" className="text-sm text-brand-600 font-medium hover:underline inline-flex items-center gap-1">
          Open the Command Center <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
