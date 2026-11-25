import { describe, expect, it } from "vitest";
import { buildRateCardHtml } from "../../src/lib/reply-builder/rateCardTemplate";
import { applyMarkup } from "../../src/lib/reply-builder/markup";
import { formatPrice, formatSubs } from "../../src/lib/reply-builder/formatters";
import type { CreatorWithRateCard } from "../../src/lib/reply-builder/rateCardTemplate";

// Prisma's real RateCard type stores prices as Decimal; for these pure
// template-rendering tests plain numbers behave identically (buildRateCardHtml
// only ever calls Number() on them), so we cast rather than construct a real
// Decimal instance.
function creator(overrides: Partial<CreatorWithRateCard> = {}): CreatorWithRateCard {
  const base = {
    id: "c1",
    name: "Test Creator",
    slug: "test-creator",
    channelUrl: "https://www.youtube.com/@TestCreator",
    niche: "Phones, Tablets",
    country: "US",
    assignee: "UNASSIGNED",
    ccRules: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    rateCard: {
      id: "rc1",
      creatorId: "c1",
      youtubeSubs: 100000,
      dedicatedPrice: 10000,
      midRoll60Price: 2000,
      midRoll120Price: 3000,
      tiktokFollowers: 5000,
      instagramFollowers: 6000,
      xFollowers: null,
      threadsFollowers: null,
      facebookFollowers: null,
      oneCrossPostPrice: 1000,
      threePlatformPrice: 1500,
      allPlatformPrice: 2000,
      updatedAt: new Date(),
    },
    ...overrides,
  };
  return base as unknown as CreatorWithRateCard;
}

describe("formatters", () => {
  it("formats subs with thousands separators", () => {
    expect(formatSubs(1234567)).toBe("1,234,567");
  });
  it("formats a dash for missing values", () => {
    expect(formatSubs(null)).toBe("-");
    expect(formatPrice(undefined)).toBe("-");
  });
  it("formats prices with a dollar sign", () => {
    expect(formatPrice(2500)).toBe("$2,500");
  });
});

describe("applyMarkup", () => {
  it("leaves price unchanged when markup not requested", () => {
    expect(applyMarkup(1000, false)).toBe(1000);
  });
  it("applies +15% when requested", () => {
    expect(applyMarkup(1000, true)).toBe(1150);
  });
  it("passes through null", () => {
    expect(applyMarkup(null, true)).toBeNull();
  });
});

describe("buildRateCardHtml", () => {
  it("renders the creator name, niche, and formatted prices", () => {
    const html = buildRateCardHtml(creator(), { applyMarkup: false });
    expect(html).toContain("Test Creator");
    expect(html).toContain("$10,000");
    expect(html).toContain("YouTube 120s Mid-Roll");
    expect(html).not.toContain("col_");
  });

  it("applies the agency markup to long-form and short-form prices", () => {
    const html = buildRateCardHtml(creator(), { applyMarkup: true });
    expect(html).toContain("$11,500"); // dedicated 10000 * 1.15
    expect(html).toContain("$2,300"); // 60s midroll 2000 * 1.15
  });

  it("omits sections entirely when rate card data is missing", () => {
    const html = buildRateCardHtml(creator({ rateCard: null }), { applyMarkup: false });
    expect(html).toContain('Thanks for your interest in <a href="https://www.youtube.com/@TestCreator">Test Creator</a>.');
    expect(html).not.toContain("Long-Form Content");
    expect(html).not.toContain("Short-Form Content");
    expect(html).not.toContain("Current Platforms");
    expect(html).not.toContain(">-<");
  });

  it("omits individual price/platform lines that have no value", () => {
    const html = buildRateCardHtml(
      creator({ rateCard: { id: "rc1", creatorId: "c1", youtubeSubs: 13700, dedicatedPrice: 20000, midRoll60Price: 5000, midRoll120Price: null, tiktokFollowers: null, instagramFollowers: null, xFollowers: null, threadsFollowers: null, facebookFollowers: null, oneCrossPostPrice: 1800, threePlatformPrice: null, allPlatformPrice: null, customTemplate: null, updatedAt: new Date() } as unknown as CreatorWithRateCard["rateCard"] }),
      { applyMarkup: false }
    );
    expect(html).toContain("YouTube Dedicated: $20,000");
    expect(html).toContain("YouTube 60s Mid-Roll: $5,000");
    expect(html).not.toContain("120s Mid-Roll");
    expect(html).toContain("Short-Form Video: $1,800");
    expect(html).not.toContain("3-Platform Package");
    expect(html).toContain("YouTube: <a href=\"https://www.youtube.com/@TestCreator\">13,700</a>");
    expect(html).not.toContain("TikTok:");
  });

  it("renders real <ul><li> bullet lists, bold section headers, and a hyperlinked creator name", () => {
    const html = buildRateCardHtml(creator(), { applyMarkup: false });
    expect(html).toContain('<a href="https://www.youtube.com/@TestCreator">Test Creator</a>');
    expect(html).toContain("<b>Long-Form Content</b>");
    expect(html).toContain("<b>Short-Form Content</b>");
    expect(html).toContain("<b>Current Platforms &amp; Audience</b>");
    expect(html).toContain("<ul><li>YouTube Dedicated: $10,000</li><li>YouTube 60s Mid-Roll: $2,000</li><li>YouTube 120s Mid-Roll: $3,000</li></ul>");
  });

  it("uses a per-creator customTemplate override with {{variable}} substitution", () => {
    const html = buildRateCardHtml(
      creator({
        rateCard: {
          id: "rc1",
          creatorId: "c1",
          youtubeSubs: null,
          dedicatedPrice: null,
          midRoll60Price: null,
          midRoll120Price: null,
          tiktokFollowers: null,
          instagramFollowers: 50000,
          xFollowers: null,
          threadsFollowers: null,
          facebookFollowers: null,
          oneCrossPostPrice: null,
          threePlatformPrice: null,
          allPlatformPrice: null,
          customTemplate: "Hi there,\n\nThanks for your interest in {{creatorName}}! We have {{instagramFollowers}} Instagram followers.",
          updatedAt: new Date(),
        } as unknown as CreatorWithRateCard["rateCard"],
      }),
      { applyMarkup: false }
    );
    expect(html).toContain("Thanks for your interest in Test Creator! We have 50,000 Instagram followers.");
    expect(html).not.toContain("Long-Form Content");
  });
});
