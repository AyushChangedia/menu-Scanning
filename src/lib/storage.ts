/**
 * localStorage with an in-memory fallback.
 *
 * Some places block storage (private windows, sandboxed previews). There the
 * app keeps working for the visit and simply forgets on reload.
 */

type KV = { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void };

const memory = new Map<string, string>();
const memoryStore: KV = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => void memory.set(key, value),
  removeItem: (key) => void memory.delete(key),
};

let resolved: KV | null = null;
let persistent = false;

function store(): KV {
  if (resolved) return resolved;
  try {
    const probe = "__forkcast_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    resolved = window.localStorage;
    persistent = true;
  } catch {
    resolved = memoryStore;
    persistent = false;
  }
  return resolved;
}

/** True when data survives a reload on this device. */
export function storageIsPersistent(): boolean {
  store();
  return persistent;
}

export function readJSON<T>(key: string): T | null {
  try {
    const raw = store().getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

export function writeJSON(key: string, value: unknown): boolean {
  try {
    store().setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // Quota exceeded or blocked mid-session: keep the app running.
    return false;
  }
}

export function removeKey(key: string): void {
  try {
    store().removeItem(key);
  } catch {
    // Nothing to do.
  }
}
