"use client";

import { useMemo, useState } from "react";
import type { Creator, CreatorEmail } from "@prisma/client";
import type { PlainRateCard } from "@/lib/serialize";
import { ChevronDown, ChevronUp, Users } from "lucide-react";
import { buildRateCardHtml, TEMPLATE_VAR_KEYS } from "@/lib/reply-builder/rateCardTemplate";

type CreatorFull = Creator & { emails: CreatorEmail[]; rateCard: PlainRateCard | null };

const ASSIGNEES = ["UNASSIGNED", "LAWRENCE", "LILY", "PATRICK", "NIKITA", "KATHY", "MIA", "VANESSA"] as const;

const RATE_FIELDS: { key: keyof PlainRateCard; label: string }[] = [
  { key: "youtubeSubs", label: "YouTube Subs" },
  { key: "dedicatedPrice", label: "Dedicated ($)" },
  { key: "midRoll60Price", label: "60s Mid-Roll ($)" },
  { key: "midRoll120Price", label: "120s Mid-Roll ($)" },
  { key: "tiktokFollowers", label: "TikTok Followers" },
  { key: "instagramFollowers", label: "Instagram Followers" },
  { key: "xFollowers", label: "X Followers" },
  { key: "threadsFollowers", label: "Threads Followers" },
  { key: "facebookFollowers", label: "Facebook Followers" },
  { key: "oneCrossPostPrice", label: "1-Platform Short-Form ($)" },
  { key: "threePlatformPrice", label: "3-Platform Short-Form ($)" },
  { key: "allPlatformPrice", label: "All-Platform Short-Form ($)" },
];

export function CreatorManager({ initialCreators }: { initialCreators: CreatorFull[] }) {
  const [creators, setCreators] = useState(initialCreators);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [missingOnly, setMissingOnly] = useState(false);

  const filtered = useMemo(() => {
    return creators.filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (missingOnly && (c.slug || c.rateCard?.youtubeSubs)) return false;
      return true;
    });
  }, [creators, search, missingOnly]);

  function handleUpdated(updated: CreatorFull) {
    setCreators((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          placeholder="Search creators..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input flex-1 min-w-[10rem]"
        />
        <label className="flex items-center gap-1.5 text-sm text-neutral-500">
          <input type="checkbox" checked={missingOnly} onChange={(e) => setMissingOnly(e.target.checked)} />
          Missing slug or rate data only
        </label>
        <span className="text-sm text-neutral-400 ml-auto">{filtered.length} of {creators.length}</span>
      </div>

      <div className="card divide-y divide-neutral-100 overflow-hidden">
        {filtered.map((c) => (
          <CreatorRow
            key={c.id}
            creator={c}
            expanded={expandedId === c.id}
            onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
            onUpdated={handleUpdated}
          />
        ))}
        {filtered.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-neutral-500 flex flex-col items-center gap-2">
            <div className="icon-tile bg-neutral-100 text-neutral-400">
              <Users size={16} />
            </div>
            No creators match.
          </div>
        )}
      </div>
    </div>
  );
}

function CreatorRow({
  creator,
  expanded,
  onToggle,
  onUpdated,
}: {
  creator: CreatorFull;
  expanded: boolean;
  onToggle: () => void;
  onUpdated: (c: CreatorFull) => void;
}) {
  const hasRateData = !!creator.rateCard?.youtubeSubs;
  return (
    <div>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-neutral-50/60">
        <span className="font-medium flex-1 text-neutral-900">{creator.name}</span>
        {!creator.slug && <Badge>no slug</Badge>}
        {!hasRateData && <Badge>no rate data</Badge>}
        <span className="text-xs text-neutral-400">
          {creator.emails.length} email{creator.emails.length === 1 ? "" : "s"}
        </span>
        <span className="pill bg-neutral-100 text-neutral-500">{creator.assignee}</span>
        {expanded ? <ChevronUp size={16} className="text-neutral-400" /> : <ChevronDown size={16} className="text-neutral-400" />}
      </button>
      {expanded && <CreatorEditForm creator={creator} onUpdated={onUpdated} />}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="pill bg-amber-50 text-amber-700">{children}</span>;
}

function CreatorEditForm({ creator, onUpdated }: { creator: CreatorFull; onUpdated: (c: CreatorFull) => void }) {
  const [name, setName] = useState(creator.name);
  const [slug, setSlug] = useState(creator.slug ?? "");
  const [channelUrl, setChannelUrl] = useState(creator.channelUrl ?? "");
  const [niche, setNiche] = useState(creator.niche ?? "");
  const [assignee, setAssignee] = useState(creator.assignee);
  const [ccRules, setCcRules] = useState(creator.ccRules ?? "");
  const [emails, setEmails] = useState(creator.emails.map((e) => e.email).join(", "));
  const [rate, setRate] = useState<Record<string, string>>(
    Object.fromEntries(RATE_FIELDS.map((f) => [f.key, creator.rateCard?.[f.key] != null ? String(creator.rateCard[f.key]) : ""]))
  );
  const [customTemplate, setCustomTemplate] = useState(creator.rateCard?.customTemplate ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewHtml = useMemo(() => {
    const rateCardPreview = Object.fromEntries(
      RATE_FIELDS.map((f) => [f.key, rate[f.key] === "" ? null : Number(rate[f.key])])
    );
    return buildRateCardHtml(
      { name, channelUrl, niche, rateCard: { ...rateCardPreview, customTemplate: customTemplate || null } },
      { applyMarkup: false }
    );
  }, [name, channelUrl, niche, rate, customTemplate]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const rateCard = {
      ...Object.fromEntries(RATE_FIELDS.map((f) => [f.key, rate[f.key] === "" ? null : Number(rate[f.key])])),
      customTemplate: customTemplate.trim() || null,
    };
    const res = await fetch(`/api/creators/${creator.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug: slug || null,
        channelUrl: channelUrl || null,
        niche: niche || null,
        assignee,
        ccRules: ccRules || null,
        emails: emails.split(",").map((e) => e.trim()).filter(Boolean),
        rateCard,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save");
      return;
    }
    const data = await res.json();
    onUpdated(data.creator);
  }

  return (
    <div className="px-4 pb-5 space-y-5 bg-neutral-50/60 border-t border-neutral-100">
      <div className="grid sm:grid-cols-2 gap-3 pt-4">
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </Field>
        <Field label="Slug">
          <input value={slug} onChange={(e) => setSlug(e.target.value)} className="input" />
        </Field>
        <Field label="Channel URL">
          <input value={channelUrl} onChange={(e) => setChannelUrl(e.target.value)} className="input" />
        </Field>
        <Field label="Niche">
          <input value={niche} onChange={(e) => setNiche(e.target.value)} className="input" />
        </Field>
        <Field label="Assignee">
          <select value={assignee} onChange={(e) => setAssignee(e.target.value as typeof assignee)} className="input">
            {ASSIGNEES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </Field>
        <Field label="Emails (comma-separated)">
          <input value={emails} onChange={(e) => setEmails(e.target.value)} className="input" />
        </Field>
        <Field label="CC rules (not auto-executed yet)">
          <input value={ccRules} onChange={(e) => setCcRules(e.target.value)} className="input" />
        </Field>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2 text-neutral-900">Rate card</h4>
        <div className="grid sm:grid-cols-3 gap-3">
          {RATE_FIELDS.map((f) => (
            <Field key={f.key} label={f.label}>
              <input
                type="number"
                value={rate[f.key]}
                onChange={(e) => setRate((prev) => ({ ...prev, [f.key]: e.target.value }))}
                className="input"
              />
            </Field>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2 text-neutral-900">Reply template</h4>
        <p className="text-xs text-neutral-500 mb-2">
          Leave blank to use the default bullet-point template. For creators whose main channel isn&apos;t
          YouTube (blog, newsletter, etc.), write a custom body using {"{{"}variable{"}}"} placeholders:{" "}
          {TEMPLATE_VAR_KEYS.map((k) => `{{${k}}}`).join(", ")}.
        </p>
        <textarea
          value={customTemplate}
          onChange={(e) => setCustomTemplate(e.target.value)}
          rows={8}
          placeholder="Hi there,&#10;&#10;Thanks for your interest in {{creatorName}}..."
          className="input font-mono text-xs"
        />
        <div className="mt-3">
          <span className="text-xs text-neutral-500">Preview — would send this reply:</span>
          <div
            className="mt-1 border border-neutral-200 rounded-lg p-3 text-xs max-h-64 overflow-auto bg-neutral-50"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button disabled={saving} onClick={handleSave} className="btn-primary">
          {saving ? "Saving…" : "Save changes"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
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
