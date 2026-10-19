import { coercePage, extractJson } from "@/lib/ai/coerce";
import { JSON_PROMPT } from "@/lib/ai/prompt";
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

/**
 * Free menu reading through OpenRouter (https://openrouter.ai).
 *
 * "openrouter/free" routes each request to whichever free model can read
 * images right now, so no model ID goes stale. Free models cost nothing; the
 * account is limited to about 50 requests a day (20 a minute).
 */
export const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL?.trim() || "openrouter/free";
const CUSTOM_MODEL = Boolean(process.env.OPENROUTER_MODEL?.trim());

// Overridable so tests can point at a local fake.
const BASE_URL = (process.env.OPENROUTER_BASE_URL?.trim() || "https://openrouter.ai/api/v1").replace(/\/+$/, "");

/** Whole-page budget, inside the route's maxDuration. Free models can be slow. */
const BUDGET_MS = 110_000;
/** Don't start the retry unless it has a fair chance to finish. */
const RETRY_MIN_MS = 30_000;

type Choice = {
  finish_reason?: string | null;
  message?: { content?: string | { type?: string; text?: string }[] | null; refusal?: string | null };
  error?: { code?: number | string; message?: string };
};

type Completion = {
  model?: string;
  choices?: Choice[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { code?: number | string; message?: string; metadata?: { headers?: Record<string, string> } };
};

function replyText(content: NonNullable<Choice["message"]>["content"]): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => part?.text ?? "").join("");
  return "";
}

export async function readWithOpenRouter(input: AnalyzeInput, options: { referer?: string } = {}): Promise<AnalyzeResult> {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) throw new ProviderError("Menu reading isn't switched on yet. Add OPENROUTER_API_KEY in Vercel.", 503, "ai_off");

  const prompt = `Menu page ${input.index + 1} of ${input.count}. Decode every dish.`;
  const image = { type: "image_url", image_url: { url: `data:${input.mediaType};base64,${input.data}` } };
  const deadline = Date.now() + BUDGET_MS;

  let inputTokens = 0;
  let outputTokens = 0;
  let feedback: string | null = null;

  // One retry, with what went wrong (spec §6.4). The router may also pick a
  // different free model the second time.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (attempt > 0 && deadline - Date.now() < RETRY_MIN_MS) break;

    const text = feedback ? `${prompt}\n\n${retryNote(feedback)}` : prompt;
    const body = await post(
      key,
      {
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: JSON_PROMPT },
          { role: "user", content: [{ type: "text", text }, image] },
        ],
        max_tokens: 8192,
        temperature: 0.2,
      },
      deadline - Date.now(),
      options.referer,
    );

    inputTokens += body.usage?.prompt_tokens ?? 0;
    outputTokens += body.usage?.completion_tokens ?? 0;

    const choice = body.choices?.[0];
    if (choice?.error) throw fromApiError(Number(choice.error.code) || 502, choice.error.message ?? "", undefined);
    if (!choice) throw new ProviderError("The free AI didn't answer. Retry this page in a moment.", 503, "busy");
    if (choice.finish_reason === "length") throw new AnalyzeError(TOO_DENSE);
    if (choice.finish_reason === "content_filter" || choice.message?.refusal) throw new AnalyzeError(DECLINED);

    const json = extractJson(replyText(choice.message?.content));
    if (json === undefined) {
      feedback = "Your answer was not a JSON object. Reply with only the JSON object described in the instructions.";
      continue;
    }
    const result = finishPage(coercePage(json));
    if (result.ok) {
      return { page: result.page, model: body.model ?? OPENROUTER_MODEL, inputTokens, outputTokens };
    }
    feedback = result.feedback;
  }

  throw new AnalyzeError(DIDNT_CHECK_OUT);
}

async function post(key: string, payload: unknown, timeoutMs: number, referer?: string): Promise<Completion> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        // Optional; shows the app's name on openrouter.ai activity pages.
        ...(referer ? { "HTTP-Referer": referer } : {}),
        "X-Title": "Forkcast",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(Math.max(1_000, timeoutMs)),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new ProviderError("This page took too long. Retry, or shoot it in two halves.", 504, "timeout");
    }
    console.error("[scan] Couldn't reach OpenRouter:", error);
    throw new ProviderError("Couldn't reach the AI service. Retry this page in a moment.", 503, "busy");
  }

  let body: Completion = {};
  try {
    body = (await response.json()) as Completion;
  } catch {
    // handled below
  }
  if (!response.ok || body.error) {
    throw fromApiError(response.ok ? Number(body.error?.code) || 502 : response.status, body.error?.message ?? "", body.error?.metadata?.headers);
  }
  return body;
}

function resetTime(headers?: Record<string, string>): string | null {
  const reset = Number(headers?.["X-RateLimit-Reset"] ?? headers?.["x-ratelimit-reset"]);
  if (!Number.isFinite(reset) || reset <= 0) return null;
  const at = new Date(reset < 1e12 ? reset * 1000 : reset);
  return at.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

function fromApiError(status: number, message: string, headers?: Record<string, string>): ProviderError {
  console.error(`[scan] OpenRouter error ${status}:`, message);
  if (status === 401) {
    return new ProviderError("The OpenRouter key on the server isn't working. Check OPENROUTER_API_KEY in Vercel.", 500, "ai_key");
  }
  if (status === 402) {
    return new ProviderError(
      CUSTOM_MODEL
        ? "OpenRouter wants credits for this model. Use a free model (its ID ends in :free) or remove OPENROUTER_MODEL."
        : "OpenRouter refused the request for credits. Check your OpenRouter balance isn't below zero.",
      402,
      "ai_credits",
    );
  }
  if (status === 429) {
    if (/per[-_ ]?day|daily/i.test(message)) {
      const time = resetTime(headers);
      return new ProviderError(
        `Today's free menu reads are used up.${time ? ` They come back at ${time}.` : " They come back tomorrow."}`,
        429,
        "daily_limit",
      );
    }
    return new ProviderError("The free AI is busy. Wait a minute and retry this page.", 429, "busy");
  }
  if (status === 404) {
    return new ProviderError(
      CUSTOM_MODEL
        ? "The model in OPENROUTER_MODEL isn't available or can't read photos. Remove it to use any free model."
        : "No free AI model that reads photos is available right now. Retry this page later.",
      CUSTOM_MODEL ? 500 : 503,
      CUSTOM_MODEL ? "ai_model" : "busy",
    );
  }
  if (status === 400 || status === 403 || status === 413) {
    return new ProviderError("The AI couldn't read this photo. Try a sharper, straight-on shot.", 502, "unreadable");
  }
  if (status === 408 || status === 504) {
    return new ProviderError("This page took too long. Retry, or shoot it in two halves.", 504, "timeout");
  }
  return new ProviderError("The free AI is busy right now. Retry this page in a moment.", 503, "busy");
}
