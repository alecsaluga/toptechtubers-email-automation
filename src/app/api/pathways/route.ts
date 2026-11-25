import { NextRequest, NextResponse } from "next/server";
import { getAllPathways, isPathwayLive, setPathwayLive, PATHWAY_KEYS } from "@/lib/pathways";
import { writeAuditEntry } from "@/lib/audit";
import type { PathwayKey } from "@prisma/client";

export async function GET() {
  const pathways = await getAllPathways();
  return NextResponse.json({ pathways });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const key = body.key as PathwayKey;
  const live = Boolean(body.live);

  if (!PATHWAY_KEYS.includes(key)) {
    return NextResponse.json({ error: "unknown pathway key" }, { status: 400 });
  }

  const before = await isPathwayLive(key);
  await setPathwayLive(key, live);
  await writeAuditEntry("PathwayConfig", key, "update", { before, after: live });

  return NextResponse.json({ key, live });
}
