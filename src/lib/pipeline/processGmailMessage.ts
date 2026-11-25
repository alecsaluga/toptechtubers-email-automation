import type { PrismaClient, ReplyLog } from "@prisma/client";
import { getClassifier } from "../classifier";
import type { FourWayCategory } from "../classifier/types";
import { resolveCreatorByDeliveredTo } from "../creators/resolveCreator";
import { applyLabel, findOrCreateLabel, sendReply, GMAIL_SPAM_LABEL_ID } from "../integrations/gmail/client";
import type { FetchedMessage } from "../integrations/gmail/client";
import { mapFinalCategoryToPathway, isPathwayLive } from "../pathways";
import { buildRateCardHtml } from "../reply-builder/rateCardTemplate";
import { getUpcomingVideosForCreator } from "../creators/contentCalendar";
import { loadSenderListSnapshot } from "../router/loadSenderLists";
import { routeEmail } from "../router/waterfall";
import type { NormalizedEmail } from "../router/types";

const FOUR_WAY_TO_CATEGORY: Record<FourWayCategory, string> = {
  GOOD_OPPORTUNITY: "good_opportunity",
  IMP_OUTREACH: "imp_outreach",
  SPAM: "spam",
  NOISE: "noise",
};

const NOISE_SPAM_LABEL = "TTT Auto: Noise/Spam";

// Processes one real inbound Gmail message through the routing waterfall and
// classifier, then takes a real action (label or reply) only for pathways
// marked live in PathwayConfig (see src/lib/pathways.ts).
export async function processGmailMessage(
  db: PrismaClient,
  accessToken: string,
  message: FetchedMessage
): Promise<ReplyLog | null> {
  const existing = await db.replyLog.findUnique({ where: { gmailMessageId: message.id } });
  if (existing) return null; // already processed this message on a prior poll

  const normalized: NormalizedEmail = {
    messageId: message.id,
    threadId: message.threadId,
    labelIds: message.labelIds,
    from: message.from,
    fromEmail: message.fromEmail,
    sentTo: message.to,
    subject: message.subject,
    plain: message.plain,
    isReply: message.isReply,
  };

  const lists = await loadSenderListSnapshot(db);
  const routed = routeEmail(normalized, lists);

  let finalCategory: string = routed.route;
  let reason: string | undefined;
  const classifier = await getClassifier();

  if (routed.route === "classify") {
    const result = await classifier.classifyFourWay({
      sender: normalized.fromEmail,
      subject: normalized.subject ?? "",
      body: normalized.plain ?? "",
      from: normalized.from,
    });
    finalCategory = FOUR_WAY_TO_CATEGORY[result.category];
    reason = result.reason;
  } else if (routed.route === "agency_markup") {
    const gate = await classifier.classifyTwoWay({
      sender: normalized.fromEmail,
      subject: normalized.subject ?? "",
      body: normalized.plain ?? "",
      from: normalized.from,
    });
    if (gate.category === "spam") finalCategory = "agency_spam_gated";
    reason = gate.reason;
  }

  const pathway = mapFinalCategoryToPathway(finalCategory);
  const pathwayIsLive = pathway ? await isPathwayLive(pathway) : false;

  let creatorName: string | undefined;
  let renderedHtml: string | undefined;
  let ccPreview: string | undefined;
  let status = "shadow";

  if (pathway === "NOISE_SPAM") {
    if (pathwayIsLive) {
      try {
        const labelId = await findOrCreateLabel(accessToken, NOISE_SPAM_LABEL);
        await applyLabel(accessToken, message.id, [labelId, GMAIL_SPAM_LABEL_ID], { archive: true });
        status = "labeled";
      } catch (err) {
        reason = [reason, `Failed to apply Gmail label: ${err instanceof Error ? err.message : String(err)}`]
          .filter(Boolean)
          .join(" | ");
      }
    }
  } else if (pathway && normalized.sentTo) {
    const creator = await resolveCreatorByDeliveredTo(db, normalized.sentTo);
    if (creator) {
      creatorName = creator.name;
      const upcomingVideos = await getUpcomingVideosForCreator(db, creator);
      renderedHtml = buildRateCardHtml({ ...creator, upcomingVideos }, { applyMarkup: finalCategory === "agency_markup" });
      ccPreview = creator.ccRules ?? undefined;

      if (pathwayIsLive) {
        try {
          await sendReply(accessToken, {
            threadId: normalized.threadId,
            to: normalized.fromEmail,
            subject: normalized.subject ?? "",
            html: renderedHtml,
          });
          status = "sent";
        } catch (err) {
          reason = [reason, `Failed to send Gmail reply: ${err instanceof Error ? err.message : String(err)}`]
            .filter(Boolean)
            .join(" | ");
        }
      }
    }
  }

  return db.replyLog.create({
    data: {
      gmailMessageId: message.id,
      inboundFrom: normalized.fromEmail,
      inboundTo: normalized.sentTo,
      subject: normalized.subject,
      route: routed.route,
      finalCategory,
      creatorName,
      renderedHtml,
      ccPreview,
      status,
      reason,
    },
  });
}
