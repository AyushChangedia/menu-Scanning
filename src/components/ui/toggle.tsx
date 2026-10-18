"use client";

import { cn } from "@/lib/utils";

/** A small switch row: label on the left, pill switch on the right. */
export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 w-full items-center justify-between gap-4 rounded-2xl py-2 text-left"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-white">{label}</span>
        {hint ? <span className="block text-xs text-subtle">{hint}</span> : null}
      </span>
      <span
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-300",
          checked ? "border-transparent bg-brand-gradient shadow-glow-sm" : "border-white/[0.12] bg-white/[0.06]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-[22px] rounded-full bg-white shadow transition-transform duration-300 ease-smooth",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}
