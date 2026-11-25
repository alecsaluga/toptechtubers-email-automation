"use client";

import { useState } from "react";
import { CalendarDays, RefreshCw } from "lucide-react";

export function ContentCalendarSyncPanel({
  lastSyncedAt,
  rows,
  matchedRows,
}: {
  lastSyncedAt: string | null;
  rows: number;
  matchedRows: number;
}) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSyncNow() {
    setSyncing(true);
    setResult(null);
    setError(null);
    const res = await fetch("/api/creators/sync-calendar", { method: "POST" });
    const data = await res.json();
    setSyncing(false);
    if (!res.ok) {
      setError(data.error ?? "Sync failed.");
      return;
    }
    const u: string[] = data.unmatchedChannels ?? [];
    setResult(
      `Synced ${data.rows} row(s); ${data.matchedRows} matched to ${data.matchedCreators} creator(s). Unmatched channels: ${u.length}${
        u.length ? " (" + u.slice(0, 10).join(", ") + (u.length > 10 ? ", …" : "") + ")" : ""
      }.`
    );
  }

  return (
    <div className="card card-pad">
      <h2 className="font-medium mb-1 flex items-center gap-2 text-neutral-900">
        <CalendarDays size={16} className="text-brand-500" />
        Content Calendar Sync
      </h2>
      <p className="text-sm text-neutral-500 mb-4">
        Mirrors the &quot;DO NOT EDIT&quot; tab of the [Master] TTT Roster Monthly Content Calendar sheet
        automatically (refreshed hourly by the inbox poller). Rate-card replies list up to 3 of the
        creator&apos;s open (unsold, unsponsored) videos launching this month or the next two.
      </p>
      <p className="text-xs text-neutral-500 mb-3">
        {lastSyncedAt
          ? `Last synced ${new Date(lastSyncedAt).toLocaleString()} — ${rows} row(s), ${matchedRows} matched to a creator.`
          : "Not synced yet — it will sync automatically within a few minutes."}
      </p>
      <button onClick={handleSyncNow} disabled={syncing} className="btn-primary inline-flex items-center gap-1.5">
        <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
        {syncing ? "Syncing…" : "Sync calendar now"}
      </button>
      {result && <p className="text-sm text-emerald-700 mt-3">{result}</p>}
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </div>
  );
}
