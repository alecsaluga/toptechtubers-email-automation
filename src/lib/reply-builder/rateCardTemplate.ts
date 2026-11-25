import { formatPrice, formatSubs } from "./formatters";
import { applyMarkup } from "./markup";

// Narrow structural types (rather than the full Prisma Creator/RateCard)
// so callers -- including the client-side template preview in
// CreatorManager, which only has in-progress form state, not a full
// Prisma row -- can pass in whatever shape they have.
// Price fields are `unknown` because Prisma's Decimal (server-side) and
// plain numbers (client-side form state) both need to flow through
// toNumber() below -- Decimal isn't assignable to `number | string`.
export interface RateCardLike {
  customTemplate?: string | null;
  youtubeSubs?: number | null;
  dedicatedPrice?: unknown;
  midRoll60Price?: unknown;
  midRoll120Price?: unknown;
  tiktokFollowers?: number | null;
  instagramFollowers?: number | null;
  xFollowers?: number | null;
  threadsFollowers?: number | null;
  facebookFollowers?: number | null;
  oneCrossPostPrice?: unknown;
  threePlatformPrice?: unknown;
  allPlatformPrice?: unknown;
}

export interface CreatorWithRateCard {
  name: string;
  channelUrl?: string | null;
  niche?: string | null;
  rateCard?: RateCardLike | null;
  // Open videos from the Master Content Calendar (see
  // src/lib/creators/contentCalendar.ts). Absent/empty => output unchanged.
  upcomingVideos?: UpcomingVideoLike[] | null;
}

export interface UpcomingVideoLike {
  videoTitle: string | null;
  launchMonth: string | null;
  launchTiming: string | null;
  niche: string | null;
}

function upcomingItems(creator: CreatorWithRateCard): string[] {
  return (creator.upcomingVideos ?? []).slice(0, 3).map((v) => {
    const month = (v.launchMonth ?? "").replace(/^\s*\d{1,2}\.\s*/, "").trim();
    const when = [v.launchTiming, month].filter(Boolean).join(" ");
    const bits = [when, v.niche].filter(Boolean).map((b) => escapeHtml(String(b)));
    return `${escapeHtml(v.videoTitle || "Upcoming video")}${bits.length ? ` (${bits.join(" · ")})` : ""}`;
  });
}

function upcomingVideosHtml(creator: CreatorWithRateCard): string {
  const items = upcomingItems(creator);
  if (!items.length) return "";
  return [
    `<p><b>Upcoming Videos Open for Sponsorship</b></p>`,
    `<p>${escapeHtml(creator.name)} also has these upcoming videos that could be a great fit for an integration:</p>`,
    bulletList(items),
  ].join("\n");
}

function toNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

function textToHtml(text: string): string {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((para) => `<p>${para.split("\n").join("<br>")}</p>`)
    .join("\n");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const TEMPLATE_VAR_KEYS = [
  "creatorName",
  "channelUrl",
  "niche",
  "youtubeSubs",
  "dedicatedPrice",
  "midRoll60Price",
  "midRoll120Price",
  "tiktokFollowers",
  "instagramFollowers",
  "xFollowers",
  "threadsFollowers",
  "facebookFollowers",
  "oneCrossPostPrice",
  "threePlatformPrice",
  "allPlatformPrice",
  "upcomingVideos",
] as const;

export type TemplateVars = Record<(typeof TEMPLATE_VAR_KEYS)[number], string>;

export function buildTemplateVars(
  creator: CreatorWithRateCard,
  opts: { applyMarkup: boolean }
): TemplateVars {
  const rc = creator.rateCard;
  const priced = (val: unknown) => formatPrice(applyMarkup(toNumber(val), opts.applyMarkup));
  const subs = (val: unknown) => formatSubs(toNumber(val));

  return {
    creatorName: creator.name,
    channelUrl: creator.channelUrl || "",
    niche: creator.niche || "",
    youtubeSubs: subs(rc?.youtubeSubs),
    dedicatedPrice: priced(rc?.dedicatedPrice),
    midRoll60Price: priced(rc?.midRoll60Price),
    midRoll120Price: priced(rc?.midRoll120Price),
    tiktokFollowers: subs(rc?.tiktokFollowers),
    instagramFollowers: subs(rc?.instagramFollowers),
    xFollowers: subs(rc?.xFollowers),
    threadsFollowers: subs(rc?.threadsFollowers),
    facebookFollowers: subs(rc?.facebookFollowers),
    oneCrossPostPrice: priced(rc?.oneCrossPostPrice),
    threePlatformPrice: priced(rc?.threePlatformPrice),
    allPlatformPrice: priced(rc?.allPlatformPrice),
    upcomingVideos: upcomingItems(creator).map((i) => `- ${i}`).join("\n"),
  };
}

export function substituteVars(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key as keyof TemplateVars] : match
  );
}

function bulletList(items: string[]): string {
  return `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
}

// Only lines backed by a real value are included, so a YouTube-only creator
// doesn't show blank rows for platforms or price tiers they don't have.
// Structure (section headers, real <ul> bullets, name/subs hyperlinks)
// mirrors the reference reply Lawrence sent --
// a plain-text/<br> rendering was tried first and lost the actual bullet
// markers, which is what this replaces.
function buildDefaultHtml(creator: CreatorWithRateCard, opts: { applyMarkup: boolean }): string {
  const rc = creator.rateCard;
  const priced = (val: unknown) => formatPrice(applyMarkup(toNumber(val), opts.applyMarkup));
  const subs = (val: unknown) => formatSubs(toNumber(val));
  const url = creator.channelUrl;
  const name = escapeHtml(creator.name);
  const nameHtml = url ? `<a href="${escapeHtml(url)}">${name}</a>` : name;

  const parts: string[] = [`<p>Hi there,</p>`, `<p>Thanks for your interest in ${nameHtml}.</p>`];

  const longForm: string[] = [];
  if (toNumber(rc?.dedicatedPrice) !== null) longForm.push(`YouTube Dedicated: ${priced(rc?.dedicatedPrice)}`);
  if (toNumber(rc?.midRoll60Price) !== null) longForm.push(`YouTube 60s Mid-Roll: ${priced(rc?.midRoll60Price)}`);
  if (toNumber(rc?.midRoll120Price) !== null) longForm.push(`YouTube 120s Mid-Roll: ${priced(rc?.midRoll120Price)}`);
  if (longForm.length) {
    parts.push(
      `<p><b>Long-Form Content</b></p>`,
      `<p>If you're interested in purchasing long-form content, such as a dedicated YouTube video or an integration into a YouTube video, please see below.</p>`,
      bulletList(longForm)
    );
  }

  const shortForm: string[] = [];
  if (toNumber(rc?.oneCrossPostPrice) !== null) shortForm.push(`Short-Form Video: ${priced(rc?.oneCrossPostPrice)}`);
  if (toNumber(rc?.threePlatformPrice) !== null) shortForm.push(`3-Platform Package: ${priced(rc?.threePlatformPrice)}`);
  if (toNumber(rc?.allPlatformPrice) !== null) shortForm.push(`All-Platform Package: ${priced(rc?.allPlatformPrice)}`);
  if (shortForm.length) {
    parts.push(
      `<p><b>Short-Form Content</b></p>`,
      `<p>If you're interested in purchasing YouTube Shorts, Instagram Reels, or TikTok videos, please see below.</p>`,
      bulletList(shortForm)
    );
  }

  const youtubeSubsHtml = url ? `<a href="${escapeHtml(url)}">${subs(rc?.youtubeSubs)}</a>` : subs(rc?.youtubeSubs);
  const platforms: string[] = [];
  if (toNumber(rc?.youtubeSubs) !== null) platforms.push(`YouTube: ${youtubeSubsHtml}`);
  if (toNumber(rc?.tiktokFollowers) !== null) platforms.push(`TikTok: ${subs(rc?.tiktokFollowers)}`);
  if (toNumber(rc?.instagramFollowers) !== null) platforms.push(`Instagram: ${subs(rc?.instagramFollowers)}`);
  if (toNumber(rc?.xFollowers) !== null) platforms.push(`X: ${subs(rc?.xFollowers)}`);
  if (toNumber(rc?.threadsFollowers) !== null) platforms.push(`Threads: ${subs(rc?.threadsFollowers)}`);
  if (toNumber(rc?.facebookFollowers) !== null) platforms.push(`Facebook: ${subs(rc?.facebookFollowers)}`);
  if (platforms.length) {
    parts.push(`<p><b>Current Platforms &amp; Audience</b></p>`, bulletList(platforms));
  }

  const upcoming = upcomingVideosHtml(creator);
  if (upcoming) parts.push(upcoming);

  parts.push(
    `<p>We also offer package deals of long-form and short-form content.</p>`,
    `<p>Please feel free to reach out with any questions.</p>`,
    `<p>Regards,</p>`
  );

  return parts.join("\n");
}

// Bullet-point format (replacing the old two-<table> layout -- some inbound
// platforms, e.g. Knox Influencer, mangle table markup when rendering the
// reply). A creator's RateCard.customTemplate, if set, overrides the default
// body entirely and is filled in via {{variableName}} placeholders
// (TEMPLATE_VAR_KEYS) -- that path stays plain-text-with-<br> since it's
// free-form user input, not the structured default.
export function buildRateCardHtml(
  creator: CreatorWithRateCard,
  opts: { applyMarkup: boolean }
): string {
  const custom = creator.rateCard?.customTemplate?.trim();
  const body = custom
    ? textToHtml(substituteVars(custom, buildTemplateVars(creator, opts)))
    : buildDefaultHtml(creator, opts);

  return `<div style="font-family:Arial,sans-serif;font-size:14px;color:#000;">
${body}
</div>`;
}
