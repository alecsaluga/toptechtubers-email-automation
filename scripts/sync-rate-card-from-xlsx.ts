// One-off/manual runner: applies the same incremental, non-destructive
// sync used by /api/creators/sync-rates, but reads a local xlsx (the same
// "Live Rates V2" tab layout) instead of a live Google Sheets pull -- for
// use before the connected Google account has Sheets access.
//
// Usage: npx tsx scripts/sync-rate-card-from-xlsx.ts "/path/to/roster.xlsx"
import { PrismaClient } from "@prisma/client";
import { parseRosterXlsx } from "./seed-from-roster";
import { syncRateCardFromRosterRows } from "../src/lib/creators/syncRateCard";

const prisma = new PrismaClient();

async function main() {
  const xlsxPath = process.argv[2];
  if (!xlsxPath) {
    console.error("Usage: npx tsx scripts/sync-rate-card-from-xlsx.ts <path-to-xlsx>");
    process.exit(1);
  }

  console.log(`Parsing ${xlsxPath} ...`);
  const rows = await parseRosterXlsx(xlsxPath);
  console.log(`Found ${rows.length} creator rows. Syncing...`);

  const result = await syncRateCardFromRosterRows(prisma, rows);
  console.log(`Updated ${result.updated.length} existing creator(s).`);
  console.log(`Created ${result.created.length} new creator(s).`);
  if (result.created.length) console.log("  New:", result.created.join(", "));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
