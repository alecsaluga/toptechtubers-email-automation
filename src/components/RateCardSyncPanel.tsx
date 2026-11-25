"use client";

import { useState } from "react";
import { Sheet, RefreshCw } from "lucide-react";

export function RateCardSyncPanel({ initialSpreadsheetId }: { initialSpreadsheetId: string | null }) {
  const [spreadsheetId, setSpreadsheetId] = useState(initialSpreadsheetId ?? "");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/integration-secrets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rateCardSpreadsheetId: spreadsheetId }),
    });
    setSaving(false);
  }

  async function handleSyncNow() {
    setSyncing(true);
    setResult(null);
    setError(null);
    const res = await fetch("/api/creators/sync-rates", { method: "POST" });
    const data = await res.json();
    setSyncing(false);
    if (!res.ok) {
      setError(data.error ?? "Sync failed.");
      return;
    }
    setResult(`Synced ${data.updated.length} existing creator(s), created ${data.created.length} new.`);
  }

  return (
    <div className="card card-pad">
      <h2 className="font-medium mb-1 flex items-center gap-2 text-neutral-900">
        <Sheet size={16} className="text-brand-500" />
        Rate Card Sync
      </h2>
      <p className="text-sm text-neutral-500 mb-4">
        Pulls live rates from the &quot;Live Rates V2&quot; tab of the roster Google Sheet into each
        creator&apos;s rate card. Only updates rates for creators that already exist (matched by name) and
        adds new ones the sheet has — it never removes a creator or touches anything else. Requires the
        connected Google account (Command Center above) to have Sheets access; if it was connected before
        that scope was added, disconnect and reconnect once to pick it up.
      </p>

      <form onSubmit={handleSave} className="flex flex-wrap items-end gap-2 mb-3 max-w-lg">
        <label className="flex flex-col gap-1 flex-1 min-w-[14rem]">
          <span className="text-xs text-neutral-500">Spreadsheet ID</span>
          <input
            value={spreadsheetId}
            onChange={(e) => setSpreadsheetId(e.target.value)}
            placeholder="The long ID from the sheet's URL between /d/ and /edit"
            className="input font-mono text-xs"
          />
        </label>
        <button disabled={saving} className="btn-secondary whitespace-nowrap">
          {saving ? "Saving…" : "Save ID"}
        </button>
      </form>

      <button onClick={handleSyncNow} disabled={syncing} className="btn-primary inline-flex items-center gap-1.5">
        <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
        {syncing ? "Syncing…" : "Sync rates now"}
      </button>

      {result && <p className="text-sm text-emerald-700 mt-3">{result}</p>}
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </div>
  );
}
