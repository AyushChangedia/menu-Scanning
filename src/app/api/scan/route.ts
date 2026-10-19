import Anthropic from "@anthropic-ai/sdk";

import { AnalyzeError, MODEL, aiMode, analyzeMenuPage, type ImageMediaType } from "@/lib/ai/analyzeMenuPage";

/**
 * Reads one menu page with Claude.
 *
 *   GET  /api/scan  → whether AI reading is switched on (no secrets).
 *   POST /api/scan  → multipart { image, index, count } → { ok, page, model, usage }
 *
 * Stateless: the app keeps scans on the device, so nothing is stored here.
 * The photo is used for this one request and never saved.
 */

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024; // Vercel's request limit is 4.5 MB
const TYPES: ImageMediaType[] = ["image/jpeg", "image/png", "image/webp"];

function inviteCode(): string | null {
  return process.env.INVITE_CODE?.trim() || null;
}

function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function fail(status: number, code: string, error: string) {
  return Response.json({ ok: false, code, error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  const mode = aiMode();
  return Response.json(
    { ai: mode !== "off", mock: mode === "mock", inviteRequired: Boolean(inviteCode()), model: mode === "ai" ? MODEL : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const mode = aiMode();
  if (mode === "off") {
    return fail(503, "ai_off", "Menu reading isn't switched on yet. Add ANTHROPIC_API_KEY in Vercel.");
  }

  // A shared invite code keeps strangers from spending your AI credits.
  const expected = inviteCode();
  if (expected) {
    const given = request.headers.get("x-forkcast-invite")?.trim() ?? "";
    if (!sameText(given, expected)) return fail(401, "invite_required", "Enter the invite code to scan menus.");
  }

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES + 64 * 1024) return fail(413, "too_large", "That photo is too large. Try a screenshot or a smaller photo.");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "bad_request", "That upload didn't come through. Try again.");
  }

  const image = form.get("image");
  const index = Number(form.get("index"));
  const count = Number(form.get("count"));
  if (!(image instanceof File)) return fail(400, "bad_request", "No photo was attached.");
  if (!TYPES.includes(image.type as ImageMediaType)) {
    return fail(415, "bad_type", "Couldn't read this photo format — try a JPEG or a screenshot.");
  }
  if (image.size > MAX_BYTES) return fail(413, "too_large", "That photo is too large. Try a screenshot or a smaller photo.");
  if (!Number.isInteger(index) || !Number.isInteger(count) || index < 0 || count < 1 || count > 6 || index >= count) {
    return fail(400, "bad_request", "Up to 6 pages per scan.");
  }

  try {
    const data = Buffer.from(await image.arrayBuffer()).toString("base64");
    const result = await analyzeMenuPage({ data, mediaType: image.type as ImageMediaType, index, count });
    return Response.json(
      {
        ok: true,
        page: result.page,
        model: result.model,
        usage: { inputTokens: result.inputTokens, outputTokens: result.outputTokens },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof AnalyzeError) return fail(error.status, "unreadable", error.message);
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      console.error("[scan] Anthropic rejected the API key:", error.message);
      return fail(500, "ai_key", "The AI key on the server isn't working. Check ANTHROPIC_API_KEY in Vercel.");
    }
    if (error instanceof Anthropic.RateLimitError) {
      return fail(429, "busy", "Too many menus at once. Wait a minute and retry this page.");
    }
    if (error instanceof Anthropic.BadRequestError) {
      console.error("[scan] Bad request to Anthropic:", error.message);
      return fail(502, "unreadable", "The AI couldn't read this photo. Try a sharper, straight-on shot.");
    }
    if (error instanceof Anthropic.APIConnectionTimeoutError) {
      return fail(504, "timeout", "This page took too long. Retry, or shoot it in two halves.");
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`[scan] Anthropic error ${error.status}:`, error.message);
      return fail(503, "busy", "The AI is busy right now. Retry this page in a moment.");
    }
    console.error("[scan] Unexpected failure:", error);
    return fail(500, "unknown", "Something went wrong reading this page. Retry it.");
  }
}
