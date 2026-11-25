// One-off backlog cleanup: prior to the "archive" fix in
// src/lib/integrations/gmail/client.ts applyLabel(), the Noise/Spam pathway
// added the "TTT Auto: Noise/Spam" label but never removed INBOX, so every
// correctly-classified noise/spam message piled up in the visible inbox
// instead of being cleared out. This finds every message that already has
// that label and is still in INBOX, and archives it in batches.
//
// Usage: npx tsx scripts/archive-labeled-noise-spam.ts
import { PrismaClient } from "@prisma/client";
import { getValidAccessToken } from "../src/lib/integrations/gmail/tokens";
import { batchArchive } from "../src/lib/integrations/gmail/client";

const prisma = new PrismaClient();
const NOISE_SPAM_LABEL = "TTT Auto: Noise/Spam";

async function main() {
  const token = await getValidAccessToken(prisma);
  if (!token) throw new Error("No Google account connected.");

  const labelsRes = await fetch("https://www.googleapis.com/gmail/v1/users/me/labels", {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });
  const labelsData = await labelsRes.json();
  const label = (labelsData.labels || []).find((l: { name: string; id: string }) => l.name === NOISE_SPAM_LABEL);
  if (!label) throw new Error(`Label "${NOISE_SPAM_LABEL}" not found.`);

  let total = 0;
  let pageToken: string | undefined;

  do {
    // Gmail's `label:"multi word"` search-string syntax is unreliable; the
    // labelIds array parameter (AND semantics across repeated keys) is not.
    const params = new URLSearchParams([
      ["labelIds", label.id],
      ["labelIds", "INBOX"],
      ["maxResults", "500"],
    ]);
    if (pageToken) params.set("pageToken", pageToken);

    const listRes = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages?${params}`, {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    });
    const listData = await listRes.json();
    const ids: string[] = (listData.messages || []).map((m: { id: string }) => m.id);

    if (ids.length > 0) {
      await batchArchive(token.accessToken, ids);
      total += ids.length;
      console.log(`Archived ${ids.length} (running total ${total})`);
    }

    pageToken = listData.nextPageToken;
  } while (pageToken);

  console.log(`\nDone. Archived ${total} already-labeled messages out of the inbox.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
