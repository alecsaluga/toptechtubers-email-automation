// A route the waterfall (or the downstream classifier) can assign to an
// email. "classify" means "unknown sender -- ask the AI classifier."
export type Route =
  | "skip"
  | "noise"
  | "good_opportunity"
  | "imp_outreach"
  | "agency_markup"
  | "classify";

export interface NormalizedEmail {
  messageId: string;
  threadId: string;
  labelIds: string[];
  from: string;
  fromEmail: string;
  sentTo?: string;
  subject?: string;
  plain?: string;
  // True only if the message carries a real In-Reply-To/References header.
  // Gmail's threadId groups messages by subject-match alone when those
  // headers are absent, so messageId !== threadId does NOT by itself mean
  // "this is a reply in an already-handled conversation" -- a repeat
  // cold-outreach blast with the same subject line gets bundled into an
  // existing thread the same way a real reply would. Defaults to false
  // (not a verified reply) wherever unset, which is the safe direction.
  isReply?: boolean;
}

export interface SenderListSnapshot {
  goodOppExact: Set<string>;
  goodOppDomains: Set<string>;
  impExact: Set<string>;
  impDomains: Set<string>;
  agencyExact: Set<string>;
  agencyDomains: Set<string>;
  autocloseExact: Set<string>;
  autocloseDomains: Set<string>;
  impLabelId: string | null;
  internalDomain: string;
}

export interface RouteResult {
  route: Route;
  messageId: string;
  threadId: string;
  from?: string;
  subject?: string;
  plain?: string;
  hasImpTag?: boolean;
  labelIds?: string[];
}
