// Ported verbatim (behavior-preserving) from the "NEW" code node's text
// helpers. Pure string functions -- no Gmail/DB dependency -- so they're
// reusable from the real Gmail ingest pipeline (see processGmailMessage.ts).

export function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf-8");
}

export function htmlToPlain(html: string): string {
  let t = html
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  t = t
    .replace(/<(br|hr)\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|header|footer|li|tr|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "");
  t = t
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
  t = t
    .replace(/[*_`~]/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  return t;
}

export function extractFromEmail(fromRaw: string): string {
  return fromRaw
    .toLowerCase()
    .replace(/.*<(.+)>.*/, "$1")
    .trim();
}
