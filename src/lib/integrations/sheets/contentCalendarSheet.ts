export interface ContentCalendarRow {
  channelName: string;
  status: string | null;
  videoTitle: string | null;
  launchMonth: string | null;
  launchTiming: string | null;
  exactLaunchDate: string | null;
  niche: string | null;
  sponsorType: string | null;
  sponsorInfo: string | null;
  similarVideoLink: string | null;
  similarVideoViews: string | null;
  rowIndex: number;
}

const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Header row isn't guaranteed to be row 1, so find the first row (within
// the first 15) that has a "Channel Name" cell, then map columns by header text.
export function mapSheetValuesToCalendarRows(values: unknown[][]): ContentCalendarRow[] {
  const headerIdx = values.slice(0, 15).findIndex((r) => (r ?? []).some((c) => norm(c) === "channel name"));
  if (headerIdx < 0) throw new Error('Could not find a "Channel Name" header row in the calendar tab.');
  const headers = (values[headerIdx] ?? []).map(norm);
  const col = (...preds: ((h: string) => boolean)[]) => {
    for (const p of preds) {
      const i = headers.findIndex(p);
      if (i >= 0) return i;
    }
    return -1;
  };
  const idx = {
    channelName: col((h) => h === "channel name"),
    status: col((h) => h === "status", (h) => h.startsWith("status")),
    videoTitle: col((h) => h.includes("video title"), (h) => h === "title"),
    launchMonth: col((h) => h.includes("launch month")),
    launchTiming: col((h) => h.includes("when in that month"), (h) => h.includes("launching when")),
    exactLaunchDate: col((h) => h.includes("exact launch")),
    niche: col((h) => h.includes("niche")),
    sponsorType: col((h) => h.includes("sponsor type")),
    sponsorInfo: col((h) => h.includes("sponsor info")),
    similarVideoLink: col((h) => h.includes("similar video link")),
    similarVideoViews: col((h) => h.includes("similar video views")),
  };
  const get = (row: unknown[], i: number) => {
    if (i < 0) return null;
    const v = row[i];
    const s = v === null || v === undefined ? "" : String(v).trim();
    return s ? s : null;
  };
  const out: ContentCalendarRow[] = [];
  for (let r = headerIdx + 1; r < values.length; r++) {
    const row = values[r] ?? [];
    const channelName = get(row, idx.channelName);
    if (!channelName) continue;
    out.push({
      channelName,
      status: get(row, idx.status),
      videoTitle: get(row, idx.videoTitle),
      launchMonth: get(row, idx.launchMonth),
      launchTiming: get(row, idx.launchTiming),
      exactLaunchDate: get(row, idx.exactLaunchDate),
      niche: get(row, idx.niche),
      sponsorType: get(row, idx.sponsorType),
      sponsorInfo: get(row, idx.sponsorInfo),
      similarVideoLink: get(row, idx.similarVideoLink),
      similarVideoViews: get(row, idx.similarVideoViews),
      rowIndex: r + 1,
    });
  }
  return out;
}
