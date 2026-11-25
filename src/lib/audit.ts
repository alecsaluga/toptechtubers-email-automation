import { prisma } from "./db";

// changedBy is hardcoded to "system" for now -- there's no auth/session
// system yet. Swap the default once real users can sign in.
export async function writeAuditEntry(
  entityType: string,
  entityId: string,
  action: "create" | "update" | "delete",
  diff?: unknown,
  changedBy = "system"
) {
  await prisma.auditLog.create({
    data: {
      entityType,
      entityId,
      action,
      changedBy,
      diff: diff !== undefined ? JSON.stringify(diff) : null,
    },
  });
}
