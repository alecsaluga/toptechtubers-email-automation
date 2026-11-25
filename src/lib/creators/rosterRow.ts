// Shared shape for one roster/rate-card row, regardless of source: a local
// xlsx (scripts/seed-from-roster.ts, used for the initial DB seed) or a live
// Google Sheets pull (src/lib/integrations/sheets/rosterSheet.ts).
export interface RosterRow {
  name: string;
  channelUrl: string | null;
  slug: string | null;
  manager: string | null;
  ccNote: string | null;
  niche: string | null;
  country: string | null;
  youtubeSubs: number | null;
  dedicatedPrice: number | null;
  midRoll60Price: number | null;
  midRoll120Price: number | null;
  tiktokFollowers: number | null;
  instagramFollowers: number | null;
  xFollowers: number | null;
  threadsFollowers: number | null;
  facebookFollowers: number | null;
  oneCrossPostPrice: number | null;
  threePlatformPrice: number | null;
  allPlatformPrice: number | null;
}
