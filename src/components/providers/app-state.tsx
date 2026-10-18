"use client";

import * as React from "react";

import { LIVE_SCAN_PAGES, PAN_ASIAN_PAGE_2 } from "@/lib/mock/fixtures";
import {
  DAILY_PAGE_LIMIT,
  DEFAULT_FEEDBACK,
  DEFAULT_PREFS,
  MOCK_USER,
  initialScans,
  uniqueCuisines,
} from "@/lib/mock/data";
import { mergeDuplicates, toDishes } from "@/lib/merge";
import { sleep } from "@/lib/utils";
import type { Dish, Feedback, Scan, TastePreference } from "@/lib/types";

/**
 * Front-end state for the UI build. Taste preferences and ratings persist in
 * localStorage; scans live in memory and are "decoded" by a simulated scanner
 * that returns fixture pages on a timer — no network, no AI.
 */

export type DraftPage = { id: string; file: File; preview: string };

type AppState = {
  user: typeof MOCK_USER & { setName: (name: string) => void };
  hydrated: boolean;
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

const STORAGE_KEY = "forkcast:ui-state:v1";
const MAX_CONCURRENT_PAGES = 3;

type Persisted = { prefs: TastePreference; feedback: Feedback[]; onboarded: boolean; name: string };

function readStorage(): Partial<Persisted> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Persisted>) : {};
  } catch {
    return {};
  }
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = React.useState(false);
  const [prefs, setPrefsState] = React.useState<TastePreference>(DEFAULT_PREFS);
  const [feedback, setFeedback] = React.useState<Feedback[]>(DEFAULT_FEEDBACK);
  const [onboarded, setOnboarded] = React.useState(true);
  const [name, setName] = React.useState(MOCK_USER.name);
  const [scans, setScans] = React.useState<Scan[]>(initialScans);
  const [draft, setDraft] = React.useState<DraftPage[]>([]);
  const [usedToday, setUsedToday] = React.useState(6);

  React.useEffect(() => {
    const stored = readStorage();
    if (stored.prefs) setPrefsState(stored.prefs);
    if (stored.feedback) setFeedback(stored.feedback);
    if (typeof stored.onboarded === "boolean") setOnboarded(stored.onboarded);
    if (stored.name) setName(stored.name);
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      const payload: Persisted = { prefs, feedback, onboarded, name };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Private mode or blocked storage: the UI still works for this visit.
    }
  }, [hydrated, prefs, feedback, onboarded, name]);

  const setPrefs = React.useCallback<AppState["setPrefs"]>((update) => {
    setPrefsState((prev) => (typeof update === "function" ? update(prev) : update));
  }, []);

  const rateDish = React.useCallback((dish: Dish, verdict: 1 | -1) => {
    setFeedback((prev) => [
      { slug: dish.slug, verdict, name: dish.name, cuisine: dish.cuisine, createdAt: new Date().toISOString() },
      ...prev.filter((entry) => entry.slug !== dish.slug),
    ]);
  }, []);

  const removeFeedback = React.useCallback((slug: string) => {
    setFeedback((prev) => prev.filter((entry) => entry.slug !== slug));
  }, []);

  const updateScan = React.useCallback((id: string, update: (scan: Scan) => Scan) => {
    setScans((prev) => prev.map((scan) => (scan.id === id ? update(scan) : scan)));
  }, []);

  const renameScan = React.useCallback(
    (id: string, next: string) => updateScan(id, (scan) => ({ ...scan, restaurantName: next.trim() || null })),
    [updateScan],
  );

  const deleteScan = React.useCallback((id: string) => {
    let removed: { scan: Scan; index: number } | null = null;
    setScans((prev) => {
      const index = prev.findIndex((scan) => scan.id === id);
      if (index === -1) return prev;
      removed = { scan: prev[index], index };
      return prev.filter((scan) => scan.id !== id);
    });
    return () => {
      const restore = removed;
      if (!restore) return;
      setScans((prev) => {
        if (prev.some((scan) => scan.id === restore.scan.id)) return prev;
        const next = [...prev];
        next.splice(Math.min(restore.index, next.length), 0, restore.scan);
        return next;
      });
    };
  }, []);

  const addDraft = React.useCallback((pages: DraftPage[]) => {
    setDraft((prev) => [...prev, ...pages].slice(0, 6));
  }, []);

  const removeDraft = React.useCallback((id: string) => {
    setDraft((prev) => prev.filter((page) => page.id !== id));
  }, []);

  /** Marks one page finished and folds its dishes into the scan. */
  const completePage = React.useCallback(
    (scanId: string, index: number) => {
      const page = LIVE_SCAN_PAGES[index % LIVE_SCAN_PAGES.length];
      updateScan(scanId, (scan) => {
        const dishes: Dish[] = mergeDuplicates([...scan.dishes, ...toDishes(scanId, index, page.dishes)]);
        const pages = scan.pages.map((entry) =>
          entry.index === index ? { index, status: "done" as const } : entry,
        );
        const finished = pages.every((entry) => entry.status !== "pending");
        return {
          ...scan,
          dishes,
          pages,
          restaurantName: scan.restaurantName ?? page.restaurant_name,
          cuisines: uniqueCuisines(dishes.map((dish) => dish.cuisine)),
          status: finished
            ? pages.some((entry) => entry.status === "failed")
              ? "partial"
              : "ready"
            : scan.status,
        };
      });
    },
    [updateScan],
  );

  const startScan = React.useCallback(() => {
    if (draft.length === 0) return null;
    const id = `scan-${Date.now().toString(36)}`;
    const pageCount = draft.length;

    setScans((prev) => [
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
      ...prev,
    ]);
    setDraft([]);
    setUsedToday((value) => value + pageCount);

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
  }, [draft, completePage]);

  const retryPage = React.useCallback(
    (scanId: string, index: number) => {
      updateScan(scanId, (scan) => ({
        ...scan,
        status: "processing",
        pages: scan.pages.map((entry) => (entry.index === index ? { index, status: "pending" as const } : entry)),
      }));
      void sleep(2400).then(() => {
        // The demo's failed page is Bamboo Lantern's second page.
        if (scanId === "bamboo-lantern") {
          updateScan(scanId, (scan) => {
            const dishes = mergeDuplicates([...scan.dishes, ...toDishes(scanId, index, PAN_ASIAN_PAGE_2.dishes)]);
            return {
              ...scan,
              dishes,
              cuisines: uniqueCuisines(dishes.map((dish) => dish.cuisine)),
              status: "ready",
              pages: scan.pages.map((entry) => (entry.index === index ? { index, status: "done" as const } : entry)),
            };
          });
        } else {
          completePage(scanId, index);
        }
      });
    },
    [updateScan, completePage],
  );

  const value = React.useMemo<AppState>(
    () => ({
      user: { ...MOCK_USER, name, setName },
      hydrated,
      onboarded,
      setOnboarded,
      prefs,
      setPrefs,
      feedback,
      rateDish,
      removeFeedback,
      scans,
      renameScan,
      deleteScan,
      draft,
      addDraft,
      removeDraft,
      startScan,
      retryPage,
      usage: { used: usedToday, limit: DAILY_PAGE_LIMIT },
    }),
    [name, hydrated, onboarded, prefs, setPrefs, feedback, rateDish, removeFeedback, scans, renameScan, deleteScan, draft, addDraft, removeDraft, startScan, retryPage, usedToday],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const context = React.useContext(AppStateContext);
  if (!context) throw new Error("useAppState must be used inside <AppStateProvider>.");
  return context;
}
