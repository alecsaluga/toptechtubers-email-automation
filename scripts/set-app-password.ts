// One-off / recovery tool: sets the dashboard login password directly in the
// DB, bypassing the UI (which requires already being logged in). Useful for
// initial setup or if locked out.
//
// Usage: npx tsx scripts/set-app-password.ts "the new password"
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { encrypt } from "../src/lib/crypto";

const prisma = new PrismaClient();

async function main() {
  const password = process.argv[2];
  if (!password || password.length < 8) {
    console.error("Usage: npx tsx scripts/set-app-password.ts \"<password, min 8 chars>\"");
    process.exit(1);
  }

  const hash = hashPassword(password);
  await prisma.secret.upsert({
    where: { key: "APP_PASSWORD_HASH" },
    update: { valueEncrypted: encrypt(hash) },
    create: { key: "APP_PASSWORD_HASH", valueEncrypted: encrypt(hash) },
  });

  console.log("Dashboard password set.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
