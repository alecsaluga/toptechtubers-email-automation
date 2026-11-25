"use client";

import { useState } from "react";
import { Mail, RefreshCw, TriangleAlert, CircleCheck } from "lucide-react";

interface Account {
  email: string;
  connectedAt: string | Date;
  lastPolledAt: string | Date | null;
  scope: string;
}

interface Pathway {
  key: "GOOD_OPPORTUNITY" | "IMP_OUTREACH" | "AGENCY_MARKUP" | "NOISE_SPAM";
  label: string;
  description: string;
  live: boolean;
}

export function CommandCenterPanel({
  initialAccount,
  initialPathways,
  connectedFlash,
  errorMessage,
}: {
  initialAccount: Account | null;
  initialPathways: Pathway[];
  connectedFlash: boolean;
  errorMessage: string | null;
}) {
  const [account, setAccount] = useState(initialAccount);
  const [pathways, setPathways] = useState(initialPathways);
  const [disconnecting, setDisconnecting] = useState(false);
  const [polling, setPolling] = useState(false);
  const [pollResult, setPollResult] = useState<string | null>(null);

  async function handleDisconnect() {
    if (!window.confirm(`Disconnect ${account?.email}? Nothing will be polled or actioned until you reconnect.`)) return;
    setDisconnecting(true);
    await fetch("/api/google-account", { method: "DELETE" });
    setDisconnecting(false);
    setAccount(null);
  }

  async function handlePollNow() {
    setPolling(true);
    setPollResult(null);
    const res = await fetch("/api/gmail/poll-now", { method: "POST" });
    const data = await res.json();
    setPolling(false);
    if (data.skipped) {
      setPollResult(data.skipped);
    } else {
      setPollResult(`Checked ${data.fetched} message(s) — ${data.processed} new, ${data.alreadySeen} already seen.`);
    }
  }

  async function handleTogglePathway(key: Pathway["key"], nextLive: boolean) {
    if (nextLive) {
      const pathway = pathways.find((p) => p.key === key);
      const ok = window.confirm(
        `Turn ON ${pathway?.label}?\n\n${pathway?.description}\n\nThis takes effect on the next poll of the connected inbox.`
      );
      if (!ok) return;
    }
    setPathways((prev) => prev.map((p) => (p.key === key ? { ...p, live: nextLive } : p)));
    await fetch("/api/pathways", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, live: nextLive }),
    });
  }

  return (
    <div className="space-y-6">
      {connectedFlash && (
        <Banner tone="green" icon={<CircleCheck size={16} />}>
          Google account connected. Turn on a pathway below to let it act on real inbound email.
        </Banner>
      )}
      {errorMessage && (
        <Banner tone="red" icon={<TriangleAlert size={16} />}>
          {errorMessage}
        </Banner>
      )}

      <div className="card card-pad">
        <h2 className="font-medium mb-3 flex items-center gap-2 text-neutral-900">
          <Mail size={16} className="text-brand-500" />
          Gmail Connection
        </h2>
        {!account ? (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-neutral-500 max-w-md">
              No Google account connected. Nothing is ingested and no pathway can take real action until
              you connect the shared TTT inbox.
            </p>
            <a href="/api/auth/google/start" className="btn-primary whitespace-nowrap">
              Connect Google Account
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="font-medium text-neutral-900">{account.email}</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Connected {new Date(account.connectedAt).toLocaleString()}
                  {account.lastPolledAt
                    ? ` · Last checked ${new Date(account.lastPolledAt).toLocaleString()}`
                    : " · Not checked yet"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handlePollNow} disabled={polling} className="btn-secondary inline-flex items-center gap-1.5">
                  <RefreshCw size={14} className={polling ? "animate-spin" : ""} />
                  {polling ? "Checking…" : "Check for new emails now"}
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="text-sm text-red-600 hover:underline"
                >
                  {disconnecting ? "Disconnecting…" : "Disconnect"}
                </button>
              </div>
            </div>
            {pollResult && <p className="text-sm text-neutral-500 border-t border-neutral-100 pt-3">{pollResult}</p>}
            <p className="text-xs text-neutral-400 border-t border-neutral-100 pt-3">
              Also checked automatically on a schedule (Vercel Cron) — the button above is for an
              immediate on-demand check.
            </p>
          </div>
        )}
      </div>

      <div className="card card-pad">
        <h2 className="font-medium mb-1 text-neutral-900">Pathways</h2>
        <p className="text-sm text-neutral-500 mb-4">
          Each pathway defaults off. Turning one on lets it take a real action (send a reply, or apply a
          label) the next time the connected inbox is checked — everything else stays exactly as it is
          today, logged only.
        </p>
        <div className="space-y-2">
          {pathways.map((p) => (
            <div
              key={p.key}
              className={
                "flex items-center justify-between gap-4 rounded-xl px-4 py-3 border " +
                (p.live ? "bg-emerald-50 border-emerald-100" : "bg-neutral-50 border-neutral-100")
              }
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-neutral-900">{p.label}</span>
                  <span className={"pill " + (p.live ? "bg-emerald-100 text-emerald-800" : "bg-neutral-200 text-neutral-600")}>
                    {p.live ? "Live" : "Off"}
                  </span>
                </div>
                <p className="text-sm text-neutral-500 mt-0.5">{p.description}</p>
              </div>
              <Switch checked={p.live} onChange={(next) => handleTogglePathway(p.key, next)} disabled={!account} />
            </div>
          ))}
        </div>
        {!account && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-4">
            Connect a Google account above before turning on a pathway — there's nothing to act on yet.
          </p>
        )}
      </div>
    </div>
  );
}

function Switch({ checked, onChange, disabled }: { checked: boolean; onChange: (next: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={
        "relative inline-flex h-6 w-11 flex-none items-center rounded-full transition-colors disabled:opacity-40 " +
        (checked ? "bg-emerald-500" : "bg-neutral-300")
      }
    >
      <span
        className={
          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform " +
          (checked ? "translate-x-6" : "translate-x-1")
        }
      />
    </button>
  );
}

function Banner({ tone, icon, children }: { tone: "green" | "red"; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      className={
        "rounded-2xl px-4 py-3 text-sm flex items-center gap-2.5 " +
        (tone === "green" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800")
      }
    >
      {icon}
      {children}
    </div>
  );
}
