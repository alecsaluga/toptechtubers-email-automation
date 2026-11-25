import { describe, expect, it } from "vitest";
import { routeEmail } from "../../src/lib/router/waterfall";
import type { NormalizedEmail, SenderListSnapshot } from "../../src/lib/router/types";

function baseEmail(overrides: Partial<NormalizedEmail> = {}): NormalizedEmail {
  return {
    messageId: "m1",
    threadId: "m1",
    labelIds: [],
    from: "Someone <someone@example.com>",
    fromEmail: "someone@example.com",
    ...overrides,
  };
}

function baseLists(overrides: Partial<SenderListSnapshot> = {}): SenderListSnapshot {
  return {
    goodOppExact: new Set(),
    goodOppDomains: new Set(),
    impExact: new Set(),
    impDomains: new Set(),
    agencyExact: new Set(),
    agencyDomains: new Set(),
    autocloseExact: new Set(),
    autocloseDomains: new Set(),
    impLabelId: null,
    internalDomain: "toptechtubers.com",
    ...overrides,
  };
}

describe("routeEmail waterfall", () => {
  it("skips a genuine thread reply (real reply headers) with no IMP tag", () => {
    const result = routeEmail(
      baseEmail({ messageId: "m2", threadId: "m1", isReply: true }),
      baseLists()
    );
    expect(result.route).toBe("skip");
  });

  it("routes a genuine thread reply with the IMP tag to good_opportunity", () => {
    const result = routeEmail(
      baseEmail({ messageId: "m2", threadId: "m1", isReply: true, labelIds: ["Label_imp"] }),
      baseLists({ impLabelId: "Label_imp" })
    );
    expect(result.route).toBe("good_opportunity");
    expect(result.hasImpTag).toBe(true);
  });

  // Regression test: Gmail bundles messages into a thread by subject match
  // alone when there's no In-Reply-To/References header -- e.g. a bulk
  // sender blasting the same subject to multiple different creators. That
  // used to get silently "skip"-routed (no label, no action, left sitting
  // in the inbox) because messageId !== threadId looked identical to a
  // real handled reply. It must now fall through to normal classification.
  it("does NOT skip a Gmail-grouped 'thread' that lacks real reply headers", () => {
    const result = routeEmail(
      baseEmail({ messageId: "m2", threadId: "m1", subject: "15 seconds of content, $2,000 prize", plain: "hi" }),
      baseLists()
    );
    expect(result.route).toBe("classify");
  });

  it("does NOT swallow a Gmail-grouped 'thread' with an IMP tag but no real reply headers", () => {
    const result = routeEmail(
      baseEmail({ messageId: "m2", threadId: "m1", labelIds: ["Label_imp"], fromEmail: "outreach@kolsummit-mail.com" }),
      baseLists({ impLabelId: "Label_imp", impDomains: new Set(["kolsummit-mail.com"]) })
    );
    expect(result.route).toBe("imp_outreach");
  });

  it("skips internal-domain senders", () => {
    const result = routeEmail(
      baseEmail({ fromEmail: "lawrence@toptechtubers.com" }),
      baseLists()
    );
    expect(result.route).toBe("skip");
  });

  it("matches good-opp exact before falling through", () => {
    const result = routeEmail(
      baseEmail({ fromEmail: "hello@brandonbutch.com" }),
      baseLists({ goodOppExact: new Set(["hello@brandonbutch.com"]) })
    );
    expect(result.route).toBe("good_opportunity");
  });

  it("matches good-opp domain", () => {
    const result = routeEmail(
      baseEmail({ fromEmail: "rep@dell.com" }),
      baseLists({ goodOppDomains: new Set(["dell.com"]) })
    );
    expect(result.route).toBe("good_opportunity");
  });

  it("matches IMP domain", () => {
    const result = routeEmail(
      baseEmail({ fromEmail: "outreach@kolsummit-mail.com" }),
      baseLists({ impDomains: new Set(["kolsummit-mail.com"]) })
    );
    expect(result.route).toBe("imp_outreach");
  });

  it("matches agency domain", () => {
    const result = routeEmail(
      baseEmail({ fromEmail: "hi@someagency.com" }),
      baseLists({ agencyDomains: new Set(["someagency.com"]) })
    );
    expect(result.route).toBe("agency_markup");
  });

  it("matches autoclose domain and routes to noise", () => {
    const result = routeEmail(
      baseEmail({ fromEmail: "no-reply@spamvendor.com" }),
      baseLists({ autocloseDomains: new Set(["spamvendor.com"]) })
    );
    expect(result.route).toBe("noise");
  });

  it("falls through to classify when nothing matches", () => {
    const result = routeEmail(baseEmail({ subject: "hi", plain: "hello" }), baseLists());
    expect(result.route).toBe("classify");
    expect(result.subject).toBe("hi");
  });

  // Regression test for the known real-world conflict in the sender
  // lists: dealingagency.com and shortformvid.com are listed
  // in BOTH agency and autoclose. Agency must win because it's checked first.
  it("resolves the dealingagency.com conflict in favor of AGENCY (checked before AUTOCLOSE)", () => {
    const result = routeEmail(
      baseEmail({ fromEmail: "reply@dealingagency.com" }),
      baseLists({
        agencyDomains: new Set(["dealingagency.com"]),
        autocloseDomains: new Set(["dealingagency.com"]),
      })
    );
    expect(result.route).toBe("agency_markup");
  });

  it("good-opp takes priority over IMP and agency when a sender is in multiple lists", () => {
    const result = routeEmail(
      baseEmail({ fromEmail: "multi@example.com" }),
      baseLists({
        goodOppExact: new Set(["multi@example.com"]),
        impExact: new Set(["multi@example.com"]),
        agencyExact: new Set(["multi@example.com"]),
      })
    );
    expect(result.route).toBe("good_opportunity");
  });
});
