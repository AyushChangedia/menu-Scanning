"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

/** Pill track; the active segment is filled with the brand gradient. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  layoutId,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: React.ReactNode }[];
  className?: string;
  layoutId: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "relative grid rounded-full border border-white/[0.08] bg-white/[0.03] p-1",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-0 flex h-10 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors",
              active ? "text-white" : "text-muted-foreground hover:text-white",
            )}
          >
            {active ? (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 -z-10 rounded-full bg-brand-gradient shadow-glow-sm"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            ) : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
