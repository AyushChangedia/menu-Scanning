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
import { readJSON, removeKey, storageIsPersistent, writeJSON } from "@/lib/storage";
import { sleep } from "@/lib/utils";
import type { Dish, Feedback, Scan, TastePreference } from "@/lib/types";

/**
 * Front-end state. Accounts (email + hashed password), each account's taste,
 * ratings and scans are kept on this device. Scans are "decoded" by a
 * simulated scanner that returns fixture menus — no network, no AI.
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
};

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

/** Scans interrupted by a reload can't resume: mark their unread pages failed. */
function settleInterrupted(scans: Scan[]): Scan[] {
  return scans.map((scan) => {
    if (scan.status !== "processing") return scan;
    const pages = scan.pages.map((page) =>
      page.status === "pending" ? { ...page, status: "failed" as const, error: "Not analysed — re-upload" } : page,
    );
    return { ...scan, pages, status: pages.some((page) => page.status === "done") ? "partial" : "failed" };
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
  const accountRef = React.useRef<PublicAccount | null>(null);
  accountRef.current = account;

  // Restore the session once, on the client.
  React.useEffect(() => {
    removeKey(LEGACY_KEY); // the old demo profile
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
    (id: string, next: string) => updateScan(id, (scan) => ({ ...scan, restaurantName: next.trim() || null })),
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

  /** Marks one page finished and folds its dishes into the scan. */
  const completePage = React.useCallback(
    (scanId: string, index: number) => {
      const page = LIVE_SCAN_PAGES[index % LIVE_SCAN_PAGES.length];
      updateScan(scanId, (scan) => {
        const dishes: Dish[] = mergeDuplicates([...scan.dishes, ...toDishes(scanId, index, page.dishes)]);
        const pages = scan.pages.map((entry) => (entry.index === index ? { index, status: "done" as const } : entry));
        const finished = pages.every((entry) => entry.status !== "pending");
        return {
          ...scan,
          dishes,
          pages,
          restaurantName: scan.restaurantName ?? page.restaurant_name,
          cuisines: uniqueCuisines(dishes.map((dish) => dish.cuisine)),
          status: finished ? (pages.some((entry) => entry.status === "failed") ? "partial" : "ready") : scan.status,
        };
      });
    },
    [updateScan],
  );

  const startScan = React.useCallback(() => {
    if (draft.length === 0) return null;
    const id = `scan-${Date.now().toString(36)}`;
    const pageCount = draft.length;

    setScans((scans) => [
      {
        id,
        restaurantName: null,
        cuisines: [],
        pageCount,
        status: "processing",
        thumbnail: draft[0]?.preview ?? null,
        createdAt: new Date().toISOString(),
        pages: Array.from({ length: pageCount }, (_, index) => ({ index, status: "pending" as const })),
        dishes: [],
      },
      ...scans,
    ]);
    setDraft([]);

    // At most three pages in flight, like the real pipeline.
    const queue = Array.from({ length: pageCount }, (_, index) => index);
    const worker = async () => {
      while (queue.length > 0) {
        const index = queue.shift()!;
        await sleep(2200 + index * 900);
        completePage(id, index);
      }
    };
    void Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT_PAGES, pageCount) }, worker)).then(() => {
      if (typeof navigator !== "undefined") navigator.vibrate?.(30);
    });

    return id;
  }, [draft, completePage, setScans]);

  const retryPage = React.useCallback(
    (scanId: string, index: number) => {
      updateScan(scanId, (scan) => ({
        ...scan,
        status: "processing",
        pages: scan.pages.map((entry) => (entry.index === index ? { index, status: "pending" as const } : entry)),
      }));
      void sleep(2400).then(() => completePage(scanId, index));
    },
    [updateScan, completePage],
  );

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
    }),
    [status, account, persistent, signUp, signIn, signOut, updateName, changePassword, resetPassword, deleteAccount, data, setOnboarded, setPrefs, rateDish, removeFeedback, renameScan, deleteScan, draft, addDraft, removeDraft, startScan, retryPage, used],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const context = React.useContext(AppStateContext);
  if (!context) throw new Error("useAppState must be used inside <AppStateProvider>.");
  return context;
}
