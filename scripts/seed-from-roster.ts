import ExcelJS from "exceljs";
import type { RosterRow } from "../src/lib/creators/rosterRow";

export type { RosterRow };

const ROSTER_TAB = "Live Rates V2";
const HEADER_ROW = 2; // row 1 is a merged banner; data starts row 3
const FIRST_DATA_ROW = 3;

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return isNaN(n) ? null : n;
}

// Cell values come back as plain strings, but ExcelJS returns richer shapes
// for hyperlinked or rich-text cells ({ text, hyperlink } or { richText }) --
// the roster's "Tech Creator" column is hyperlinked to each channel.
function str(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") {
    const obj = value as { text?: string; richText?: { text: string }[] };
    if (typeof obj.text === "string") return str(obj.text);
    if (Array.isArray(obj.richText)) return str(obj.richText.map((r) => r.text).join(""));
    return null;
  }
  const s = String(value).trim();
  return s === "" ? null : s;
}

function cellHyperlink(value: unknown): string | null {
  if (value && typeof value === "object" && "hyperlink" in value) {
    const hyperlink = (value as { hyperlink?: unknown }).hyperlink;
    return typeof hyperlink === "string" ? hyperlink : null;
  }
  return null;
}

// Parses the real roster spreadsheet directly rather than hand-transcribing
// 40+ creators' rate figures. Column positions are read by header name off
// row 2 the first time this runs, so a reordered column doesn't silently
// produce wrong data -- it throws instead.
export async function parseRosterXlsx(path: string): Promise<RosterRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path);
  const sheet = workbook.getWorksheet(ROSTER_TAB);
  if (!sheet) throw new Error(`Tab "${ROSTER_TAB}" not found in roster workbook`);

  // The sheet has two side-by-side tables sharing some header labels (e.g.
  // "Tech Creator" appears at both column 1 and column 8). Keep the FIRST
  // occurrence of each label so lookups resolve to the long-form table's
  // columns, matching where "Tech Creator" (with its channel hyperlink) and
  // "YouTube Subs" actually live.
  const headerRow = sheet.getRow(HEADER_ROW);
  const colIndex = new Map<string, number>();
  headerRow.eachCell((cell, colNumber) => {
    const label = str(cell.value);
    if (label && !colIndex.has(label)) colIndex.set(label, colNumber);
  });

  const need = (label: string): number => {
    const idx = colIndex.get(label);
    if (!idx) throw new Error(`Expected column "${label}" not found in roster header row ${HEADER_ROW}`);
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
  };

  const rows: RosterRow[] = [];
  for (let r = FIRST_DATA_ROW; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const nameCell = row.getCell(cols.name).value;
    const name = str(nameCell);
    if (!name) continue;

    rows.push({
      name,
      channelUrl: cellHyperlink(nameCell),
      slug: str(row.getCell(cols.slug).value),
      manager: str(row.getCell(cols.manager).value),
      ccNote: str(row.getCell(cols.ccNote).value),
      niche: str(row.getCell(cols.niche).value),
      country: str(row.getCell(cols.base).value),
      youtubeSubs: num(row.getCell(cols.youtubeSubs).value),
      dedicatedPrice: num(row.getCell(cols.dedicated).value),
      midRoll60Price: num(row.getCell(cols.midRoll60).value),
      midRoll120Price: num(row.getCell(cols.midRoll120).value),
      tiktokFollowers: num(row.getCell(cols.tiktok).value),
      instagramFollowers: num(row.getCell(cols.instagram).value),
      xFollowers: num(row.getCell(cols.x).value),
      threadsFollowers: num(row.getCell(cols.threads).value),
      facebookFollowers: num(row.getCell(cols.facebook).value),
      oneCrossPostPrice: num(row.getCell(cols.onePlatform).value),
      threePlatformPrice: num(row.getCell(cols.threePlatform).value),
      allPlatformPrice: num(row.getCell(cols.allPlatform).value),
    });
  }

  return rows;
}
