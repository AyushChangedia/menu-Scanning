"use client";

/**
 * Stand-in for `next/navigation` in the single-file preview build.
 *
 * The preview runs inside a locked-down frame where real URL routing isn't
 * available, so the current route lives in React state. When the frame allows
 * `history.pushState`, each navigation also gets a history entry so the
 * browser's back gesture works; when it doesn't, an in-memory stack does.
 */

import * as React from "react";

type RouterValue = {
  pathname: string;
  push: (path: string) => void;
  replace: (path: string) => void;
  back: () => void;
};

const RouterContext = React.createContext<RouterValue | null>(null);

/** Bare-token deep links: #history, #taste, #onboarding, #scan-little-napoli … */
function initialPath(): string {
  try {
    const token = window.location.hash.replace(/^#/, "");
    if (!token || token === "home") return "/";
    if (token.startsWith("scan-")) return `/scan/${token.slice(5)}`;
    return `/${token}`;
  } catch {
    return "/";
  }
}

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = React.useState<string[]>(() => [initialPath()]);
  const historyWorks = React.useRef(false);

  React.useEffect(() => {
    try {
      window.history.replaceState({ forkcastDepth: 0 }, "");
      historyWorks.current = true;
    } catch {
      historyWorks.current = false;
    }
    const onPop = (event: PopStateEvent) => {
      const depth = (event.state as { forkcastDepth?: number } | null)?.forkcastDepth;
      if (typeof depth === "number") setStack((prev) => prev.slice(0, depth + 1));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const value = React.useMemo<RouterValue>(() => {
    const pathname = stack[stack.length - 1];
    return {
      pathname,
      push: (path) => {
        setStack((prev) => {
          const next = [...prev, path];
          if (historyWorks.current) {
            try {
              window.history.pushState({ forkcastDepth: next.length - 1 }, "");
            } catch {
              historyWorks.current = false;
            }
          }
          return next;
        });
        window.scrollTo({ top: 0 });
      },
      replace: (path) => {
        setStack((prev) => [...prev.slice(0, -1), path]);
        window.scrollTo({ top: 0 });
      },
      back: () => {
        if (stack.length <= 1) {
          setStack(["/"]);
        } else if (historyWorks.current) {
          window.history.back();
        } else {
          setStack((prev) => prev.slice(0, -1));
        }
        window.scrollTo({ top: 0 });
      },
    };
  }, [stack]);

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
