"use client";

import * as React from "react";
import { toast } from "sonner";

/** Registers /sw.js in production and offers a reload when a new build ships. */
export function ServiceWorkerRegistrar() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              toast("A new version of Forkcast is ready", {
                duration: Infinity,
                action: {
                  label: "Reload",
                  onClick: () => {
                    installing.postMessage("SKIP_WAITING");
                    window.location.reload();
                  },
                },
              });
            }
          });
        });
      })
      .catch(() => {
        // Without a service worker it's still a working website.
      });
  }, []);

  return null;
}
