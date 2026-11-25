"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function ClearReplyLogButton({ count }: { count: number }) {
  const [clearing, setClearing] = useState(false);
  const router = useRouter();

  async function handleClear() {
    if (!window.confirm(`Delete all ${count} reply log entries? This can't be undone.`)) return;
    setClearing(true);
    await fetch("/api/reply-log", { method: "DELETE" });
    setClearing(false);
    router.refresh();
  }

  if (count === 0) return null;

  return (
    <button onClick={handleClear} disabled={clearing} className="btn-secondary inline-flex items-center gap-1.5 text-red-600">
      <Trash2 size={14} />
      {clearing ? "Clearing…" : "Clear log"}
    </button>
  );
}
