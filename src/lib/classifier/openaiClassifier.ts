import { requireSecret } from "@/lib/secrets";
import {
  FOUR_WAY_CATEGORIES,
  TWO_WAY_CATEGORIES,
  FOUR_WAY_INPUT_TEMPLATE,
  TWO_WAY_INPUT_TEMPLATE,
} from "./prompts";
import type { Classifier, ClassifyInput, ClassifyResult, FourWayCategory, TwoWayCategory } from "./types";

const OPENAI_MODEL = "gpt-5"; // same model the original n8n workflow used

function fillTemplate(template: string, input: ClassifyInput): string {
  return template
    .replace("{sender}", input.sender)
    .replace("{subject}", input.subject)
    .replace("{body}", input.body)
    .replace("{from}", input.from);
}

function buildSystemPrompt(categories: readonly { category: string; description: string }[]): string {
  return (
    "Classify the email into exactly one of these categories. These descriptions are the complete " +
    "definition of each category -- there is no other guidance.\n\n" +
    categories.map((c) => `${c.category}: ${c.description}`).join("\n\n")
  );
}

async function callOpenAi(
  apiKey: string,
  systemPrompt: string,
  userInput: string,
  categoryNames: readonly string[]
): Promise<{ category: string; reason: string }> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userInput },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "email_classification",
          strict: true,
          schema: {
            type: "object",
            properties: {
              category: { type: "string", enum: categoryNames },
              reason: { type: "string", description: "One sentence explaining the classification." },
            },
            required: ["category", "reason"],
            additionalProperties: false,
          },
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI classification request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI response had no content to parse");
  return JSON.parse(content);
}

// Real classifier backed by the OpenAI API, using the OPENAI_API_KEY stored
// via the Command Center (see src/lib/secrets.ts) or an env var of the same
// name. Category descriptions are the exact source prompts from the
// original n8n workflow (see prompts.ts) -- nothing added or reworded.
export class OpenAiClassifier implements Classifier {
  async classifyFourWay(input: ClassifyInput): Promise<ClassifyResult<FourWayCategory>> {
    const apiKey = await requireSecret("OPENAI_API_KEY");
    const systemPrompt = buildSystemPrompt(FOUR_WAY_CATEGORIES);
    const userInput = fillTemplate(FOUR_WAY_INPUT_TEMPLATE, input);
    const categoryNames = FOUR_WAY_CATEGORIES.map((c) => c.category);
    const result = await callOpenAi(apiKey, systemPrompt, userInput, categoryNames);
    return { category: result.category as FourWayCategory, reason: result.reason };
  }

  async classifyTwoWay(input: ClassifyInput): Promise<ClassifyResult<TwoWayCategory>> {
    const apiKey = await requireSecret("OPENAI_API_KEY");
    const systemPrompt = buildSystemPrompt(TWO_WAY_CATEGORIES);
    const userInput = fillTemplate(TWO_WAY_INPUT_TEMPLATE, input);
    const categoryNames = TWO_WAY_CATEGORIES.map((c) => c.category);
    const result = await callOpenAi(apiKey, systemPrompt, userInput, categoryNames);
    return { category: result.category as TwoWayCategory, reason: result.reason };
  }
}
