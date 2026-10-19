import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";

import { SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { MenuPageOutputSchema, MenuPageSchema, repairPage, type MenuPageOutput } from "@/lib/ai/schema";
import { ITALIAN_PAGE, PAN_ASIAN_PAGE_1, PAN_ASIAN_PAGE_2 } from "@/lib/mock/fixtures";

/** Default per the spec; set ANTHROPIC_MODEL=claude-haiku-5-5 for a cheaper, faster read. */
export const MODEL = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-5-5";

export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp";

export type AnalyzeResult = {
  page: MenuPageOutput;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

/** A failure the diner should read (shown on the page card). */
export class AnalyzeError extends Error {
  constructor(
    message: string,
    readonly status = 422,
  ) {
    super(message);
    this.name = "AnalyzeError";
  }
}

export function aiMode(): "mock" | "ai" | "off" {
  if (process.env.AI_MOCK === "true") return "mock";
  return process.env.ANTHROPIC_API_KEY ? "ai" : "off";
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  // One request per page; give a slow page room but stay inside the route's 60 s.
  client ??= new Anthropic({ timeout: 55_000, maxRetries: 1 });
  return client;
}

function describeIssues(error: { issues: { path: PropertyKey[]; message: string }[] }): string {
  return error.issues
    .slice(0, 12)
    .map((issue) => `${issue.path.map(String).join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

export async function analyzeMenuPage(input: {
  data: string; // base64
  mediaType: ImageMediaType;
  index: number;
  count: number;
}): Promise<AnalyzeResult> {
  if (aiMode() === "mock") return mockPage(input.index);

  const userContent: Anthropic.Beta.BetaContentBlockParam[] = [
    { type: "image", source: { type: "base64", media_type: input.mediaType, data: input.data } },
    { type: "text", text: `Menu page ${input.index + 1} of ${input.count}. Decode every dish.` },
  ];

  let inputTokens = 0;
  let outputTokens = 0;
  let feedback: string | null = null;

  // One retry, with the validation errors appended (spec §6.4).
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const content = feedback
      ? [...userContent, { type: "text" as const, text: `Your previous answer failed validation. Fix these and answer again:\n${feedback}` }]
      : userContent;

    // `create` (not `parse`) so stop_reason is checked before any parsing:
    // a truncated or declined reply must not be mistaken for a schema miss.
    const response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // Menus are benign, but if a safety classifier ever declines, re-run on
      // Anthropic's recommended fallback model instead of failing the page.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      output_config: { effort: "low", format: betaZodOutputFormat(MenuPageOutputSchema) },
      messages: [{ role: "user", content }],
    });

    inputTokens +=
      response.usage.input_tokens + (response.usage.cache_read_input_tokens ?? 0) + (response.usage.cache_creation_input_tokens ?? 0);
    outputTokens += response.usage.output_tokens;

    if (response.stop_reason === "max_tokens") {
      throw new AnalyzeError("This page is too dense — shoot it in two halves.");
    }
    if (response.stop_reason === "refusal") {
      throw new AnalyzeError("The AI couldn't read this photo. Try a different shot of the menu.");
    }

    const text = response.content.find((block) => block.type === "text");
    let json: unknown;
    try {
      json = text?.type === "text" ? JSON.parse(text.text) : null;
    } catch {
      json = null;
    }
    const shaped = MenuPageOutputSchema.safeParse(json);
    if (!shaped.success) {
      feedback = "Your answer was not valid JSON for the response schema. Follow the schema exactly.";
      continue;
    }

    const checked = MenuPageSchema.safeParse(repairPage(shaped.data));
    if (checked.success) {
      return { page: checked.data, model: response.model, inputTokens, outputTokens };
    }
    feedback = describeIssues(checked.error);
  }

  throw new AnalyzeError("The AI's answer for this page didn't check out. Try this page again.");
}

/** AI_MOCK=true: fixtures after 1.5 s, no API calls (spec §6.4). */
async function mockPage(index: number): Promise<AnalyzeResult> {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const pages = [PAN_ASIAN_PAGE_1, PAN_ASIAN_PAGE_2, ITALIAN_PAGE];
  const page = MenuPageSchema.parse(pages[index % pages.length]);
  return { page, model: "mock", inputTokens: 0, outputTokens: 0 };
}
