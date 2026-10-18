"use client";

/**
 * Entry point for the single-file preview: the same screens as the Next.js
 * app, with routing handled in memory (see ./router.tsx).
 */

import * as React from "react";
import { createRoot } from "react-dom/client";
import { X } from "lucide-react";

import AppLayout from "@/app/(app)/layout";
import AuthLayout from "@/app/(auth)/layout";
import NotFound from "@/app/not-found";
import { ForgotPasswordForm, LoginForm, SignUpForm } from "@/components/auth/auth-forms";
import { HomeView } from "@/components/home/home-view";
import { HistoryView } from "@/components/pages/history-view";
import { OnboardingView } from "@/components/pages/onboarding-view";
import { ProfileView } from "@/components/pages/profile-view";
import { TasteView } from "@/components/pages/taste-view";
import { AppProviders } from "@/components/providers/app-providers";
import { ResultsView } from "@/components/scan/results-view";

import { RouterProvider, usePathname } from "./router";

function Screen() {
  const path = usePathname();

  if (path === "/login") return <AuthLayout><LoginForm /></AuthLayout>;
  if (path === "/signup") return <AuthLayout><SignUpForm /></AuthLayout>;
  if (path === "/forgot-password") return <AuthLayout><ForgotPasswordForm /></AuthLayout>;
  if (path === "/onboarding") return <OnboardingView />;

  const scan = path.match(/^\/scan\/([^/]+)$/);
  const page =
    path === "/" ? <HomeView /> :
    path === "/history" ? <HistoryView /> :
    path === "/taste" ? <TasteView /> :
    path === "/profile" ? <ProfileView /> :
    scan ? <ResultsView key={scan[1]} id={decodeURIComponent(scan[1])} /> :
    null;

  if (!page) return <NotFound />;
  return (
    <AppLayout>
      {path === "/" ? <PreviewNote /> : null}
      {page}
    </AppLayout>
  );
}

let noteDismissed = false;

/** One line saying what this preview is; stays dismissed for the visit. */
function PreviewNote() {
  const [hidden, setHidden] = React.useState(noteDismissed);
  if (hidden) return null;
  return (
    <div className="mb-6 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] py-2 pl-3.5 pr-1.5 text-[13px] text-muted-foreground">
      <span className="size-1.5 shrink-0 rounded-full bg-cyan" aria-hidden />
      <span className="min-w-0 flex-1">Preview: menus are decoded from sample data. Nothing leaves your browser.</span>
      <button
        type="button"
        onClick={() => {
          noteDismissed = true;
          setHidden(true);
        }}
        className="grid size-9 shrink-0 place-items-center rounded-full text-subtle hover:text-white"
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

document.documentElement.classList.add("dark");

// Load Inter without blocking first paint; the fallback stack shows meanwhile.
const font = document.createElement("link");
font.rel = "stylesheet";
font.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";
document.head.appendChild(font);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider>
      <AppProviders>
        <Screen />
      </AppProviders>
    </RouterProvider>
  </React.StrictMode>,
);
