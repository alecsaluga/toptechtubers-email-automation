import type { RosterRow } from "@/lib/creators/rosterRow";

// Row 1 of the "Live Rates V2" tab is a merged section banner; the real
// column headers are row 2, data starts row 3 -- see the equivalent xlsx
// parser (scripts/seed-from-roster.ts) for the same layout via ExcelJS.
const HEADER_ROW_INDEX = 1; // 0-based -> sheet row 2
const FIRST_DATA_ROW_INDEX = 2; // 0-based -> sheet row 3

function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return isNaN(n) ? null : n;
}

function strOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

// Maps the raw row-major `values` array from Sheets API `values.get` (see
// fetchSheetValues in ./client.ts) into the same RosterRow shape the xlsx
// import produces. Unlike ExcelJS, plain values carry no hyperlink
// metadata, so channelUrl comes from the sheet's explicit "YouTube URL"
// column instead of a link on the name cell.
export function mapSheetValuesToRosterRows(values: unknown[][]): RosterRow[] {
  const headerRow = values[HEADER_ROW_INDEX] ?? [];
  const colIndex = new Map<string, number>();
  headerRow.forEach((cell, i) => {
    const label = strOrNull(cell);
    if (label && !colIndex.has(label)) colIndex.set(label, i);
  });

  const need = (label: string): number => {
    const idx = colIndex.get(label);
    if (idx === undefined) throw new Error(`Expected column "${label}" not found in roster header row`);
    return idx;
  };

  const cols = {
    name: need("Tech Creator"),
    niche: need("Channel Niche"),
    youtubeSubs: need("YouTube Subs"),
    dedicated: need("YouTube Dedicated"),
    midRoll60: need("YouTube 60s Mid-Roll"),
    midRoll120: need("YouTube 120s Mid-Roll"),
    tiktok: need("TikTok"),
    instagram: need("Instagram"),
    x: need("X (Twitter)"),
    threads: need("Threads"),
    facebook: need("Facebook"),
    onePlatform: need("Short-Form - \n1 Platform"),
    threePlatform: need("Short-Form Cross Post - \n3 Platforms"),
    allPlatform: need("Short-Form Cross Post - \nAll Available Platforms"),
    base: need("Base"),
    manager: need("Manager"),
    ccNote: need("CC on emails?"),
    slug: need("Slug"),
    youtubeUrl: need("YouTube URL"),
  };

  const rows: RosterRow[] = [];
  for (let r = FIRST_DATA_ROW_INDEX; r < values.length; r++) {
    const row = values[r] ?? [];
    const name = strOrNull(row[cols.name]);
    if (!name) continue;

    rows.push({
      name,
      channelUrl: strOrNull(row[cols.youtubeUrl]),
      slug: strOrNull(row[cols.slug]),
      manager: strOrNull(row[cols.manager]),
      ccNote: strOrNull(row[cols.ccNote]),
      niche: strOrNull(row[cols.niche]),
      country: strOrNull(row[cols.base]),
      youtubeSubs: numOrNull(row[cols.youtubeSubs]),
      dedicatedPrice: numOrNull(row[cols.dedicated]),
      midRoll60Price: numOrNull(row[cols.midRoll60]),
      midRoll120Price: numOrNull(row[cols.midRoll120]),
      tiktokFollowers: numOrNull(row[cols.tiktok]),
      instagramFollowers: numOrNull(row[cols.instagram]),
      xFollowers: numOrNull(row[cols.x]),
      threadsFollowers: numOrNull(row[cols.threads]),
      facebookFollowers: numOrNull(row[cols.facebook]),
      oneCrossPostPrice: numOrNull(row[cols.onePlatform]),
      threePlatformPrice: numOrNull(row[cols.threePlatform]),
      allPlatformPrice: numOrNull(row[cols.allPlatform]),
    });
  }
  return rows;
}
