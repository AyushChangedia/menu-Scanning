import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";

import { SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { MenuPageOutputSchema } from "@/lib/ai/schema";
import {
  AnalyzeError,
  DECLINED,
  DIDNT_CHECK_OUT,
  ProviderError,
  TOO_DENSE,
  finishPage,
  retryNote,
  type AnalyzeInput,
  type AnalyzeResult,
} from "@/lib/ai/shared";

/** Paid alternative to OpenRouter. Default per the spec; claude-haiku-5-5 is cheaper and faster. */
export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-5-5";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  // One request per page; give a slow page room but stay inside the route's limit.
  client ??= new Anthropic({ timeout: 55_000, maxRetries: 1 });
  return client;
}

export async function readWithClaude(input: AnalyzeInput): Promise<AnalyzeResult> {
  try {
    return await read(input);
  } catch (error) {
    throw toProviderError(error);
  }
}

async function read(input: AnalyzeInput): Promise<AnalyzeResult> {
  const userContent: Anthropic.Beta.BetaContentBlockParam[] = [
    { type: "image", source: { type: "base64", media_type: input.mediaType, data: input.data } },
    { type: "text", text: `Menu page ${input.index + 1} of ${input.count}. Decode every dish.` },
  ];

  let inputTokens = 0;
  let outputTokens = 0;
  let feedback: string | null = null;

  // One retry, with the validation errors appended (spec §6.4).
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const content = feedback ? [...userContent, { type: "text" as const, text: retryNote(feedback) }] : userContent;

    // `create` (not `parse`) so stop_reason is checked before any parsing:
    // a truncated or declined reply must not be mistaken for a schema miss.
    const response = await getClient().beta.messages.create({
      model: CLAUDE_MODEL,
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

    if (response.stop_reason === "max_tokens") throw new AnalyzeError(TOO_DENSE);
    if (response.stop_reason === "refusal") throw new AnalyzeError(DECLINED);

    const text = response.content.find((block) => block.type === "text");
    let json: unknown = null;
    try {
      json = text?.type === "text" ? JSON.parse(text.text) : null;
    } catch {
      // handled by finishPage
    }
    const result = finishPage(json);
    if (result.ok) return { page: result.page, model: response.model, inputTokens, outputTokens };
    feedback = result.feedback;
  }

  throw new AnalyzeError(DIDNT_CHECK_OUT);
}

function toProviderError(error: unknown): unknown {
  if (error instanceof AnalyzeError) return error;
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    console.error("[scan] Anthropic rejected the API key:", error.message);
    return new ProviderError("The AI key on the server isn't working. Check ANTHROPIC_API_KEY in Vercel.", 500, "ai_key");
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new ProviderError("Too many menus at once. Wait a minute and retry this page.", 429, "busy");
  }
  if (error instanceof Anthropic.BadRequestError) {
    console.error("[scan] Bad request to Anthropic:", error.message);
    return new ProviderError("The AI couldn't read this photo. Try a sharper, straight-on shot.", 502, "unreadable");
  }
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return new ProviderError("This page took too long. Retry, or shoot it in two halves.", 504, "timeout");
  }
  if (error instanceof Anthropic.APIError) {
    console.error(`[scan] Anthropic error ${error.status}:`, error.message);
    return new ProviderError("The AI is busy right now. Retry this page in a moment.", 503, "busy");
  }
  return error;
}
