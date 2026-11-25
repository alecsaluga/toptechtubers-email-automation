import path from "node:path";
import { PrismaClient, type SenderCategory, type SenderKind } from "@prisma/client";
import { parseN8nExport, type SenderListsRaw } from "../scripts/seed-from-n8n";
import { parseRosterXlsx } from "../scripts/seed-from-roster";
import { toAssignee, slugifyCreatorName as slugify } from "../src/lib/creators/rosterMapping";

const prisma = new PrismaClient();

const N8N_JSON_PATH = path.resolve(
  __dirname,
  "../source-materials/Email_Classification_Phase_3_Push_to_Prod.json"
);
const ROSTER_XLSX_PATH = path.resolve(
  __dirname,
  "../source-materials/TopTechTubers-Live-Roster-Rate-Card.xlsx"
);

async function seedSenders(lists: SenderListsRaw) {
  type SenderSeed = { value: string; kind: SenderKind; category: SenderCategory };
  const rows: SenderSeed[] = [
    ...lists.goodOppExact.map((value) => ({ value, kind: "EXACT" as SenderKind, category: "GOOD_OPP" as SenderCategory })),
    ...lists.goodOppDomains.map((value) => ({ value, kind: "DOMAIN" as SenderKind, category: "GOOD_OPP" as SenderCategory })),
    ...lists.impExact.map((value) => ({ value, kind: "EXACT" as SenderKind, category: "IMP" as SenderCategory })),
    ...lists.impDomains.map((value) => ({ value, kind: "DOMAIN" as SenderKind, category: "IMP" as SenderCategory })),
    ...lists.agencyExact.map((value) => ({ value, kind: "EXACT" as SenderKind, category: "AGENCY" as SenderCategory })),
    ...lists.agencyDomains.map((value) => ({ value, kind: "DOMAIN" as SenderKind, category: "AGENCY" as SenderCategory })),
    ...lists.autocloseExact.map((value) => ({ value, kind: "EXACT" as SenderKind, category: "AUTOCLOSE" as SenderCategory })),
    ...lists.autocloseDomains.map((value) => ({ value, kind: "DOMAIN" as SenderKind, category: "AUTOCLOSE" as SenderCategory })),
  ];

  // SQLite doesn't support Prisma's skipDuplicates option, so dedupe by the
  // same key as the @@unique constraint (value, kind, category) in JS first.
  const seen = new Map<string, SenderSeed>();
  for (const r of rows) {
    const value = r.value.toLowerCase();
    seen.set(`${value}|${r.kind}|${r.category}`, { ...r, value });
  }

  const result = await prisma.sender.createMany({
    data: [...seen.values()].map((r) => ({ ...r, source: "n8n-import" })),
  });
  console.log(`  seeded ${result.count} sender rules (${rows.length} parsed, ${rows.length - seen.size} exact dupes collapsed)`);
}

async function seedLabels(labelIds: string[], impLabelPlaceholder: string | null) {
  const unique = [...new Set(labelIds)];
  const result = await prisma.label.createMany({
    data: unique.map((gmailId) => ({
      gmailId,
      isPlaceholder: gmailId === impLabelPlaceholder,
    })),
  });
  console.log(`  seeded ${result.count} label rows`);
}

async function seedCreators(
  creatorUrls: Record<string, string>,
  creatorEmailMap: Record<string, string>,
  rosterRows: Awaited<ReturnType<typeof parseRosterXlsx>>
) {
  const rosterByName = new Map(rosterRows.map((r) => [r.name, r]));
  const emailsByName = new Map<string, string[]>();
  for (const [email, name] of Object.entries(creatorEmailMap)) {
    const list = emailsByName.get(name) ?? [];
    list.push(email);
    emailsByName.set(name, list);
  }

  // The n8n export and the roster spreadsheet don't always agree on
  // capitalization for the same creator (e.g. "MrHtech" vs "MrHTech") --
  // merge case-insensitively so we don't create two rows for one person.
  // The roster is the more current source, so its casing wins when both
  // exist.
  const canonicalByLower = new Map<string, string>();
  for (const name of [...Object.keys(creatorUrls), ...Object.values(creatorEmailMap)]) {
    canonicalByLower.set(name.toLowerCase(), name);
  }
  for (const r of rosterRows) {
    canonicalByLower.set(r.name.toLowerCase(), r.name); // roster wins on casing
  }
  const allNames = new Set(canonicalByLower.values());

  let created = 0;
  for (const name of allNames) {
    const roster = rosterByName.get(name);
    const emails = [
      ...(emailsByName.get(name) ?? []),
      ...[...emailsByName.entries()]
        .filter(([n]) => n !== name && n.toLowerCase() === name.toLowerCase())
        .flatMap(([, e]) => e),
    ];

    const creator = await prisma.creator.create({
      data: {
        name,
        slug: roster?.slug ?? slugify(name),
        channelUrl: roster?.channelUrl ?? creatorUrls[name] ?? null,
        niche: roster?.niche ?? null,
        country: roster?.country ?? null,
        assignee: toAssignee(roster?.manager ?? null),
        ccRules: roster?.ccNote ?? null,
        emails: emails.length ? { create: emails.map((email) => ({ email })) } : undefined,
        rateCard: roster
          ? {
              create: {
                youtubeSubs: roster.youtubeSubs,
                dedicatedPrice: roster.dedicatedPrice,
                midRoll60Price: roster.midRoll60Price,
                midRoll120Price: roster.midRoll120Price,
                tiktokFollowers: roster.tiktokFollowers,
                instagramFollowers: roster.instagramFollowers,
                xFollowers: roster.xFollowers,
                threadsFollowers: roster.threadsFollowers,
                facebookFollowers: roster.facebookFollowers,
                oneCrossPostPrice: roster.oneCrossPostPrice,
                threePlatformPrice: roster.threePlatformPrice,
                allPlatformPrice: roster.allPlatformPrice,
              },
            }
          : undefined,
      },
    });
    created++;
    void creator;
  }
  console.log(`  seeded ${created} creators (${rosterRows.length} with real rate-card data from the roster)`);
}

async function main() {
  console.log("Parsing source-materials/Email_Classification_Phase_3_Push_to_Prod.json ...");
  const { senderLists, creatorUrls, creatorEmailMap, labelIds } = parseN8nExport(N8N_JSON_PATH);

  console.log("Parsing source-materials/TopTechTubers-Live-Roster-Rate-Card.xlsx ...");
  const rosterRows = await parseRosterXlsx(ROSTER_XLSX_PATH);

  console.log("Seeding senders...");
  await seedSenders(senderLists);

  console.log("Seeding labels...");
  await seedLabels(labelIds, senderLists.impLabelIdPlaceholder);

  console.log("Seeding creators...");
  await seedCreators(creatorUrls, creatorEmailMap, rosterRows);

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
