import { CLAUDE_MODEL, readWithClaude } from "@/lib/ai/anthropic";
import { OPENROUTER_MODEL, readWithOpenRouter } from "@/lib/ai/openrouter";
import { MenuPageSchema } from "@/lib/ai/schema";
import type { AnalyzeInput, AnalyzeResult } from "@/lib/ai/shared";
import { ITALIAN_PAGE, PAN_ASIAN_PAGE_1, PAN_ASIAN_PAGE_2 } from "@/lib/mock/fixtures";

export { AnalyzeError, ProviderError, type ImageMediaType } from "@/lib/ai/shared";

export type Provider = "openrouter" | "anthropic";

/** OpenRouter (free) wins when both keys are set. */
export function aiProvider(): Provider | null {
  if (process.env.OPENROUTER_API_KEY?.trim()) return "openrouter";
  if (process.env.ANTHROPIC_API_KEY?.trim()) return "anthropic";
  return null;
}

export function aiMode(): "mock" | "ai" | "off" {
  if (process.env.AI_MOCK === "true") return "mock";
  return aiProvider() ? "ai" : "off";
}

export function aiModel(): string | null {
  const provider = aiProvider();
  if (provider === "openrouter") return OPENROUTER_MODEL;
  if (provider === "anthropic") return CLAUDE_MODEL;
  return null;
}

export async function analyzeMenuPage(input: AnalyzeInput, options: { referer?: string } = {}): Promise<AnalyzeResult> {
  if (aiMode() === "mock") return mockPage(input.index);
  return aiProvider() === "openrouter" ? readWithOpenRouter(input, options) : readWithClaude(input);
}

/** AI_MOCK=true: fixtures after 1.5 s, no API calls (spec §6.4). */
async function mockPage(index: number): Promise<AnalyzeResult> {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const pages = [PAN_ASIAN_PAGE_1, PAN_ASIAN_PAGE_2, ITALIAN_PAGE];
  const page = MenuPageSchema.parse(pages[index % pages.length]);
  return { page, model: "mock", inputTokens: 0, outputTokens: 0 };
}
