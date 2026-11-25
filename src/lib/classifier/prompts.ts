// Transcribed verbatim from the "Text Classifier" / "Text Classifier1" nodes
// in the original n8n export. These category descriptions ARE the full
// prompt sent to gpt-5 -- there was no separate system prompt. Typos (e.g.
// "managaement", "speciifc") are preserved intentionally: they're what the
// live classifier actually saw, and silently "fixing" them would change
// classifier behavior in a way nobody asked for.

export const FOUR_WAY_CATEGORIES = [
  {
    category: "GOOD_OPPORTUNITY",
    description:
      "A credible, personalized brand outreach email — from a real company or PR agency wanting to sponsor or collaborate with a specific creator. May come from any domain including gmail.com (some legitimate Chinese brands use gmail). Shows genuine interest in the creator's content or audience.",
  },
  {
    category: "IMP_OUTREACH",
    description:
      "Email sent via a Chinese influencer marketing platform (e.g. domain contains kols, noxinfluencer, tomoson, parklu, or similar). Or a mass-blast from a Chinese brand using such a platform. If the sender appears to be a third-party agency (not the brand itself), note that in the reason field. ",
  },
  {
    category: "SPAM",
    description:
      "Unsolicited service pitches — video editors, thumbnail designers, SEO agencies, or any freelancer offering to work for the creator. Also includes mass cold outreach with no relevance to brand partnerships.",
  },
  {
    category: "NOISE",
    description:
      "Personal email forwarded from a creator's inbox — subscriptions (Netflix, Spotify), bank alerts, food delivery receipts, social media notifications, or any non-business email unrelated to brand deals.",
  },
] as const;

export const TWO_WAY_CATEGORIES = [
  {
    category: "realOpportunity",
    description: "company is looking for rates on a brand deal with creator",
  },
  {
    category: "spam",
    description:
      "company is looking to offer managaement services or other services unrelated to a speciifc brand opportunity",
  },
] as const;

export const FOUR_WAY_INPUT_TEMPLATE =
  "sender:{sender}\nsubject:{subject}\nMessage:{body}\nfrom: {from}";
export const TWO_WAY_INPUT_TEMPLATE = "sender:{sender}\nsubject:{subject}\nMessage:{body}";
