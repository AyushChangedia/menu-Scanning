import { MenuPageOutputSchema, MenuPageSchema, repairPage, type MenuPageOutput } from "@/lib/ai/schema";

export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp";

export type AnalyzeInput = {
  data: string; // base64
  mediaType: ImageMediaType;
  index: number;
  count: number;
};

export type AnalyzeResult = {
  page: MenuPageOutput;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

/** The AI answered, but the answer can't be used. Shown on the page card. */
export class AnalyzeError extends Error {
  constructor(
    message: string,
    readonly status = 422,
  ) {
    super(message);
    this.name = "AnalyzeError";
  }
}

/** The AI service refused or failed. `code` is what the app keys its UI on. */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export const TOO_DENSE = "This page is too dense — shoot it in two halves.";
export const DECLINED = "The AI couldn't read this photo. Try a different shot of the menu.";
export const DIDNT_CHECK_OUT = "The AI's answer for this page didn't check out. Try this page again.";

function describeIssues(error: { issues: { path: PropertyKey[]; message: string }[] }): string {
  return error.issues
    .slice(0, 12)
    .map((issue) => `${issue.path.map(String).join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

/**
 * Shape check → small repairs → strict check (spec §6.4). On failure, returns
 * the feedback to send back for the one retry.
 */
export function finishPage(json: unknown): { ok: true; page: MenuPageOutput } | { ok: false; feedback: string } {
  const shaped = MenuPageOutputSchema.safeParse(json);
  if (!shaped.success) {
    return { ok: false, feedback: `Your answer didn't match the required JSON format:\n${describeIssues(shaped.error)}` };
  }
  const checked = MenuPageSchema.safeParse(repairPage(shaped.data));
  if (checked.success) return { ok: true, page: checked.data };
  return { ok: false, feedback: describeIssues(checked.error) };
}

export function retryNote(feedback: string): string {
  return `Your previous answer failed validation. Fix these and answer again:\n${feedback}`;
}
