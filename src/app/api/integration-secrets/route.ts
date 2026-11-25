import { NextRequest, NextResponse } from "next/server";
import { getSecret, setSecret, deleteSecret, isSecretSet } from "@/lib/secrets";
import { writeAuditEntry } from "@/lib/audit";

// Only these keys can be read/written through this endpoint -- never a
// caller-supplied key, so this can't be turned into an arbitrary secret
// store or used to overwrite something like ENCRYPTION_KEY itself.
const MANAGED_KEYS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "OPENAI_API_KEY",
  "RATE_CARD_SPREADSHEET_ID",
] as const;
type ManagedKey = (typeof MANAGED_KEYS)[number];

export async function GET() {
  // GOOGLE_CLIENT_ID and RATE_CARD_SPREADSHEET_ID aren't sensitive (the
  // spreadsheet ID is just an identifier, not a credential) so they're safe
  // to echo back for the client to verify. Actual secrets NEVER come back
  // once saved -- only whether they're set.
  const [clientId, clientSecretSet, openaiApiKeySet, rateCardSpreadsheetId] = await Promise.all([
    getSecret("GOOGLE_CLIENT_ID"),
    isSecretSet("GOOGLE_CLIENT_SECRET"),
    isSecretSet("OPENAI_API_KEY"),
    getSecret("RATE_CARD_SPREADSHEET_ID"),
  ]);
  return NextResponse.json({
    googleClientId: clientId,
    googleClientSecretSet: clientSecretSet,
    openaiApiKeySet,
    rateCardSpreadsheetId,
  });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const updates: Partial<Record<ManagedKey, string>> = {
    GOOGLE_CLIENT_ID: typeof body.googleClientId === "string" ? body.googleClientId.trim() : undefined,
    GOOGLE_CLIENT_SECRET: typeof body.googleClientSecret === "string" ? body.googleClientSecret.trim() : undefined,
    OPENAI_API_KEY: typeof body.openaiApiKey === "string" ? body.openaiApiKey.trim() : undefined,
    RATE_CARD_SPREADSHEET_ID:
      typeof body.rateCardSpreadsheetId === "string" ? body.rateCardSpreadsheetId.trim() : undefined,
  };

  for (const key of MANAGED_KEYS) {
    const value = updates[key];
    if (!value) continue; // blank means "leave unchanged" -- use DELETE to clear
    await setSecret(key, value);
    await writeAuditEntry("Secret", key, "update", { note: "value not recorded" });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const key = searchParams.get("key");
  if (!MANAGED_KEYS.includes(key as ManagedKey)) {
    return NextResponse.json({ error: "unknown key" }, { status: 400 });
  }
  await deleteSecret(key as ManagedKey);
  await writeAuditEntry("Secret", key as ManagedKey, "delete");
  return NextResponse.json({ ok: true });
}
