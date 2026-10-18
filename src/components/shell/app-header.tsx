"use client";

import Link from "next/link";

import { useAppState } from "@/components/providers/app-state";
import { LogoTile, Wordmark } from "@/components/shared/logo";
import { initials } from "@/lib/utils";

export function AppHeader() {
  const { account } = useAppState();

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-canvas/70 pt-safe backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-md items-center gap-3 px-gutter">
        <Link href="/" className="flex items-center gap-3 rounded-2xl" aria-label="Forkcast home">
          <LogoTile />
          <Wordmark />
        </Link>

        <Link
          href="/profile"
          aria-label="Your profile"
          className="ml-auto grid size-11 shrink-0 place-items-center rounded-full bg-brand-gradient text-sm font-semibold text-white shadow-glow-sm ring-1 ring-white/10 transition-transform hover:scale-105"
        >
          {initials(account?.name, account?.email)}
        </Link>
      </div>
    </header>
  );
}
