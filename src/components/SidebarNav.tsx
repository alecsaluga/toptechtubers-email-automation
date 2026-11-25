"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Workflow,
  ListFilter,
  Users,
  History,
  Sliders,
  Lightbulb,
  FlaskConical,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/overview", label: "Overview", icon: Lightbulb },
  { href: "/command-center", label: "Command Center", icon: Sliders },
  { href: "/how-it-works", label: "How It Works", icon: Workflow },
  { href: "/staging", label: "Staging Review", icon: FlaskConical },
  { href: "/lists/senders", label: "Sender List", icon: ListFilter },
  { href: "/lists/creators", label: "Creators", icon: Users },
  { href: "/reply-log", label: "Reply Log", icon: History },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 space-y-0.5 mt-2">
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              "group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors " +
              (active ? "bg-brand-50 text-brand-700" : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900")
            }
          >
            {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-brand-600" />}
            <item.icon size={17} className={active ? "text-brand-600" : "text-neutral-400 group-hover:text-neutral-600"} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
