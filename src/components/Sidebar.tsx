import { Mail } from "lucide-react";
import { prisma } from "@/lib/db";
import { getAllPathways } from "@/lib/pathways";
import { SidebarNav } from "./SidebarNav";
import { LogoutButton } from "./LogoutButton";

export async function Sidebar() {
  const [account, pathways] = await Promise.all([prisma.googleAccount.findFirst(), getAllPathways()]);
  const liveCount = pathways.filter((p) => p.live).length;

  let tone: "amber" | "green" | "neutral" = "neutral";
  let label: string;
  let detail: string;

  if (!account) {
    tone = "amber";
    label = "Gmail not connected";
    detail = "Connect an account in Command Center to go live.";
  } else if (liveCount === 0) {
    tone = "neutral";
    label = "Connected · 0 pathways live";
    detail = "Everything is logged only -- no real actions yet.";
  } else {
    tone = "green";
    label = `${liveCount} pathway${liveCount === 1 ? "" : "s"} live`;
    detail = "Taking real action on the connected inbox.";
  }

  const toneClasses = {
    amber: "bg-amber-50 text-amber-800",
    green: "bg-emerald-50 text-emerald-800",
    neutral: "bg-neutral-100 text-neutral-600",
  }[tone];
  const dotClasses = {
    amber: "bg-amber-500",
    green: "bg-emerald-500",
    neutral: "bg-neutral-400",
  }[tone];

  return (
    <aside className="w-60 flex-none border-r border-neutral-200/70 bg-white flex flex-col h-screen sticky top-0">
      <div className="flex items-center gap-2 px-5 pt-5 pb-4">
        <div className="icon-tile bg-brand-600 text-white">
          <Mail size={18} />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-neutral-900">TTT Automation</div>
          <div className="text-[11px] text-neutral-500">Email Routing</div>
        </div>
      </div>

      <SidebarNav />

      <div className="px-3 pb-3">
        <div className={"rounded-xl p-3 text-xs " + toneClasses}>
          <div className="flex items-center gap-1.5 font-medium">
            <span className={"w-1.5 h-1.5 rounded-full " + dotClasses} />
            {label}
          </div>
          <p className="mt-1 text-[11px] opacity-80">{detail}</p>
        </div>
      </div>
      <div className="px-3 pb-4 border-t border-neutral-100 pt-2">
        <LogoutButton />
      </div>
    </aside>
  );
}
