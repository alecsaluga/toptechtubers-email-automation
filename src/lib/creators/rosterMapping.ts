import type { Assignee } from "@prisma/client";

const KNOWN_ASSIGNEES = new Set(["LAWRENCE", "LILY", "PATRICK", "NIKITA", "KATHY", "MIA", "VANESSA"]);

export function toAssignee(manager: string | null | undefined): Assignee {
  if (!manager) return "UNASSIGNED";
  const upper = manager.trim().toUpperCase();
  return (KNOWN_ASSIGNEES.has(upper) ? upper : "UNASSIGNED") as Assignee;
}

export function slugifyCreatorName(name: string): string | null {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || null;
}
