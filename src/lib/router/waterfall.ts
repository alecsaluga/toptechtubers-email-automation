import type { NormalizedEmail, RouteResult, SenderListSnapshot } from "./types";

// Direct port of the "NEW" code node's first-match-wins waterfall from the
// original n8n workflow. Priority order matters
// and must not change without an explicit decision -- it's what determines
// who wins when a sender appears in more than one list (see the AGENCY vs
// AUTOCLOSE conflict on dealingagency.com / shortformvid.com, checked in
// tests/router/waterfall.test.ts).
export function routeEmail(
  email: NormalizedEmail,
  lists: SenderListSnapshot
): RouteResult {
  const { messageId, threadId, labelIds } = email;
  const hasImpTag = lists.impLabelId != null && labelIds.includes(lists.impLabelId);
  const isNewEmail = messageId === threadId;
  // Gmail groups messages into a thread by subject match alone when a
  // message has no In-Reply-To/References header -- a repeat cold-outreach
  // blast with the same subject line (e.g. a bulk sender re-pitching
  // several different creators) lands in an existing "thread" the same way
  // a genuine reply would, even though it's a brand new, never-seen
  // message. Only treat !isNewEmail as "already-handled reply" when real
  // reply headers back that up; otherwise fall through to normal routing.
  const isHandledThreadReply = !isNewEmail && !!email.isReply;

  if (isHandledThreadReply && !hasImpTag) {
    return { route: "skip", messageId, threadId };
  }

  if (isHandledThreadReply && hasImpTag) {
    return { route: "good_opportunity", messageId, threadId, hasImpTag, labelIds };
  }

  const fromEmail = email.fromEmail;
  const fromDomain = fromEmail.split("@")[1] || "";

  if (fromDomain === lists.internalDomain) {
    return { route: "skip", messageId, threadId, from: fromEmail };
  }

  if (lists.goodOppExact.has(fromEmail) || lists.goodOppDomains.has(fromDomain)) {
    return { route: "good_opportunity", messageId, threadId, from: fromEmail };
  }

  if (lists.impExact.has(fromEmail) || lists.impDomains.has(fromDomain)) {
    return { route: "imp_outreach", messageId, threadId, from: fromEmail };
  }

  if (lists.agencyExact.has(fromEmail) || lists.agencyDomains.has(fromDomain)) {
    return { route: "agency_markup", messageId, threadId, from: fromEmail };
  }

  if (lists.autocloseExact.has(fromEmail) || lists.autocloseDomains.has(fromDomain)) {
    return { route: "noise", messageId, threadId, from: fromEmail };
  }

  return {
    route: "classify",
    messageId,
    threadId,
    from: email.from,
    subject: email.subject,
    plain: email.plain,
    labelIds,
    hasImpTag,
  };
}
