import * as React from "react";

import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** The Forkcast mark — a fork drawn in the brand gradient. */
export function LogoMark({ className }: { className?: string }) {
  const id = React.useId();
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden focusable="false">
      <defs>
        <linearGradient id={id} x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="50%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
      </defs>
      <g fill="none" stroke={`url(#${id})`} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 6v7M16 6v7M22 6v7" />
        <path d="M10 13c0 3.6 2.7 5.6 6 5.6s6-2 6-5.6" />
        <path d="M16 18.6V27" />
      </g>
    </svg>
  );
}

/** The gradient-bordered logo tile from the FluxFin header. */
export function LogoTile({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-2xl border border-white/[0.10] bg-black shadow-glow-sm",
        className,
      )}
    >
      <LogoMark />
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  const split = BRAND.name.length - 4;
  return (
    <span className={cn("text-lg font-bold tracking-tight text-white", className)}>
      {BRAND.name.slice(0, split)}
      <span className="gradient-text">{BRAND.name.slice(split)}</span>
    </span>
  );
}
