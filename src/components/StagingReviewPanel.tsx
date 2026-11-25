"use client";

import { useMemo, useState } from "react";
import type { ReplyLog } from "@prisma/client";
import { CircleCheck, CircleX, FlaskConical } from "lucide-react";

type Entry = ReplyLog;
type Filter = "ALL" | "PENDING" | "GOOD" | "BAD";

const CATEGORY_LABELS: Record<string, string> = {
  good_opportunity: "Good Opportunity",
  imp_outreach: "IMP Outreach",
  agency_markup: "Agency Markup",
};

const FILTERS: { key: Filter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "GOOD", label: "Looks good" },
  { key: "BAD", label: "Looks bad" },
];

interface Pathway {
  key: "GOOD_OPPORTUNITY" | "IMP_OUTREACH" | "AGENCY_MARKUP" | "NOISE_SPAM";
  label: string;
  live: boolean;
}

export function StagingReviewPanel({ initialEntries, pathways }: { initialEntries: Entry[]; pathways: Pathway[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [filter, setFilter] = useState<Filter>("ALL");

  const countByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) map.set(e.finalCategory, (map.get(e.finalCategory) ?? 0) + 1);
    return map;
  }, [entries]);

  const countByStatus = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) map.set(e.reviewStatus, (map.get(e.reviewStatus) ?? 0) + 1);
    return map;
  }, [entries]);

  const filtered = useMemo(
    () => (filter === "ALL" ? entries : entries.filter((e) => e.reviewStatus === filter)),
    [entries, filter]
  );

  function handleUpdated(updated: Entry) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  const pathwayByKey = new Map(pathways.map((p) => [p.key, p]));
  const CATEGORY_TO_PATHWAY_KEY: Record<string, Pathway["key"]> = {
    good_opportunity: "GOOD_OPPORTUNITY",
    imp_outreach: "IMP_OUTREACH",
    agency_markup: "AGENCY_MARKUP",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["good_opportunity", "imp_outreach", "agency_markup"] as const).map((cat) => {
          const live = pathwayByKey.get(CATEGORY_TO_PATHWAY_KEY[cat])?.live;
          return (
            <span key={cat} className={"pill " + (live ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600")}>
              {CATEGORY_LABELS[cat]}: {countByCategory.get(cat) ?? 0} staged
              {live && " · already live"}
            </span>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={
              "text-sm px-3 py-1.5 rounded-full border transition-colors " +
              (filter === f.key
                ? "bg-neutral-900 text-white border-neutral-900"
                : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50")
            }
          >
            {f.label}
            {f.key !== "ALL" && <span className="ml-1.5 opacity-70">{countByStatus.get(f.key) ?? 0}</span>}
          </button>
        ))}
        <span className="text-sm text-neutral-400 ml-auto">{filtered.length} shown</span>
      </div>

      {filtered.length === 0 ? (
        <div className="card card-pad flex flex-col items-center text-center py-12">
          <div className="icon-tile bg-neutral-100 text-neutral-400 mb-3">
            <FlaskConical size={18} />
          </div>
          <p className="text-sm text-neutral-500">Nothing matches this filter.</p>
        </div>
      ) : (
        <div className="card divide-y divide-neutral-100 overflow-hidden">
          {filtered.map((e) => (
            <StagingEntryRow key={e.id} entry={e} onUpdated={handleUpdated} />
          ))}
        </div>
      )}
    </div>
  );
}

function StagingEntryRow({ entry, onUpdated }: { entry: Entry; onUpdated: (e: Entry) => void }) {
  const [notes, setNotes] = useState(entry.reviewNotes ?? "");
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  async function setReviewStatus(status: "PENDING" | "GOOD" | "BAD") {
    const next = entry.reviewStatus === status ? "PENDING" : status; // click again to un-set
    setSavingStatus(true);
    const res = await fetch(`/api/reply-log/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewStatus: next }),
    });
    setSavingStatus(false);
    if (res.ok) {
      const data = await res.json();
      onUpdated(data.entry);
    }
  }

  async function saveNotes() {
    if (notes === (entry.reviewNotes ?? "")) return;
    setSavingNotes(true);
    const res = await fetch(`/api/reply-log/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewNotes: notes }),
    });
    setSavingNotes(false);
    if (res.ok) {
      const data = await res.json();
      onUpdated(data.entry);
    }
  }

  return (
    <details className="p-4 group">
      <summary className="cursor-pointer flex flex-wrap items-center gap-3 text-sm list-none">
        <span className="text-neutral-400 text-xs w-40 flex-none">
          {entry.createdAt.toISOString().slice(0, 19).replace("T", " ")}
        </span>
        <span className="font-mono flex-1 min-w-[10rem] text-neutral-800">{entry.inboundFrom}</span>
        <span className="pill bg-neutral-100 text-neutral-600">{CATEGORY_LABELS[entry.finalCategory]}</span>
        {entry.creatorName && <span className="text-neutral-500 text-xs">→ {entry.creatorName}</span>}
        <span
          className={
            "pill " +
            (entry.reviewStatus === "GOOD"
              ? "bg-emerald-50 text-emerald-700"
              : entry.reviewStatus === "BAD"
                ? "bg-red-50 text-red-700"
                : "bg-neutral-100 text-neutral-500")
          }
        >
          {entry.reviewStatus === "GOOD" ? "Looks good" : entry.reviewStatus === "BAD" ? "Looks bad" : "Pending"}
        </span>
      </summary>

      <div className="mt-3 text-sm space-y-3">
        {entry.subject && (
          <p>
            <span className="text-neutral-400">Subject:</span> {entry.subject}
          </p>
        )}
        {entry.reason && (
          <p>
            <span className="text-neutral-400">Reason:</span> {entry.reason}
          </p>
        )}
        {entry.ccPreview && (
          <p>
            <span className="text-neutral-400">Would CC (not executed):</span> {entry.ccPreview}
          </p>
        )}

        <div>
          <span className="text-neutral-400 text-xs">Would send this reply:</span>
          <div
            className="mt-1 border border-neutral-200 rounded-lg p-3 text-xs max-h-96 overflow-auto bg-neutral-50"
            dangerouslySetInnerHTML={{ __html: entry.renderedHtml! }}
          />
        </div>

        <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            disabled={savingStatus}
            onClick={() => setReviewStatus("GOOD")}
            className={
              "inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 " +
              (entry.reviewStatus === "GOOD"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-neutral-600 border-neutral-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700")
            }
          >
            <CircleCheck size={14} />
            Looks good
          </button>
          <button
            type="button"
            disabled={savingStatus}
            onClick={() => setReviewStatus("BAD")}
            className={
              "inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 " +
              (entry.reviewStatus === "BAD"
                ? "bg-red-600 text-white border-red-600"
                : "bg-white text-neutral-600 border-neutral-200 hover:bg-red-50 hover:border-red-200 hover:text-red-700")
            }
          >
            <CircleX size={14} />
            Looks bad
          </button>
        </div>

        <label className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
          <span className="text-xs text-neutral-400">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            placeholder="Anything worth flagging about this one..."
            rows={2}
            className="input text-sm"
          />
          {savingNotes && <span className="text-xs text-neutral-400">Saving…</span>}
        </label>
      </div>
    </details>
  );
}
