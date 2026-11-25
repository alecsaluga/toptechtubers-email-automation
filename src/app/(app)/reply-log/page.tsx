import { History } from "lucide-react";
import { prisma } from "@/lib/db";
import { ClearReplyLogButton } from "@/components/ClearReplyLogButton";

export default async function ReplyLogPage() {
  const entries = await prisma.replyLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-neutral-900">Reply Log</h1>
          <p className="text-neutral-500 mt-1 max-w-2xl text-[15px]">
            Every email the pipeline has processed from the connected Gmail inbox. This is the
            productized replacement for the original workflow&apos;s monitoring Google Sheet.
          </p>
        </div>
        <ClearReplyLogButton count={entries.length} />
      </div>

      {entries.length === 0 ? (
        <div className="card card-pad flex flex-col items-center text-center py-12">
          <div className="icon-tile bg-neutral-100 text-neutral-400 mb-3">
            <History size={18} />
          </div>
          <p className="text-sm text-neutral-500">
            Nothing logged yet. Connect Gmail and check for new email in{" "}
            <a href="/command-center" className="text-brand-600 font-medium hover:underline">
              Command Center
            </a>
            .
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-neutral-100 overflow-hidden">
          {entries.map((e) => (
            <details key={e.id} className="p-4 group">
              <summary className="cursor-pointer flex flex-wrap items-center gap-3 text-sm list-none">
                <span className="text-neutral-400 text-xs w-40 flex-none">
                  {e.createdAt.toISOString().slice(0, 19).replace("T", " ")}
                </span>
                <span className="font-mono flex-1 min-w-[10rem] text-neutral-800">{e.inboundFrom}</span>
                <span className="text-neutral-500">{e.route}</span>
                <span className="font-medium text-neutral-900">{e.finalCategory}</span>
                <span
                  className={
                    "pill " +
                    (e.status === "sent" || e.status === "labeled"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700")
                  }
                >
                  {e.status}
                </span>
                {e.creatorName && <span className="text-neutral-400 text-xs">→ {e.creatorName}</span>}
              </summary>
              <div className="mt-3 text-sm space-y-2">
                {e.subject && (
                  <p>
                    <span className="text-neutral-400">Subject:</span> {e.subject}
                  </p>
                )}
                {e.reason && (
                  <p>
                    <span className="text-neutral-400">Reason:</span> {e.reason}
                  </p>
                )}
                {e.renderedHtml && (
                  <div
                    className="border border-neutral-200 rounded-lg p-3 text-xs max-h-96 overflow-auto bg-neutral-50"
                    dangerouslySetInnerHTML={{ __html: e.renderedHtml }}
                  />
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
