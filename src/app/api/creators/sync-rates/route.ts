import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getValidAccessToken } from "@/lib/integrations/gmail/tokens";
import { fetchSheetValues } from "@/lib/integrations/sheets/client";
import { mapSheetValuesToRosterRows } from "@/lib/integrations/sheets/rosterSheet";
import { syncRateCardFromRosterRows } from "@/lib/creators/syncRateCard";
import { requireSecret } from "@/lib/secrets";

// Wide enough for the "Live Rates V2" tab's ~39 columns with headroom for
// the sheet growing a few more without this needing to change.
const SHEET_RANGE = "'Live Rates V2'!A:AZ";

// Manual trigger for the Command Center's "Sync rates now" button. Requires
// the connected Google account to have the spreadsheets.readonly scope
// (see GOOGLE_SCOPES in src/lib/integrations/gmail/oauth.ts) and a
// RATE_CARD_SPREADSHEET_ID configured -- until both are true this returns a
// clear 400/502 rather than a raw Google API error.
export async function POST() {
  const token = await getValidAccessToken(prisma);
  if (!token) {
    return NextResponse.json({ error: "No Google account connected." }, { status: 400 });
  }

  let spreadsheetId: string;
  try {
    spreadsheetId = await requireSecret("RATE_CARD_SPREADSHEET_ID");
  } catch {
    return NextResponse.json(
      { error: "Set a rate card spreadsheet ID in Command Center before syncing." },
      { status: 400 }
    );
  }

  let values: unknown[][];
  try {
    values = await fetchSheetValues(token.accessToken, spreadsheetId, SHEET_RANGE);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          (err instanceof Error ? err.message : "Failed to read the spreadsheet.") +
          " If this is a 403, the connected account needs to disconnect and reconnect to grant Sheets access.",
      },
      { status: 502 }
    );
  }

  const rows = mapSheetValuesToRosterRows(values);
  const result = await syncRateCardFromRosterRows(prisma, rows);
  return NextResponse.json({ ok: true, ...result });
}
