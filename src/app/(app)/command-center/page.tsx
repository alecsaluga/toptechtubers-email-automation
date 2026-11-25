import { prisma } from "@/lib/db";
import { getAllPathways } from "@/lib/pathways";
import { getSecret, isSecretSet } from "@/lib/secrets";
import { CommandCenterPanel } from "@/components/CommandCenterPanel";
import { GoogleCredentialsPanel } from "@/components/GoogleCredentialsPanel";
import { OpenAiCredentialsPanel } from "@/components/OpenAiCredentialsPanel";
import { RateCardSyncPanel } from "@/components/RateCardSyncPanel";
import { getCalendarSyncStatus } from "@/lib/creators/runCalendarSync";
import { ContentCalendarSyncPanel } from "@/components/ContentCalendarSyncPanel";
import { ChangePasswordPanel } from "@/components/ChangePasswordPanel";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "The connection attempt expired or didn't match — please try connecting again.",
  no_refresh_token: "Google didn't return a long-lived token. Try disconnecting any prior access at myaccount.google.com/permissions, then reconnect.",
  exchange_failed: "Google rejected the connection request. Double-check the Client ID/Secret and redirect URI, then try again.",
  access_denied: "The Google sign-in was cancelled before finishing.",
  not_configured: "Add a Google Client ID and Client Secret below before connecting.",
};

export default async function CommandCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const params = await searchParams;
  const [account, pathways, googleClientId, googleClientSecretSet, openaiApiKeySet, rateCardSpreadsheetId, calendarStatus] =
    await Promise.all([
      prisma.googleAccount.findFirst({
        select: { email: true, connectedAt: true, lastPolledAt: true, scope: true },
      }),
      getAllPathways(),
      getSecret("GOOGLE_CLIENT_ID"),
      isSecretSet("GOOGLE_CLIENT_SECRET"),
      isSecretSet("OPENAI_API_KEY"),
      getSecret("RATE_CARD_SPREADSHEET_ID"),
      getCalendarSyncStatus(prisma),
    ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-neutral-900">Command Center</h1>
        <p className="text-neutral-500 mt-1 max-w-2xl text-[15px]">
          Connect the real Gmail inbox and control exactly which pathways are allowed to take real
          action. Everything defaults off — nothing runs for real until you switch it on below. See{" "}
          <a href="/how-it-works" className="text-brand-600 font-medium hover:underline">
            How It Works
          </a>{" "}
          for what each pathway checks before it fires.
        </p>
      </div>

      <GoogleCredentialsPanel initialClientId={googleClientId} initialClientSecretSet={googleClientSecretSet} />

      <OpenAiCredentialsPanel initialApiKeySet={openaiApiKeySet} />

      <CommandCenterPanel
        initialAccount={account}
        initialPathways={pathways}
        connectedFlash={params.connected === "1"}
        errorMessage={params.error ? ERROR_MESSAGES[params.error] ?? `Something went wrong (${params.error}).` : null}
      />

      <RateCardSyncPanel initialSpreadsheetId={rateCardSpreadsheetId} />

      <ContentCalendarSyncPanel
        lastSyncedAt={calendarStatus.lastSyncedAt ? calendarStatus.lastSyncedAt.toISOString() : null}
        rows={calendarStatus.rows}
        matchedRows={calendarStatus.matchedRows}
      />

      <ChangePasswordPanel />
    </div>
  );
}
