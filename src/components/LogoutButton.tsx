"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800 transition-colors"
    >
      <LogOut size={15} />
      Log out
    </button>
  );
}
