"use client";

import { useMemo, useState } from "react";
import type { Sender } from "@prisma/client";
import { Plus, Pencil, Trash2, TriangleAlert, ListFilter } from "lucide-react";

const CATEGORIES = ["GOOD_OPP", "IMP", "AGENCY", "AUTOCLOSE"] as const;
const KINDS = ["EXACT", "DOMAIN"] as const;
const ASSIGNEES = ["UNASSIGNED", "LAWRENCE", "LILY", "PATRICK", "NIKITA", "KATHY", "MIA", "VANESSA"] as const;
const CATEGORY_PRIORITY = ["GOOD_OPP", "IMP", "AGENCY", "AUTOCLOSE"];

const CATEGORY_LABEL: Record<string, string> = {
  GOOD_OPP: "Good Opportunity",
  IMP: "IMP",
  AGENCY: "Agency",
  AUTOCLOSE: "Auto-close",
};

const CATEGORY_PILL: Record<string, string> = {
  GOOD_OPP: "bg-emerald-50 text-emerald-700",
  IMP: "bg-sky-50 text-sky-700",
  AGENCY: "bg-brand-50 text-brand-700",
  AUTOCLOSE: "bg-neutral-100 text-neutral-600",
};

interface Props {
  initialSenders: Sender[];
  conflictValues: string[];
}

export function SenderManager({ initialSenders, conflictValues }: Props) {
  const [senders, setSenders] = useState(initialSenders);
  const [conflicts] = useState(new Set(conflictValues));
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [showConflictsOnly, setShowConflictsOnly] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return senders.filter((s) => {
      if (categoryFilter && s.category !== categoryFilter) return false;
      if (showConflictsOnly && !conflicts.has(s.value)) return false;
      if (search && !s.value.includes(search.toLowerCase())) return false;
      return true;
    });
  }, [senders, categoryFilter, showConflictsOnly, search, conflicts]);

  async function refresh() {
    const res = await fetch("/api/senders");
    const data = await res.json();
    setSenders(data.senders);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this sender rule?")) return;
    await fetch(`/api/senders/${id}`, { method: "DELETE" });
    setSenders((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="space-y-4">
      {conflicts.size > 0 && (
        <div className="rounded-2xl bg-amber-50 px-5 py-4 flex items-start gap-3">
          <div className="icon-tile bg-amber-100 text-amber-700">
            <TriangleAlert size={16} />
          </div>
          <div className="text-sm text-amber-900 flex-1">
            <strong>{conflicts.size} conflict{conflicts.size === 1 ? "" : "s"} found</strong> — the same
            value appears in more than one category. The waterfall checks Good Opportunity → IMP → Agency
            → Auto-close in that order, so the earliest-listed category wins.
            <button
              className="ml-2 font-medium underline underline-offset-2"
              onClick={() => setShowConflictsOnly((v) => !v)}
            >
              {showConflictsOnly ? "Show all" : "Show conflicts only"}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input w-auto"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
        <input
          placeholder="Search value..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input flex-1 min-w-[10rem]"
        />
        <span className="text-sm text-neutral-400">{filtered.length} of {senders.length}</span>
        <button onClick={() => setShowAddForm((v) => !v)} className="btn-primary ml-auto inline-flex items-center gap-1.5">
          <Plus size={15} />
          Add sender
        </button>
      </div>

      {showAddForm && (
        <SenderForm
          onSaved={(sender) => {
            setSenders((prev) => [sender, ...prev]);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50/80 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Value</th>
              <th className="px-4 py-2.5 font-medium">Kind</th>
              <th className="px-4 py-2.5 font-medium">Category</th>
              <th className="px-4 py-2.5 font-medium">Assignee</th>
              <th className="px-4 py-2.5 font-medium">Source</th>
              <th className="px-4 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) =>
              editingId === s.id ? (
                <tr key={s.id}>
                  <td colSpan={6} className="p-2 bg-neutral-50">
                    <SenderForm
                      sender={s}
                      onSaved={(updated) => {
                        setSenders((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
                        setEditingId(null);
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={s.id} className="border-t border-neutral-100 hover:bg-neutral-50/60">
                  <td className="px-4 py-2.5 font-mono text-neutral-800">
                    {s.value}
                    {conflicts.has(s.value) && (
                      <span title={conflictNote(senders, s)} className="pill bg-amber-50 text-amber-700 ml-2">
                        conflict
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-500">{s.kind}</td>
                  <td className="px-4 py-2.5">
                    <span className={"pill " + CATEGORY_PILL[s.category]}>{CATEGORY_LABEL[s.category]}</span>
                  </td>
                  <td className="px-4 py-2.5 text-neutral-500">{s.assignee}</td>
                  <td className="px-4 py-2.5 text-neutral-400 text-xs">{s.source}</td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <button onClick={() => setEditingId(s.id)} className="text-neutral-400 hover:text-neutral-700 mr-3 align-middle">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="text-neutral-400 hover:text-red-600 align-middle">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              )
            )}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-neutral-500">
                  <div className="flex flex-col items-center gap-2">
                    <div className="icon-tile bg-neutral-100 text-neutral-400">
                      <ListFilter size={16} />
                    </div>
                    No sender rules match.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <button onClick={refresh} className="text-xs text-neutral-400 hover:text-neutral-600 hover:underline">
        Refresh from server
      </button>
    </div>
  );
}

function conflictNote(all: Sender[], current: Sender): string {
  const categoriesForValue = [...new Set(all.filter((s) => s.value === current.value).map((s) => s.category))];
  const sorted = [...categoriesForValue].sort(
    (a, b) => CATEGORY_PRIORITY.indexOf(a) - CATEGORY_PRIORITY.indexOf(b)
  );
  const winner = sorted[0];
  const others = categoriesForValue.filter((c) => c !== current.category).map((c) => CATEGORY_LABEL[c]);
  return current.category === winner
    ? `Also listed as ${others.join(", ")} -- this category (${CATEGORY_LABEL[current.category]}) wins because it's checked first.`
    : `Also listed as ${CATEGORY_LABEL[winner]} -- that category wins because it's checked before ${CATEGORY_LABEL[current.category]}.`;
}

function SenderForm({
  sender,
  onSaved,
  onCancel,
}: {
  sender?: Sender;
  onSaved: (s: Sender) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(sender?.value ?? "");
  const [kind, setKind] = useState<string>(sender?.kind ?? "DOMAIN");
  const [category, setCategory] = useState<string>(sender?.category ?? "GOOD_OPP");
  const [assignee, setAssignee] = useState<string>(sender?.assignee ?? "UNASSIGNED");
  const [notes, setNotes] = useState(sender?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const url = sender ? `/api/senders/${sender.id}` : "/api/senders";
    const method = sender ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value, kind, category, assignee, notes }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save");
      return;
    }
    const data = await res.json();
    onSaved(data.sender);
  }

  return (
    <form onSubmit={handleSubmit} className="card card-pad flex flex-wrap items-end gap-3">
      <Field label="Value (email or domain)">
        <input
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="example.com or someone@example.com"
          className="input w-56"
        />
      </Field>
      <Field label="Kind">
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="input w-auto">
          {KINDS.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </Field>
      <Field label="Category">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="input w-auto">
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
          ))}
        </select>
      </Field>
      <Field label="Assignee">
        <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="input w-auto">
          {ASSIGNEES.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </Field>
      <Field label="Notes">
        <input value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} className="input w-40" />
      </Field>
      <div className="flex gap-2">
        <button disabled={saving} type="submit" className="btn-primary">
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
      {error && <p className="text-sm text-red-600 w-full">{error}</p>}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-neutral-500">{label}</span>
      {children}
    </label>
  );
}
