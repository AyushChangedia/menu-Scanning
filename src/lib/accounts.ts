/**
 * Email + password accounts kept on this device.
 *
 * Passwords are never stored: only a salted PBKDF2-SHA-256 hash. Pure
 * functions here; the React state lives in providers/app-state.tsx.
 */

export type Account = {
  id: string;
  name: string;
  email: string;
  salt: string;
  hash: string;
  createdAt: string;
};

export type PublicAccount = Pick<Account, "id" | "name" | "email" | "createdAt">;

export const PBKDF2_ITERATIONS = 150_000;

export function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function emailIssue(value: string): string | null {
  const email = normaliseEmail(value);
  if (!email) return "Enter your email";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return "Enter a valid email";
  return null;
}

export function nameIssue(value: string): string | null {
  const name = value.trim();
  if (name.length < 2) return "Enter your name";
  if (name.length > 60) return "Keep your name under 60 characters";
  return null;
}

/** Same rules as FluxFin: 8–72 characters with a lowercase, an uppercase and a number. */
export function passwordIssue(value: string): string | null {
  if (value.length < 8) return "Use at least 8 characters";
  if (value.length > 72) return "Passwords are limited to 72 characters";
  if (!/[a-z]/.test(value)) return "Include a lowercase letter";
  if (!/[A-Z]/.test(value)) return "Include an uppercase letter";
  if (!/[0-9]/.test(value)) return "Include a number";
  return null;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function subtle(): SubtleCrypto {
  const api = globalThis.crypto?.subtle;
  if (!api) throw new Error("This browser can't create secure passwords here. Open the app over https.");
  return api;
}

async function derive(password: string, salt: Uint8Array, iterations = PBKDF2_ITERATIONS): Promise<string> {
  const key = await subtle().importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await subtle().deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

export async function hashPassword(password: string): Promise<{ salt: string; hash: string }> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  return { salt: toBase64(salt), hash: await derive(password, salt) };
}

export async function verifyPassword(password: string, salt: string, hash: string): Promise<boolean> {
  const candidate = await derive(password, fromBase64(salt));
  // Compare every character so timing doesn't hint at how close a guess was.
  if (candidate.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i += 1) diff |= candidate.charCodeAt(i) ^ hash.charCodeAt(i);
  return diff === 0;
}

export function newId(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(9));
  return `acc_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export function toPublic(account: Account): PublicAccount {
  return { id: account.id, name: account.name, email: account.email, createdAt: account.createdAt };
}

/** Pages scanned today, India time — the daily allowance resets at IST midnight. */
export function istDay(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}
