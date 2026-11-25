import { isSecretSet } from "@/lib/secrets";
import { MockClassifier } from "./mockClassifier";
import { OpenAiClassifier } from "./openaiClassifier";
import type { Classifier } from "./types";

export * from "./types";
export { FOUR_WAY_CATEGORIES, TWO_WAY_CATEGORIES } from "./prompts";

// Automatically uses the real OpenAI classifier once OPENAI_API_KEY is
// configured (Command Center or env var) -- no separate mode flag to flip.
// Falls back to the deterministic mock so the pipeline still works with
// zero credentials.
export async function getClassifier(): Promise<Classifier> {
  return (await isSecretSet("OPENAI_API_KEY")) ? new OpenAiClassifier() : new MockClassifier();
}
