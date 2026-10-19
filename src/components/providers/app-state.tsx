"use client";

import * as React from "react";

import {
  emailIssue,
  hashPassword,
  istDay,
  nameIssue,
  newId,
  normaliseEmail,
  passwordIssue,
  toPublic,
  verifyPassword,
  type Account,
  type PublicAccount,
} from "@/lib/accounts";
import { LIVE_SCAN_PAGES } from "@/lib/mock/fixtures";
import { DAILY_PAGE_LIMIT, EMPTY_PREFS, uniqueCuisines } from "@/lib/mock/data";
import { mergeDuplicates, toDishes } from "@/lib/merge";
import { compressForUpload, sha256Hex } from "@/lib/image";
import {
  OFFLINE_STATUS,
  ScanRequestError,
  analyzePage,
  cachePage,
  cachedPage,
  fetchServerStatus,
  readInvite,
  writeInvite,
  type ServerStatus,
} from "@/lib/scan-client";
import { readJSON, removeKey, storageIsPersistent, writeJSON } from "@/lib/storage";
import { sleep } from "@/lib/utils";
import type { Dish, Feedback, MenuPage, Scan, ScanPageState, TastePreference } from "@/lib/types";

/**
 * Front-end state. Accounts (email + hashed password), each account's taste,
 * ratings and scans are kept on this device. Menu photos are read by Claude
 * through /api/scan; when the server has no AI key, scans use clearly
 * labelled sample menus instead.
 */

export type DraftPage = { id: string; file: File; preview: string };
export type AuthResult = { ok: true } | { ok: false; error: string; field?: string };

type AccountData = { prefs: TastePreference; feedback: Feedback[]; onboarded: boolean; scans: Scan[] };

type AppState = {
  status: "loading" | "signed-out" | "signed-in";
  account: PublicAccount | null;
  persistent: boolean;
  signUp: (input: { name: string; email: string; password: string }) => Promise<AuthResult>;
  signIn: (input: { email: string; password: string }) => Promise<AuthResult>;
  signOut: () => void;
  updateName: (name: string) => AuthResult;
  changePassword: (current: string, next: string) => Promise<AuthResult>;
  resetPassword: (email: string, next: string) => Promise<AuthResult>;
  deleteAccount: () => void;

  onboarded: boolean;
  setOnboarded: (value: boolean) => void;
  prefs: TastePreference;
  setPrefs: (update: TastePreference | ((prev: TastePreference) => TastePreference)) => void;
  feedback: Feedback[];
  rateDish: (dish: Dish, verdict: 1 | -1) => void;
  removeFeedback: (slug: string) => void;
  scans: Scan[];
  renameScan: (id: string, name: string) => void;
  deleteScan: (id: string) => () => void;
  draft: DraftPage[];
  addDraft: (pages: DraftPage[]) => void;
  removeDraft: (id: string) => void;
  startScan: () => string | null;
  retryPage: (scanId: string, index: number) => void;
  usage: { used: number; limit: number };
  /** Null until the server has answered. */
  server: ServerStatus | null;
  invite: string | null;
  setInvite: (code: string) => void;
};

type PageOutcome =
  | { kind: "pending" }
  | { kind: "failed"; error: string; code?: string }
  | { kind: "done"; page: MenuPage; model?: string; inputTokens?: number; outputTokens?: number };

/** Compressed photos kept for this visit, so a failed page can be retried. */
const uploads = new Map<string, Blob>();

/** Recomputes a scan's name, cuisines and status from its pages. */
function summarise(scan: Scan): Scan {
  const pending = scan.pages.some((page) => page.status === "pending");
  const printedName = [...scan.pages].sort((a, b) => a.index - b.index).find((page) => page.restaurantName)?.restaurantName ?? null;
  const keepName = scan.source === "demo" || scan.customName;
  return {
    ...scan,
    restaurantName: keepName ? scan.restaurantName : (printedName ?? scan.restaurantName),
    cuisines: uniqueCuisines(scan.dishes.map((dish) => dish.cuisine)),
    status: pending
      ? "processing"
      : scan.pages.some((page) => page.status === "failed")
        ? "partial"
        : scan.dishes.length === 0
          ? "failed"
          : "ready",
  };
}

const AppStateContext = React.createContext<AppState | null>(null);

const ACCOUNTS_KEY = "forkcast:accounts:v1";
const SESSION_KEY = "forkcast:session:v1";
const LEGACY_KEY = "forkcast:ui-state:v1";
const dataKey = (id: string) => `forkcast:data:v1:${id}`;
const MAX_CONCURRENT_PAGES = 3;

const EMPTY_DATA: AccountData = { prefs: EMPTY_PREFS, feedback: [], onboarded: false, scans: [] };

function readAccounts(): Record<string, Account> {
  return readJSON<Record<string, Account>>(ACCOUNTS_KEY) ?? {};
}

/** Scans interrupted by a reload can't resume: their unread pages become retryable failures. */
function settleInterrupted(scans: Scan[]): Scan[] {
  return scans.map((scan) => {
    if (scan.status !== "processing") return scan;
    const pages = scan.pages.map((page) =>
      page.status === "pending" ? { ...page, status: "failed" as const, error: "Not analysed — re-upload", code: "gone" } : page,
    );
    return summarise({ ...scan, pages });
  });
}

function loadData(id: string): AccountData {
  const stored = readJSON<Partial<AccountData>>(dataKey(id));
  return {
    prefs: stored?.prefs ?? EMPTY_PREFS,
    feedback: stored?.feedback ?? [],
    onboarded: stored?.onboarded ?? false,
    scans: settleInterrupted(stored?.scans ?? []),
  };
}

/** blob: URLs die with the page, so they're never saved. */
function forStorage(data: AccountData): AccountData {
  return {
    ...data,
    scans: data.scans.map((scan) => (scan.thumbnail?.startsWith("blob:") ? { ...scan, thumbnail: null } : scan)),
  };
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<AppState["status"]>("loading");
  const [account, setAccount] = React.useState<PublicAccount | null>(null);
  const [data, setData] = React.useState<AccountData>(EMPTY_DATA);
  const [draft, setDraft] = React.useState<DraftPage[]>([]);
  const [persistent, setPersistent] = React.useState(true);
  const [server, setServer] = React.useState<ServerStatus | null>(null);
  const [invite, setInviteState] = React.useState<string | null>(null);
  const inviteRef = React.useRef<string | null>(null);
  const serverPromise = React.useRef<Promise<ServerStatus> | null>(null);
  const accountRef = React.useRef<PublicAccount | null>(null);
  accountRef.current = account;

  // Restore the session once, on the client.
  React.useEffect(() => {
    removeKey(LEGACY_KEY); // the old demo profile
    const savedInvite = readInvite();
    inviteRef.current = savedInvite;
    setInviteState(savedInvite);
    setPersistent(storageIsPersistent());
    const session = readJSON<{ id: string }>(SESSION_KEY);
    const found = session ? Object.values(readAccounts()).find((entry) => entry.id === session.id) : undefined;
    if (found) {
      setAccount(toPublic(found));
      setData(loadData(found.id));
      setStatus("signed-in");
    } else {
      setStatus("signed-out");
    }
  }, []);

  // Save the signed-in account's data whenever it changes.
  React.useEffect(() => {
    if (status === "signed-in" && account) writeJSON(dataKey(account.id), forStorage(data));
  }, [status, account, data]);

  const enter = React.useCallback((found: Account) => {
    writeJSON(SESSION_KEY, { id: found.id });
    setAccount(toPublic(found));
    setData(loadData(found.id));
    setDraft([]);
    setStatus("signed-in");
  }, []);

  const signUp = React.useCallback<AppState["signUp"]>(
    async ({ name, email, password }) => {
      const problem =
        (nameIssue(name) && { field: "name", error: nameIssue(name)! }) ||
        (emailIssue(email) && { field: "email", error: emailIssue(email)! }) ||
        (passwordIssue(password) && { field: "password", error: passwordIssue(password)! });
      if (problem) return { ok: false, ...problem };

      const key = normaliseEmail(email);
      const accounts = readAccounts();
      if (accounts[key]) {
        return { ok: false, field: "email", error: "An account with that email already exists on this device. Sign in instead." };
      }
      try {
        const { salt, hash } = await hashPassword(password);
        const created: Account = { id: newId(), name: name.trim(), email: key, salt, hash, createdAt: new Date().toISOString() };
        writeJSON(ACCOUNTS_KEY, { ...accounts, [key]: created });
        writeJSON(dataKey(created.id), EMPTY_DATA);
        enter(created);
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Couldn't create the account." };
      }
    },
    [enter],
  );

  const signIn = React.useCallback<AppState["signIn"]>(
    async ({ email, password }) => {
      if (emailIssue(email)) return { ok: false, field: "email", error: emailIssue(email)! };
      if (!password) return { ok: false, field: "password", error: "Enter your password" };
      const found = readAccounts()[normaliseEmail(email)];
      try {
        // Hash even when the email is unknown, so both failures take as long.
        const valid = found
          ? await verifyPassword(password, found.salt, found.hash)
          : (await hashPassword(password), false);
        if (!found || !valid) return { ok: false, error: "That email and password don't match." };
        enter(found);
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Couldn't sign in." };
      }
    },
    [enter],
  );

  const signOut = React.useCallback(() => {
    removeKey(SESSION_KEY);
    setAccount(null);
    setData(EMPTY_DATA);
    setDraft([]);
    setStatus("signed-out");
  }, []);

  const updateName = React.useCallback<AppState["updateName"]>((name) => {
    const current = accountRef.current;
    if (!current) return { ok: false, error: "You're signed out." };
    if (nameIssue(name)) return { ok: false, field: "name", error: nameIssue(name)! };
    const accounts = readAccounts();
    const stored = accounts[current.email];
    if (!stored) return { ok: false, error: "This account no longer exists." };
    const updated = { ...stored, name: name.trim() };
    writeJSON(ACCOUNTS_KEY, { ...accounts, [current.email]: updated });
    setAccount(toPublic(updated));
    return { ok: true };
  }, []);

  const changePassword = React.useCallback<AppState["changePassword"]>(async (currentPassword, next) => {
    const current = accountRef.current;
    if (!current) return { ok: false, error: "You're signed out." };
    const accounts = readAccounts();
    const stored = accounts[current.email];
    if (!stored) return { ok: false, error: "This account no longer exists." };
    if (!(await verifyPassword(currentPassword, stored.salt, stored.hash))) {
      return { ok: false, field: "current", error: "That current password isn't right." };
    }
    if (passwordIssue(next)) return { ok: false, field: "next", error: passwordIssue(next)! };
    if (next === currentPassword) return { ok: false, field: "next", error: "Choose a password you haven't used here before." };
    writeJSON(ACCOUNTS_KEY, { ...accounts, [current.email]: { ...stored, ...(await hashPassword(next)) } });
    return { ok: true };
  }, []);

  const resetPassword = React.useCallback<AppState["resetPassword"]>(async (email, next) => {
    if (emailIssue(email)) return { ok: false, field: "email", error: emailIssue(email)! };
    const accounts = readAccounts();
    const key = normaliseEmail(email);
    if (!accounts[key]) return { ok: false, field: "email", error: "There's no account with that email on this device." };
    if (passwordIssue(next)) return { ok: false, field: "password", error: passwordIssue(next)! };
    writeJSON(ACCOUNTS_KEY, { ...accounts, [key]: { ...accounts[key], ...(await hashPassword(next)) } });
    return { ok: true };
  }, []);

  const deleteAccount = React.useCallback(() => {
    const current = accountRef.current;
    if (!current) return;
    const accounts = readAccounts();
    delete accounts[current.email];
    writeJSON(ACCOUNTS_KEY, accounts);
    removeKey(dataKey(current.id));
    signOut();
  }, [signOut]);

  // --- Account data --------------------------------------------------------

  const setPrefs = React.useCallback<AppState["setPrefs"]>((update) => {
    setData((prev) => ({ ...prev, prefs: typeof update === "function" ? update(prev.prefs) : update }));
  }, []);

  const setOnboarded = React.useCallback((value: boolean) => setData((prev) => ({ ...prev, onboarded: value })), []);

  const rateDish = React.useCallback((dish: Dish, verdict: 1 | -1) => {
    setData((prev) => ({
      ...prev,
      feedback: [
        { slug: dish.slug, verdict, name: dish.name, cuisine: dish.cuisine, createdAt: new Date().toISOString() },
        ...prev.feedback.filter((entry) => entry.slug !== dish.slug),
      ],
    }));
  }, []);

  const removeFeedback = React.useCallback((slug: string) => {
    setData((prev) => ({ ...prev, feedback: prev.feedback.filter((entry) => entry.slug !== slug) }));
  }, []);

  const setScans = React.useCallback((update: (scans: Scan[]) => Scan[]) => {
    setData((prev) => ({ ...prev, scans: update(prev.scans) }));
  }, []);

  const updateScan = React.useCallback(
    (id: string, update: (scan: Scan) => Scan) => setScans((scans) => scans.map((scan) => (scan.id === id ? update(scan) : scan))),
    [setScans],
  );

  const renameScan = React.useCallback(
    (id: string, next: string) => updateScan(id, (scan) => ({ ...scan, restaurantName: next.trim() || null, customName: Boolean(next.trim()) })),
    [updateScan],
  );

  const deleteScan = React.useCallback(
    (id: string) => {
      let removed: { scan: Scan; index: number } | null = null;
      setScans((scans) => {
        const index = scans.findIndex((scan) => scan.id === id);
        if (index === -1) return scans;
        removed = { scan: scans[index], index };
        return scans.filter((scan) => scan.id !== id);
      });
      return () => {
        const restore = removed;
        if (!restore) return;
        setScans((scans) => {
          if (scans.some((scan) => scan.id === restore.scan.id)) return scans;
          const next = [...scans];
          next.splice(Math.min(restore.index, next.length), 0, restore.scan);
          return next;
        });
      };
    },
    [setScans],
  );

  const addDraft = React.useCallback((pages: DraftPage[]) => setDraft((prev) => [...prev, ...pages].slice(0, 6)), []);
  const removeDraft = React.useCallback((id: string) => setDraft((prev) => prev.filter((page) => page.id !== id)), []);
  // The latest scans, for callbacks that run after awaits.
  const scansRef = React.useRef<Scan[]>([]);
  scansRef.current = data.scans;

  /** Resolves once we know whether the server can read menus with AI. */
  const ensureServer = React.useCallback(async (): Promise<ServerStatus> => {
    serverPromise.current ??= fetchServerStatus().then((status) => status ?? OFFLINE_STATUS);
    const status = await serverPromise.current;
    setServer(status);
    return status;
  }, []);

  /** Folds one page's outcome into its scan and recomputes the scan's summary. */
  const applyPage = React.useCallback(
    (scanId: string, index: number, outcome: PageOutcome) =>
      updateScan(scanId, (scan) => {
        let dishes = scan.dishes;
        const pages = scan.pages.map((entry): ScanPageState => {
          if (entry.index !== index) return entry;
          if (outcome.kind === "pending") return { index, status: "pending" };
          if (outcome.kind === "failed") return { index, status: "failed", error: outcome.error, code: outcome.code };
          const { page } = outcome;
          return {
            index,
            status: page.is_menu ? "done" : "not_menu",
            error: page.is_menu ? undefined : "This doesn't look like a menu page.",
            restaurantName: page.restaurant_name,
            notes: page.notes,
            model: outcome.model,
            inputTokens: outcome.inputTokens,
            outputTokens: outcome.outputTokens,
          };
        });
        if (outcome.kind === "done") {
          const others = scan.dishes.filter((dish) => dish.pageIndex !== index);
          dishes = mergeDuplicates([...others, ...(outcome.page.is_menu ? toDishes(scanId, index, outcome.page.dishes) : [])]);
        }
        return summarise({ ...scan, pages, dishes });
      }),
    [updateScan],
  );

  /** Sends one compressed page to the AI, or reuses an earlier answer for the same photo. */
  const readPage = React.useCallback(
    async (scanId: string, index: number, count: number, image: Blob) => {
      try {
        const hash = await sha256Hex(image).catch(() => null);
        const hit = hash ? cachedPage(hash) : null;
        if (hit) {
          applyPage(scanId, index, { kind: "done", page: hit.page, model: hit.model, inputTokens: 0, outputTokens: 0 });
          return;
        }
        const result = await analyzePage({ image, index, count, invite: inviteRef.current });
        if (hash && result.model !== "mock") cachePage(hash, result.page, result.model);
        applyPage(scanId, index, { kind: "done", ...result });
      } catch (error) {
        applyPage(scanId, index, {
          kind: "failed",
          error: error instanceof ScanRequestError ? error.message : "Couldn't read this page. Retry it.",
          code: error instanceof ScanRequestError ? error.code : "unknown",
        });
      }
    },
    [applyPage],
  );

  const startScan = React.useCallback(() => {
    if (draft.length === 0) return null;
    const id = `scan-${Date.now().toString(36)}`;
    const pages = draft;
    const count = pages.length;

    setScans((scans) => [
      {
        id,
        restaurantName: null,
        cuisines: [],
        pageCount: count,
        status: "processing",
        thumbnail: pages[0]?.preview ?? null,
        createdAt: new Date().toISOString(),
        pages: pages.map((_, index) => ({ index, status: "pending" as const })),
        dishes: [],
      },
      ...scans,
    ]);
    setDraft([]);

    void (async () => {
      const status = await ensureServer();
      const demo = !status.ai;
      updateScan(id, (scan) => ({ ...scan, source: demo ? "demo" : "ai", restaurantName: demo ? "Sample menu" : scan.restaurantName }));

      // At most three pages in flight, like the spec's pipeline.
      const queue = pages.map((page, index) => ({ page, index }));
      const worker = async () => {
        while (queue.length > 0) {
          const { page, index } = queue.shift()!;
          if (demo) {
            await sleep(2200 + index * 900);
            applyPage(id, index, { kind: "done", page: LIVE_SCAN_PAGES[index % LIVE_SCAN_PAGES.length] });
            continue;
          }
          let image: Blob;
          try {
            image = await compressForUpload(page.file);
          } catch {
            applyPage(id, index, { kind: "failed", error: "Couldn't read this photo format — try a JPEG or a screenshot.", code: "bad_type" });
            continue;
          }
          uploads.set(`${id}:${index}`, image);
          await readPage(id, index, count, image);
        }
      };
      await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT_PAGES, count) }, worker));
      if (typeof navigator !== "undefined") navigator.vibrate?.(30);
    })();

    return id;
  }, [draft, setScans, ensureServer, updateScan, applyPage, readPage]);

  const retryPage = React.useCallback(
    (scanId: string, index: number) => {
      const scan = scansRef.current.find((entry) => entry.id === scanId);
      if (!scan) return;
      if (scan.source === "demo") {
        applyPage(scanId, index, { kind: "pending" });
        void sleep(2400).then(() =>
          applyPage(scanId, index, { kind: "done", page: LIVE_SCAN_PAGES[index % LIVE_SCAN_PAGES.length] }),
        );
        return;
      }
      const image = uploads.get(`${scanId}:${index}`);
      if (!image) {
        applyPage(scanId, index, {
          kind: "failed",
          error: "This photo isn't kept after the app closes. Scan this page again.",
          code: "gone",
        });
        return;
      }
      applyPage(scanId, index, { kind: "pending" });
      void readPage(scanId, index, scan.pageCount, image);
    },
    [applyPage, readPage],
  );

  // Ask the server once whether it can read menus, so Home can say so up front.
  React.useEffect(() => {
    if (status === "signed-in") void ensureServer();
  }, [status, ensureServer]);

  const setInvite = React.useCallback((code: string) => {
    writeInvite(code);
    inviteRef.current = code.trim();
    setInviteState(code.trim());
  }, []);


  const today = istDay(new Date());
  const used = data.scans.filter((scan) => istDay(scan.createdAt) === today).reduce((sum, scan) => sum + scan.pageCount, 0);

  const value = React.useMemo<AppState>(
    () => ({
      status,
      account,
      persistent,
      signUp,
      signIn,
      signOut,
      updateName,
      changePassword,
      resetPassword,
      deleteAccount,
      onboarded: data.onboarded,
      setOnboarded,
      prefs: data.prefs,
      setPrefs,
      feedback: data.feedback,
      rateDish,
      removeFeedback,
      scans: data.scans,
      renameScan,
      deleteScan,
      draft,
      addDraft,
      removeDraft,
      startScan,
      retryPage,
      usage: { used, limit: DAILY_PAGE_LIMIT },
      server,
      invite,
      setInvite,
    }),
    [status, account, persistent, signUp, signIn, signOut, updateName, changePassword, resetPassword, deleteAccount, data, setOnboarded, setPrefs, rateDish, removeFeedback, renameScan, deleteScan, draft, addDraft, removeDraft, startScan, retryPage, used, server, invite, setInvite],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const context = React.useContext(AppStateContext);
  if (!context) throw new Error("useAppState must be used inside <AppStateProvider>.");
  return context;
}
