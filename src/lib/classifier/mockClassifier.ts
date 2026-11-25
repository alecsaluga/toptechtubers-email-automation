import type { Classifier, ClassifyInput, ClassifyResult, FourWayCategory, TwoWayCategory } from "./types";

// Deterministic keyword-based stub so the pipeline runs end-to-end with zero
// API key. Automatically replaced by OpenAiClassifier once OPENAI_API_KEY is
// set (see classifier/index.ts) -- same interface, backed by gpt-5.
export class MockClassifier implements Classifier {
  async classifyFourWay(input: ClassifyInput): Promise<ClassifyResult<FourWayCategory>> {
    const text = `${input.subject} ${input.body}`.toLowerCase();
    const from = input.from.toLowerCase();

    if (/netflix|spotify|bank alert|receipt|unsubscribe|delivery confirmation/.test(text)) {
      return { category: "NOISE", reason: "mock: matched personal/notification keywords" };
    }
    if (/kol|nox\s?influencer|tomoson|parklu/.test(from) || /kol|nox\s?influencer|tomoson|parklu/.test(text)) {
      return { category: "IMP_OUTREACH", reason: "mock: matched IMP platform keywords" };
    }
    if (/thumbnail|video editor|seo (agency|services)|freelance (editor|designer)/.test(text)) {
      return { category: "SPAM", reason: "mock: matched unsolicited service-pitch keywords" };
    }
    return { category: "GOOD_OPPORTUNITY", reason: "mock: default fallback (no other category matched)" };
  }

  async classifyTwoWay(input: ClassifyInput): Promise<ClassifyResult<TwoWayCategory>> {
    const text = `${input.subject} ${input.body}`.toLowerCase();
    if (/rate card|rates?\b|pricing|sponsor|collab/.test(text)) {
      return { category: "realOpportunity", reason: "mock: matched rate/sponsorship keywords" };
    }
    return { category: "spam", reason: "mock: default fallback (no opportunity keywords found)" };
  }
}
