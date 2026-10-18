import { Ban, TriangleAlert } from "lucide-react";

import type { MatchWarning } from "@/lib/match";
import { cn } from "@/lib/utils";

/** ≥ 80 glows on the brand gradient; 60–79 is primary-soft; below is muted. */
export function MatchBadge({ score, className }: { score: number; className?: string }) {
  return (
    <span
      className={cn(
        "tabular inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-xs font-bold",
        score >= 80
          ? "bg-brand-gradient text-white shadow-glow-sm"
          : score >= 60
            ? "border border-primary/30 bg-primary/15 text-primary-200"
            : "border border-white/[0.08] bg-white/[0.04] text-subtle",
        className,
      )}
      aria-label={`${score}% match`}
    >
      {score}%
    </span>
  );
}

/** Warning chips: guess (amber), dislike (soft red), allergy (solid red). */
export function FlagChip({ warning, className }: { warning: MatchWarning; className?: string }) {
  const styles: Record<MatchWarning["kind"], string> = {
    guess: "border-warning/25 bg-warning-soft text-warning",
    diet_unknown: "border-warning/25 bg-warning-soft text-warning",
    heat: "border-danger/20 bg-danger-soft text-[#F87171]",
    dislike: "border-danger/25 bg-danger-soft text-[#F87171]",
    allergy: "border-transparent bg-danger text-white shadow-[0_0_18px_-4px_rgba(239,68,68,0.8)]",
  };

  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full border px-2 text-[11px] font-semibold",
        styles[warning.kind],
        className,
      )}
    >
      {warning.kind === "allergy" ? (
        <Ban className="size-3" strokeWidth={2.5} />
      ) : warning.kind === "guess" || warning.kind === "diet_unknown" ? (
        <TriangleAlert className="size-3" strokeWidth={2.5} />
      ) : null}
      {warning.text}
    </span>
  );
}
