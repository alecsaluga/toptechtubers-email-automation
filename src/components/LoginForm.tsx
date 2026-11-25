"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to log in.");
      return;
    }
    router.push(nextPath);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card card-pad space-y-4">
      <div>
        <h1 className="font-medium text-neutral-900 flex items-center gap-2">
          <Lock size={16} className="text-brand-500" />
          Sign in
        </h1>
        <p className="text-sm text-neutral-500 mt-1">This dashboard is private to the TTT team.</p>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-500">Password</span>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={loading || !password} type="submit" className="btn-primary w-full">
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
