/**
 * Talks to /api/scan from the browser.
 */

import { readJSON, writeJSON } from "@/lib/storage";
import type { MenuPage } from "@/lib/types";

export type ServerStatus = { ai: boolean; mock: boolean; inviteRequired: boolean; model: string | null };

export const OFFLINE_STATUS: ServerStatus = { ai: false, mock: false, inviteRequired: false, model: null };

/** Null when there's no server to ask (e.g. the single-file preview). */
export async function fetchServerStatus(): Promise<ServerStatus | null> {
  try {
    const response = await fetch("/api/scan", { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as ServerStatus;
  } catch {
    return null;
  }
}

export class ScanRequestError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "ScanRequestError";
  }
}

export type PageResult = { page: MenuPage; model: string; inputTokens: number; outputTokens: number };

export async function analyzePage(input: {
  image: Blob;
  index: number;
  count: number;
  invite: string | null;
}): Promise<PageResult> {
  const form = new FormData();
  form.append("image", input.image, `page-${input.index + 1}.jpg`);
  form.append("index", String(input.index));
  form.append("count", String(input.count));

  let response: Response;
  try {
    response = await fetch("/api/scan", {
      method: "POST",
      body: form,
      headers: input.invite ? { "x-forkcast-invite": input.invite } : undefined,
    });
  } catch {
    throw new ScanRequestError("No connection. Retry this page when you're back online.", "offline");
  }

  let body: { ok?: boolean; error?: string; code?: string; page?: MenuPage; model?: string; usage?: { inputTokens: number; outputTokens: number } } = {};
  try {
    body = await response.json();
  } catch {
    // Vercel's own timeout page isn't JSON.
    if (response.status === 504) throw new ScanRequestError("This page took too long. Retry, or shoot it in two halves.", "timeout");
  }

  if (!response.ok || !body.ok || !body.page) {
    throw new ScanRequestError(body.error ?? "Couldn't read this page. Retry it.", body.code ?? "unknown");
  }
  return {
    page: body.page,
    model: body.model ?? "unknown",
    inputTokens: body.usage?.inputTokens ?? 0,
    outputTokens: body.usage?.outputTokens ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Same photo, same answer: results are cached on the device by image hash, so
// re-uploading a page costs no API call (spec §6.1).
// ---------------------------------------------------------------------------

const CACHE_KEY = "forkcast:page-cache:v1";
const CACHE_LIMIT = 40;

type CacheEntry = { page: MenuPage; model: string; at: number };

export function cachedPage(hash: string): CacheEntry | null {
  return readJSON<Record<string, CacheEntry>>(CACHE_KEY)?.[hash] ?? null;
}

export function cachePage(hash: string, page: MenuPage, model: string): void {
  const cache = readJSON<Record<string, CacheEntry>>(CACHE_KEY) ?? {};
  cache[hash] = { page, model, at: Date.now() };
  const newest = Object.entries(cache)
    .sort((a, b) => b[1].at - a[1].at)
    .slice(0, CACHE_LIMIT);
  writeJSON(CACHE_KEY, Object.fromEntries(newest));
}

const INVITE_KEY = "forkcast:invite:v1";

export function readInvite(): string | null {
  return readJSON<string>(INVITE_KEY);
}

export function writeInvite(code: string): void {
  writeJSON(INVITE_KEY, code.trim());
}
