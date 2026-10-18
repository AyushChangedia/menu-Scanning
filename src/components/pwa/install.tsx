"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Download, Share, SquarePlus, X } from "lucide-react";

import { LogoTile } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Chromium's install event, still missing from the DOM types. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "forkcast:install-dismissed";

/** The single-file preview (e.g. a Claude Artifact) isn't installable itself. */
const PREVIEW = process.env.FORKCAST_PREVIEW === "1";

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return (
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1)
  );
}

// Chromium fires beforeinstallprompt once, early. Keep it at module level so a
// screen mounted later (Profile) can still use it.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    listeners.forEach((notify) => notify());
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    listeners.forEach((notify) => notify());
  });
}

export function useInstallPrompt() {
  const [, rerender] = React.useReducer((value: number) => value + 1, 0);
  const [mounted, setMounted] = React.useState(false);
  const [installed, setInstalled] = React.useState(false);
  const [iosHelpOpen, setIosHelpOpen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    setInstalled(isStandalone());
    const notify = () => {
      setInstalled(isStandalone() || false);
      rerender();
    };
    listeners.add(notify);
    return () => {
      listeners.delete(notify);
    };
  }, []);

  const install = React.useCallback(async () => {
    if (!deferredPrompt) {
      if (isIos()) setIosHelpOpen(true);
      return;
    }
    const prompt = deferredPrompt;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    deferredPrompt = null;
    rerender();
  }, []);

  const canInstall = !PREVIEW && mounted && !installed && (Boolean(deferredPrompt) || isIos());
  return { mounted, installed, canInstall, install, iosHelpOpen, setIosHelpOpen };
}

/** iOS has no install API: show the Share → Add to Home Screen steps instead. */
export function IosInstallDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Add Forkcast to your Home Screen</DialogTitle>
          <DialogDescription>Three taps and it opens like a normal app, full screen.</DialogDescription>
        </DialogHeader>
        <ol className="space-y-3 px-6 pb-6">
          {[
            { icon: Share, text: "Tap the Share button (Safari's toolbar, or Chrome's address bar)" },
            { icon: SquarePlus, text: "Choose “Add to Home Screen”" },
            { icon: Download, text: "Tap “Add”" },
          ].map((step, index) => (
            <li key={step.text} className="flex items-center gap-3">
              <span className="tabular grid size-8 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-sm font-semibold text-primary-300">
                {index + 1}
              </span>
              <step.icon className="size-4 shrink-0 text-primary-300" />
              <span className="text-sm text-muted-foreground">{step.text}</span>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}

/** Row for the Profile actions list. Hidden once installed or when unavailable. */
export function InstallRow() {
  const { canInstall, install, iosHelpOpen, setIosHelpOpen } = useInstallPrompt();
  if (!canInstall) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => void install()}
        className="flex min-h-14 w-full items-center gap-3 px-5 text-left text-sm font-medium text-white hover:bg-white/[0.03]"
      >
        <Download className="size-4 text-primary-300" />
        Install Forkcast on this device
        <ChevronRight className="ml-auto size-4 text-subtle" />
      </button>
      <IosInstallDialog open={iosHelpOpen} onOpenChange={setIosHelpOpen} />
    </>
  );
}

/** One-time, dismissible card on Home inviting an install. */
export function InstallBanner() {
  const { canInstall, install, iosHelpOpen, setIosHelpOpen } = useInstallPrompt();
  const [dismissed, setDismissed] = React.useState(true);

  React.useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISSED_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Storage blocked: it just comes back next visit.
    }
    setDismissed(true);
  }

  return (
    <>
      <AnimatePresence initial={false}>
        {canInstall && !dismissed ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass flex items-center gap-3.5 rounded-3xl p-4">
              <LogoTile />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">Install Forkcast</p>
                <p className="text-xs text-muted-foreground">Its own icon, full screen, one tap away.</p>
              </div>
              <Button size="sm" onClick={() => void install()}>
                Install
              </Button>
              <button type="button" onClick={dismiss} className="-mr-1 grid size-9 shrink-0 place-items-center rounded-full text-subtle hover:text-white" aria-label="Dismiss">
                <X className="size-4" />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <IosInstallDialog open={iosHelpOpen} onOpenChange={setIosHelpOpen} />
    </>
  );
}
