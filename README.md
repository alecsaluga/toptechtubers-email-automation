# TopTechTubers Email Automation

Inbound email routing and auto-reply system for the TopTechTubers brand-deal inbox (`creatorcollabs@toptechtubers.com`), which aggregates the inboxes of roughly 45 tech creators.

Every few minutes the app pulls net-new Gmail messages, routes each one through a rules waterfall and an email classifier, and then either labels it (noise/spam) or prepares a rate-card reply for the creator it was sent to. Each action pathway can be switched between **live** and **shadow** mode, so replies can be reviewed in the dashboard before anything is sent.

## Stack

- **Next.js 16** (App Router) on **Vercel**, with a Vercel Cron job
- **Postgres** via **Prisma**
- **Gmail API** and **Google Sheets API** over REST (OAuth with a connected Google account)
- **OpenAI API** for email classification, with a keyword fallback classifier when no key is configured

## How it works

```
Vercel Cron (every 5 min) -> /api/cron/poll-gmail
  -> pollGmailOnce: fetch new Gmail messages
  -> processGmailMessage, for each message:
       1. Waterfall router (src/lib/router/waterfall.ts), first match wins
            reply in an existing thread          -> skip
            internal sender (@toptechtubers.com) -> skip
            Good Opportunity sender list         -> good_opportunity
            IMP platform sender list             -> imp_outreach
            Agency sender list                   -> agency_markup (plus a 2-way spam gate)
            Auto-close sender list               -> noise
            anything else                        -> classifier
       2. Classifier (src/lib/classifier): GOOD_OPPORTUNITY | IMP_OUTREACH | SPAM | NOISE
       3. Pathway check (PathwayConfig.live)
            NOISE_SPAM: apply the "TTT Auto: Noise/Spam" label and archive
            GOOD_OPPORTUNITY / IMP_OUTREACH / AGENCY_MARKUP:
              resolve the creator from the delivered-to address,
              build the rate-card reply (+15% for agencies),
              send it if the pathway is live, otherwise store it as a shadow draft
       4. Write a ReplyLog row (visible in Reply Log and Staging Review)
  -> runCalendarSyncIfStale: refresh the content calendar mirror (at most hourly)
```

### Classifier

`getClassifier()` (`src/lib/classifier/index.ts`) uses the OpenAI classifier automatically once an `OPENAI_API_KEY` is saved in the Command Center (or set as an env var). Without a key it falls back to a deterministic keyword classifier; those Reply Log entries have reasons prefixed with `mock:`. Category definitions live in `src/lib/classifier/prompts.ts`.

### Rate cards and templates

- Creator rates and follower counts are synced from the **TopTechTubers Live Roster Rate Card** Google Sheet, tab **Live Rates V2** (Command Center, "Sync rates").
- Open videos are mirrored from the **[Master] TTT Roster - Monthly Content Calendar** sheet, tab **DO NOT EDIT**, and up to three appear in replies under "Upcoming Videos Open for Sponsorship".
- The default reply is built in `src/lib/reply-builder/rateCardTemplate.ts`. Any creator can have a custom template (Creators page) that uses `{{variable}}` placeholders such as `{{creatorName}}`, `{{dedicatedPrice}}`, and `{{upcomingVideos}}`.

## Dashboard pages

| Page | Purpose |
| --- | --- |
| Dashboard / Overview / How It Works | Route stats and a plain-English explanation of the pipeline |
| Command Center | Google account connection, OpenAI key, rate card and calendar sync, pathway live/shadow toggles, password |
| Staging Review | QA queue for shadow replies (approve or flag) |
| Sender List | Good Opportunity, IMP, Agency, and Auto-close sender lists (exact emails or domains) |
| Creators | Creator roster, rate cards, delivered-to aliases, custom templates with live preview |
| Reply Log | Every processed message with route, category, reason, and rendered reply |

Access is protected by a single shared dashboard password (stored hashed and encrypted in the DB).

## Local setup

```bash
npm install
cp .env.example .env      # fill in values
npx prisma db push        # create the schema
npm run dev
```

Then open http://localhost:3000, set a dashboard password with `npx tsx scripts/set-app-password.ts "<password>"`, and connect Google and OpenAI in the Command Center.

## Environment variables

| Name | Description |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `ENCRYPTION_KEY` | 32-byte base64 key for encrypting stored credentials |
| `SESSION_SECRET` | Signs dashboard session cookies |
| `CRON_SECRET` | Bearer token required by `/api/cron/poll-gmail` |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL, must match the Google Cloud OAuth client |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OPENAI_API_KEY` | Optional fallbacks; normally entered in the Command Center |

## Deploy (Vercel)

1. Import the repo into Vercel and add a Postgres database (Prisma Postgres works).
2. Set the environment variables above for Production.
3. Deploy. `npm run build` runs `prisma generate && next build`; `vercel.json` registers the 5-minute cron.
4. Add `https://<your-domain>/api/auth/google/callback` as an authorized redirect URI on the Google OAuth client.

## Scripts and tests

- `scripts/`: one-off seeding, backfill, and maintenance scripts (seed sender lists and roster, backfill creator resolution, archive labeled noise, set the dashboard password).
- `npm test` runs the Vitest suite (router waterfall and rate-card template).
