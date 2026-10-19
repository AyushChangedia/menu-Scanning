"use client";

/**
 * Stand-in for `next/navigation` in the single-file preview build.
 *
 * The preview runs inside a locked-down frame where real URL routing isn't
 * available, so routes live in React state as a list of entries plus the
 * current position. When the frame allows `history.pushState`, every entry
 * also gets a browser history entry (state = its position), so the back and
 * forward gestures work; otherwise the in-app Back button walks the list.
 */

import * as React from "react";

type RouterValue = {
  pathname: string;
  push: (path: string) => void;
  replace: (path: string) => void;
  back: () => void;
};

type Nav = { entries: string[]; index: number };

const RouterContext = React.createContext<RouterValue | null>(null);

/** Bare-token deep links: #history, #taste, #signup, #onboarding … */
export function pathFromHash(hash: string): string {
  const token = hash.replace(/^#/, "");
  if (!token || token === "home") return "/";
  if (token.startsWith("scan-")) return `/scan/${token.slice(5)}`;
  return `/${token}`;
}

/** The reverse, used for link hrefs so "open in new tab" lands somewhere sane. */
export function hashFromPath(path: string): string {
  if (path === "/") return "#home";
  if (path.startsWith("/scan/")) return `#scan-${path.slice(6)}`;
  return `#${path.replace(/^\//, "")}`;
}

function scrollTop() {
  // "instant" overrides the app's smooth scroll-behaviour on <html>.
  window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
}

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [nav, setNav] = React.useState<Nav>(() => ({
    entries: [typeof window === "undefined" ? "/" : pathFromHash(window.location.hash)],
    index: 0,
  }));
  const navRef = React.useRef(nav);
  navRef.current = nav;
  const historyWorks = React.useRef(false);

  React.useEffect(() => {
    try {
      // Each screen starts at the top; don't let the browser restore old offsets.
      window.history.scrollRestoration = "manual";
      window.history.replaceState({ forkcastIndex: 0 }, "");
      historyWorks.current = true;
    } catch {
      historyWorks.current = false;
    }
    const onPop = (event: PopStateEvent) => {
      const index = (event.state as { forkcastIndex?: number } | null)?.forkcastIndex;
      if (typeof index !== "number") return;
      setNav((prev) => (index < prev.entries.length ? { ...prev, index } : prev));
      scrollTop();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const value = React.useMemo<RouterValue>(() => {
    const pathname = nav.entries[nav.index];
    return {
      pathname,
      push: (path) => {
        const current = navRef.current;
        if (path === current.entries[current.index]) {
          scrollTop();
          return;
        }
        const next: Nav = { entries: [...current.entries.slice(0, current.index + 1), path], index: current.index + 1 };
        if (historyWorks.current) {
          try {
            window.history.pushState({ forkcastIndex: next.index }, "");
          } catch {
            historyWorks.current = false;
          }
        }
        setNav(next);
        scrollTop();
      },
      replace: (path) => {
        setNav((prev) => {
          const entries = [...prev.entries];
          entries[prev.index] = path;
          return { ...prev, entries };
        });
        scrollTop();
      },
      back: () => {
        const current = navRef.current;
        if (current.index === 0) {
          if (current.entries[0] !== "/") setNav({ entries: ["/"], index: 0 });
        } else if (historyWorks.current) {
          window.history.back();
          return;
        } else {
          setNav({ ...current, index: current.index - 1 });
        }
        scrollTop();
      },
    };
  }, [nav]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

function useRouterValue(): RouterValue {
  const value = React.useContext(RouterContext);
  if (!value) throw new Error("Preview router missing — wrap the app in <RouterProvider>.");
  return value;
}

export function useRouter() {
  const { push, replace, back } = useRouterValue();
  return { push, replace, back, refresh: () => {}, forward: () => {}, prefetch: () => {} };
}

export function usePathname(): string {
  return useRouterValue().pathname;
}

export function useSearchParams(): URLSearchParams {
  return new URLSearchParams();
}
