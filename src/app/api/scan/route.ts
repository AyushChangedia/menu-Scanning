import { AnalyzeError, ProviderError, aiMode, aiModel, analyzeMenuPage, type ImageMediaType } from "@/lib/ai/analyzeMenuPage";

/**
 * Reads one menu page with AI: free models on OpenRouter (OPENROUTER_API_KEY),
 * or Claude (ANTHROPIC_API_KEY).
 *
 *   GET  /api/scan  → whether AI reading is switched on (no secrets).
 *   POST /api/scan  → multipart { image, index, count } → { ok, page, model, usage }
 *
 * Stateless: the app keeps scans on the device, so nothing is stored here.
 * The photo is used for this one request and never saved.
 */

export const runtime = "nodejs";
export const maxDuration = 120; // free models can be slow on a dense page
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
    { ai: mode !== "off", mock: mode === "mock", inviteRequired: Boolean(inviteCode()), model: mode === "ai" ? aiModel() : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const mode = aiMode();
  if (mode === "off") {
    return fail(503, "ai_off", "Menu reading isn't switched on yet. Add OPENROUTER_API_KEY in Vercel.");
  }

  // A shared invite code keeps strangers from using up your AI quota.
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
    const result = await analyzeMenuPage(
      { data, mediaType: image.type as ImageMediaType, index, count },
      { referer: new URL(request.url).origin },
    );
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
    if (error instanceof ProviderError) return fail(error.status, error.code, error.message);
    console.error("[scan] Unexpected failure:", error);
    return fail(500, "unknown", "Something went wrong reading this page. Retry it.");
  }
}
