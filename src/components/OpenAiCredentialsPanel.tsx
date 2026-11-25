"use client";

import { useState } from "react";
import { Sparkles, ShieldCheck, Trash2 } from "lucide-react";

export function OpenAiCredentialsPanel({ initialApiKeySet }: { initialApiKeySet: boolean }) {
  const [apiKeySet, setApiKeySet] = useState(initialApiKeySet);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKeyInput) return;
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/integration-secrets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openaiApiKey: apiKeyInput }),
    });
    setSaving(false);
    if (res.ok) {
      setApiKeySet(true);
      setApiKeyInput("");
      setSaved(true);
    }
  }

  async function handleClear() {
    if (!window.confirm("Clear the saved OpenAI API key? The classifier will fall back to the mock stub until a new key is set."))
      return;
    await fetch("/api/integration-secrets?key=OPENAI_API_KEY", { method: "DELETE" });
    setApiKeySet(false);
  }

  return (
    <div className="card card-pad">
      <h2 className="font-medium mb-1 flex items-center gap-2 text-neutral-900">
        <Sparkles size={16} className="text-brand-500" />
        OpenAI API Key
      </h2>
      <p className="text-sm text-neutral-500 mb-4">
        Powers real classification of unknown senders (step 8 in the routing waterfall). Without a key
        set, the pipeline uses a deterministic keyword-based mock so it still runs end to end. Stored
        encrypted (AES-256-GCM) in the database — never shown again after saving.
      </p>

      <form onSubmit={handleSave} className="space-y-3 max-w-md">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500 flex items-center gap-1.5">
            API Key
            {apiKeySet && (
              <span className="pill bg-emerald-50 text-emerald-700">
                <ShieldCheck size={11} /> set — real classifier active
              </span>
            )}
          </span>
          <div className="flex gap-2">
            <input
              type="password"
              autoComplete="new-password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={apiKeySet ? "•••••••••••••••• (unchanged)" : "sk-..."}
              className="input font-mono text-xs"
            />
            {apiKeySet && (
              <button type="button" onClick={handleClear} className="text-neutral-400 hover:text-red-600 flex-none">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </label>

        <div className="flex items-center gap-3">
          <button disabled={saving || !apiKeyInput} type="submit" className="btn-primary">
            {saving ? "Saving…" : "Save key"}
          </button>
          {saved && <span className="text-sm text-emerald-700">Saved.</span>}
        </div>
      </form>
    </div>
  );
}
