"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

export function ChangePasswordPanel() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await fetch("/api/auth/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to change password.");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setSaved(true);
  }

  return (
    <div className="card card-pad">
      <h2 className="font-medium mb-1 flex items-center gap-2 text-neutral-900">
        <Lock size={16} className="text-brand-500" />
        Dashboard Password
      </h2>
      <p className="text-sm text-neutral-500 mb-4">
        Changes the shared password required to sign in to this app (see the login page).
      </p>
      <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">Current password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">New password (min. 8 characters)</span>
          <input
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input"
          />
        </label>
        <div className="flex items-center gap-3">
          <button disabled={saving || !currentPassword || newPassword.length < 8} type="submit" className="btn-primary">
            {saving ? "Saving…" : "Change password"}
          </button>
          {saved && <span className="text-sm text-emerald-700">Changed.</span>}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}
