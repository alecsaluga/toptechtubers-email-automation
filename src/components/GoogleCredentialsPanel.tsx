"use client";

import { useState } from "react";
import { KeyRound, ShieldCheck, Trash2 } from "lucide-react";

export function GoogleCredentialsPanel({
  initialClientId,
  initialClientSecretSet,
}: {
  initialClientId: string | null;
  initialClientSecretSet: boolean;
}) {
  const [clientId, setClientId] = useState(initialClientId ?? "");
  const [clientSecretSet, setClientSecretSet] = useState(initialClientSecretSet);
  const [clientSecretInput, setClientSecretInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/integration-secrets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        googleClientId: clientId,
        googleClientSecret: clientSecretInput || undefined,
      }),
    });
    setSaving(false);
    if (res.ok) {
      if (clientSecretInput) setClientSecretSet(true);
      setClientSecretInput("");
      setSaved(true);
    }
  }

  async function handleClearSecret() {
    if (!window.confirm("Clear the saved Client Secret? You'll need to re-enter it to connect Gmail.")) return;
    await fetch("/api/integration-secrets?key=GOOGLE_CLIENT_SECRET", { method: "DELETE" });
    setClientSecretSet(false);
  }

  return (
    <div className="card card-pad">
      <h2 className="font-medium mb-1 flex items-center gap-2 text-neutral-900">
        <KeyRound size={16} className="text-brand-500" />
        Google API Credentials
      </h2>
      <p className="text-sm text-neutral-500 mb-4">
        From the Google Cloud project's OAuth Client (APIs &amp; Services → Credentials). Stored encrypted
        (AES-256-GCM) in the database — the Client Secret is never shown again after saving, only whether
        it's set.
      </p>

      <form onSubmit={handleSave} className="space-y-3 max-w-md">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">Client ID</span>
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="xxxxxxxxxx-xxxxxxxxxxxxx.apps.googleusercontent.com"
            className="input font-mono text-xs"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500 flex items-center gap-1.5">
            Client Secret
            {clientSecretSet && (
              <span className="pill bg-emerald-50 text-emerald-700">
                <ShieldCheck size={11} /> set
              </span>
            )}
          </span>
          <div className="flex gap-2">
            <input
              type="password"
              autoComplete="new-password"
              value={clientSecretInput}
              onChange={(e) => setClientSecretInput(e.target.value)}
              placeholder={clientSecretSet ? "•••••••••••••••• (unchanged)" : "Paste the Client Secret"}
              className="input font-mono text-xs"
            />
            {clientSecretSet && (
              <button type="button" onClick={handleClearSecret} className="text-neutral-400 hover:text-red-600 flex-none">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </label>

        <div className="flex items-center gap-3">
          <button disabled={saving} type="submit" className="btn-primary">
            {saving ? "Saving…" : "Save credentials"}
          </button>
          {saved && <span className="text-sm text-emerald-700">Saved.</span>}
        </div>
      </form>
    </div>
  );
}
