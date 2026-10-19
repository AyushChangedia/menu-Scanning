"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { useAppState } from "@/components/providers/app-state";
import { LogoTile } from "@/components/shared/logo";

/** Shown for the instant it takes to restore the session. */
export function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas" aria-busy="true" aria-label="Loading Forkcast">
      <LogoTile className="size-14 animate-pulse rounded-3xl" />
    </div>
  );
}

/**
 * App screens need an account. Signed-out visitors go to sign-in; a new
 * account goes through onboarding before anything else.
 */
export function RequireAccount({
  children,
  onboarding = false,
}: {
  children: React.ReactNode;
  /** True on the onboarding screen itself. */
  onboarding?: boolean;
}) {
  const router = useRouter();
  const { status, onboarded } = useAppState();
  const target =
    status === "signed-out"
      ? "/login"
      : status === "signed-in" && !onboarded && !onboarding
        ? "/onboarding"
        : status === "signed-in" && onboarded && onboarding
          ? "/"
          : null;

  React.useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  if (status !== "signed-in" || target) return <Splash />;
  return <>{children}</>;
}

/** Sign-in screens bounce a signed-in user straight into the app. */
export function RedirectIfSignedIn({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status, onboarded } = useAppState();

  React.useEffect(() => {
    if (status === "signed-in") router.replace(onboarded ? "/" : "/onboarding");
  }, [status, onboarded, router]);

  if (status !== "signed-out") return <Splash />;
  return <>{children}</>;
}
