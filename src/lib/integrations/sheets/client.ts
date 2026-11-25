const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

export class SheetsApiError extends Error {
  constructor(action: string, status: number, body: string) {
    super(`Google Sheets API error during ${action}: ${status} ${body}`);
    this.name = "SheetsApiError";
  }
}

// Reads a rectangular range of cell values from a spreadsheet the connected
// Google account can view. Requires the account's OAuth token to include
// the spreadsheets.readonly scope (see GOOGLE_SCOPES in
// src/lib/integrations/gmail/oauth.ts) -- not granted before that scope was
// added, so this throws a 403 SheetsApiError until whoever owns the
// connected account (currently Lawrence's) reconnects to pick it up.
// UNFORMATTED_VALUE avoids parsing comma-formatted numbers ("44,100") back
// out of display strings.
export async function fetchSheetValues(
  accessToken: string,
  spreadsheetId: string,
  range: string
): Promise<unknown[][]> {
  const url = `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(
    range
  )}?valueRenderOption=UNFORMATTED_VALUE`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new SheetsApiError(`values.get ${range}`, res.status, await res.text());
  const data = await res.json();
  return data.values ?? [];
}
