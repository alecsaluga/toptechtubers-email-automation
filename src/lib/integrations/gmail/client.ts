import { decodeBase64Url, extractFromEmail, htmlToPlain } from "@/lib/router/extractText";

const API_BASE = "https://www.googleapis.com/gmail/v1/users/me";

export class GmailApiError extends Error {
  constructor(action: string, status: number, body: string) {
    super(`Gmail API error during ${action}: ${status} ${body}`);
    this.name = "GmailApiError";
  }
}

async function gmailFetch(accessToken: string, path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, ...init?.headers },
  });
  if (!res.ok) throw new GmailApiError(path, res.status, await res.text());
  if (res.status === 204) return null; // e.g. batchModify returns no body
  return res.json();
}

export interface FetchedMessage {
  id: string;
  threadId: string;
  from: string;
  fromEmail: string;
  to: string;
  subject: string;
  plain: string;
  labelIds: string[];
  internalDate: string;
  isReply: boolean;
}

// Mirrors the extraction logic in the original "NEW" code node (see
// src/lib/router/extractText.ts) -- walks the MIME parts to find a plain (or
// html-converted-to-plain) body.
function extractPlainBody(payload: {
  mimeType?: string;
  body?: { data?: string };
  parts?: unknown[];
}): string {
  const bodies: { mimeType: string; data: string }[] = [];
  function collect(part: { mimeType?: string; body?: { data?: string }; parts?: unknown[] } | undefined) {
    if (!part) return;
    if (part.body?.data) bodies.push({ mimeType: part.mimeType || "text/plain", data: decodeBase64Url(part.body.data) });
    if (Array.isArray(part.parts)) for (const p of part.parts) collect(p as typeof part);
  }
  collect(payload);
  const plain = bodies.find((b) => /plain/i.test(b.mimeType))?.data;
  const html = bodies.find((b) => /html/i.test(b.mimeType))?.data;
  return plain || (html ? htmlToPlain(html) : "");
}

function headerValue(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

function allHeaderValues(headers: { name: string; value: string }[], name: string): string[] {
  return headers.filter((h) => h.name.toLowerCase() === name.toLowerCase()).map((h) => h.value);
}

// Every message here is auto-forwarded by Gmail (creator-specific address ->
// the shared triage inbox), which adds a NEW "Delivered-To" header at each
// hop rather than replacing the original -- so a forwarded message carries
// BOTH the creator's real address and the shared one. Raw email headers are
// prepended per hop, so the array's first "Delivered-To" is the most recent
// (final/shared) hop and the last one is the original. "X-Forwarded-For" (set
// by Gmail's own auto-forward feature, not the HTTP proxy header of the same
// name) is a more direct signal when present: space-separated addresses,
// original first. Falls back to "To" for mail that was never forwarded.
// Exported so the one-off backfill script (scripts/backfill-creator-
// resolution.ts) can re-run this exact logic against already-fetched headers.
export function extractOriginalRecipient(headers: { name: string; value: string }[]): string {
  const forwardedFor = headerValue(headers, "X-Forwarded-For").trim();
  if (forwardedFor) {
    const first = forwardedFor.split(/\s+/)[0];
    if (first) return first;
  }

  const deliveredTo = allHeaderValues(headers, "Delivered-To");
  if (deliveredTo.length > 0) return deliveredTo[deliveredTo.length - 1];

  return headerValue(headers, "To");
}

// Lists inbox messages received after `afterUnixSeconds` and fetches each in
// full. Used by the polling cron -- see src/app/api/cron/poll-gmail.
export async function listRecentMessages(accessToken: string, afterUnixSeconds: number): Promise<FetchedMessage[]> {
  const listRes = await gmailFetch(
    accessToken,
    `/messages?${new URLSearchParams({ q: `in:inbox after:${afterUnixSeconds}`, maxResults: "25" })}`
  );
  const ids: string[] = (listRes.messages || []).map((m: { id: string }) => m.id);

  const messages: FetchedMessage[] = [];
  for (const id of ids) {
    const full = await gmailFetch(accessToken, `/messages/${id}?format=full`);
    const headers = full.payload?.headers || [];
    const fromRaw = headerValue(headers, "From");
    messages.push({
      id: full.id,
      threadId: full.threadId,
      from: fromRaw,
      fromEmail: extractFromEmail(fromRaw),
      to: extractOriginalRecipient(headers),
      subject: headerValue(headers, "Subject"),
      plain: extractPlainBody(full.payload || {}),
      labelIds: full.labelIds || [],
      internalDate: full.internalDate,
      isReply: !!(headerValue(headers, "In-Reply-To") || headerValue(headers, "References")),
    });
  }
  return messages;
}

export async function findOrCreateLabel(accessToken: string, name: string): Promise<string> {
  const list = await gmailFetch(accessToken, "/labels");
  const existing = (list.labels || []).find((l: { name: string; id: string }) => l.name === name);
  if (existing) return existing.id;

  const created = await gmailFetch(accessToken, "/labels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      labelListVisibility: "labelShow",
      messageListVisibility: "show",
    }),
  });
  return created.id;
}

// Gmail's spam system label -- adding it moves the message into the actual
// Spam folder (not just out of Inbox), which also makes it auto-purge after
// 30 days and feeds Gmail's own spam-detection signal for that sender. This
// mirrors what the prior workflow did (confirmed against real message
// labelIds output, which showed "SPAM" with no "INBOX" on both its noise and
// spam categories).
export const GMAIL_SPAM_LABEL_ID = "SPAM";

export async function applyLabel(
  accessToken: string,
  messageId: string,
  labelIds: string | string[],
  opts?: { archive?: boolean }
): Promise<void> {
  await gmailFetch(accessToken, `/messages/${messageId}/modify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      addLabelIds: Array.isArray(labelIds) ? labelIds : [labelIds],
      ...(opts?.archive ? { removeLabelIds: ["INBOX"] } : {}),
    }),
  });
}

// Used by scripts/archive-labeled-noise-spam.ts to clear a backlog of
// already-labeled messages that were never removed from the inbox (see the
// "archive" fix in applyLabel above -- prior to that fix, noise/spam got
// labeled but stayed in INBOX). Gmail allows up to 1000 ids per call.
export async function batchArchive(accessToken: string, messageIds: string[]): Promise<void> {
  if (messageIds.length === 0) return;
  await gmailFetch(accessToken, `/messages/batchModify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: messageIds, addLabelIds: [GMAIL_SPAM_LABEL_ID], removeLabelIds: ["INBOX"] }),
  });
}

function toBase64Url(input: string): string {
  return Buffer.from(input, "utf-8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sendReply(
  accessToken: string,
  input: { threadId: string; to: string; subject: string; html: string }
): Promise<{ id: string }> {
  const subject = input.subject.toLowerCase().startsWith("re:") ? input.subject : `Re: ${input.subject}`;
  const mime = [
    `To: ${input.to}`,
    `Subject: ${subject}`,
    "Content-Type: text/html; charset=utf-8",
    "MIME-Version: 1.0",
    "",
    input.html,
  ].join("\r\n");

  return gmailFetch(accessToken, "/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw: toBase64Url(mime), threadId: input.threadId }),
  });
}
