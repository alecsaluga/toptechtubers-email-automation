import type { PrismaClient } from "@prisma/client";
import { INTERNAL_DOMAIN } from "../config";
import type { SenderListSnapshot } from "./types";

const IMP_LABEL_PURPOSE = "imp-tag";

export async function loadSenderListSnapshot(
  db: PrismaClient
): Promise<SenderListSnapshot> {
  const senders = await db.sender.findMany();

  const snapshot: SenderListSnapshot = {
    goodOppExact: new Set(),
    goodOppDomains: new Set(),
    impExact: new Set(),
    impDomains: new Set(),
    agencyExact: new Set(),
    agencyDomains: new Set(),
    autocloseExact: new Set(),
    autocloseDomains: new Set(),
    impLabelId: null,
    internalDomain: INTERNAL_DOMAIN,
  };

  for (const s of senders) {
    const value = s.value.toLowerCase();
    const target = pickSet(snapshot, s.category, s.kind);
    target.add(value);
  }

  const impLabel = await db.label.findFirst({
    where: { name: IMP_LABEL_PURPOSE, isPlaceholder: false },
  });
  snapshot.impLabelId = impLabel?.gmailId ?? null;

  return snapshot;
}

function pickSet(
  snapshot: SenderListSnapshot,
  category: string,
  kind: string
): Set<string> {
  const isDomain = kind === "DOMAIN";
  switch (category) {
    case "GOOD_OPP":
      return isDomain ? snapshot.goodOppDomains : snapshot.goodOppExact;
    case "IMP":
      return isDomain ? snapshot.impDomains : snapshot.impExact;
    case "AGENCY":
      return isDomain ? snapshot.agencyDomains : snapshot.agencyExact;
    case "AUTOCLOSE":
      return isDomain ? snapshot.autocloseDomains : snapshot.autocloseExact;
    default:
      throw new Error(`Unknown sender category: ${category}`);
  }
}
