import * as React from "react";

import { spiceWord } from "@/lib/taste";
import { cn } from "@/lib/utils";

/** A small chilli pod. Filled ones get the amber→red gradient. */
function Chilli({ filled, gradientId, className }: { filled: boolean; gradientId: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        d="M15.2 3.2c.2 1.4.9 2.4 2.1 2.9"
        fill="none"
        stroke={filled ? "#22C55E" : "rgba(255,255,255,0.15)"}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M17.6 6.4c-1.7-1.2-4.1-.6-5.1 1.3-1.9 3.6-4.6 7.3-8.9 9.2-.6.3-.6 1.1 0 1.4 4.9 2.6 10.4 1.4 13.4-2.3 2.6-3.2 2.7-7.6.6-9.6Z"
        fill={filled ? `url(#${gradientId})` : "rgba(255,255,255,0.15)"}
      />
    </svg>
  );
}

export function SpiceMeter({
  level,
  size = "sm",
  label = "fraction",
  className,
}: {
  level: number;
  size?: "sm" | "md" | "lg";
  /** "fraction" → 3/5, "word" → 3/5 · properly spicy, "none" → icons only. */
  label?: "fraction" | "word" | "none";
  className?: string;
}) {
  const id = React.useId();
  const gradientId = `chilli-${id.replace(/:/g, "")}`;
  const iconSize = { sm: "size-3.5", md: "size-[18px]", lg: "size-6" }[size];

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      role="img"
      aria-label={`Spice ${level} out of 5, ${spiceWord(level)}`}
    >
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
        </defs>
      </svg>
      <span className="inline-flex items-center -space-x-0.5">
        {Array.from({ length: 5 }, (_, index) => (
          <Chilli key={index} filled={index < level} gradientId={gradientId} className={iconSize} />
        ))}
      </span>
      {label !== "none" ? (
        <span className={cn("tabular font-semibold", size === "sm" ? "text-[11px]" : "text-sm", level >= 4 ? "text-danger" : level >= 2 ? "text-warning" : "text-muted-foreground")}>
          {level}/5
          {label === "word" ? <span className="font-medium text-muted-foreground"> · {spiceWord(level)}</span> : null}
        </span>
      ) : null}
    </span>
  );
}
