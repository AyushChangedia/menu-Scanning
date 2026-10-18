"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Ban, Sparkles } from "lucide-react";

import { DietMark } from "@/components/food/diet-mark";
import { FlagChip, MatchBadge } from "@/components/food/badges";
import { SpiceMeter } from "@/components/food/spice-meter";
import type { MatchWarning, ScoredDish } from "@/lib/match";
import type { Dish } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";

export function PriceTag({ dish, className }: { dish: Dish; className?: string }) {
  if (dish.price === null) return null;
  return (
    <span className={cn("tabular shrink-0 text-sm font-semibold text-white/85", className)}>
      {formatPrice(dish.price)}
      {dish.price_variants.length > 1 ? <span className="text-subtle">+</span> : null}
    </span>
  );
}

/** Card flags: everything except heat, which the chilli meter already shows. */
function cardFlags(warnings: MatchWarning[]): MatchWarning[] {
  const order: MatchWarning["kind"][] = ["allergy", "dislike", "diet_unknown", "guess", "heat"];
  return [...warnings]
    .map((warning) => (warning.kind === "heat" ? { ...warning, text: "Above your heat" } : warning))
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}

/** Collapsed dish row for the Full menu list. */
export function DishCard({
  entry,
  onOpen,
  index = 0,
}: {
  entry: ScoredDish;
  onOpen: () => void;
  index?: number;
}) {
  const { dish, match } = entry;

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index, 12) * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "glass block w-full rounded-3xl p-4 text-left transition-colors hover:border-white/[0.14] active:scale-[0.99]",
        match.excluded && "opacity-50",
      )}
    >
      <div className="flex items-start gap-2.5">
        <DietMark diet={dish.diet} className="mt-[3px]" />
        <h3 className="line-clamp-2 min-w-0 flex-1 text-[15px] font-semibold leading-snug text-white">
          {dish.name}
        </h3>
        <PriceTag dish={dish} />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 pl-[26px]">
        <SpiceMeter level={dish.spice} />
        {!match.excluded ? <MatchBadge score={match.score} /> : null}
        {cardFlags(match.warnings).map((warning) => (
          <FlagChip key={warning.kind + warning.text} warning={warning} />
        ))}
      </div>

      <p className="mt-2 truncate pl-[26px] text-sm text-muted-foreground">{dish.taste_overview}</p>

      {match.excluded && match.excludedReason ? (
        <p className="mt-2 flex items-center gap-1.5 pl-[26px] text-xs font-semibold text-[#F87171]">
          <Ban className="size-3.5" />
          {match.excludedReason}
        </p>
      ) : null}
    </motion.button>
  );
}

/** Big card for the "For you" tab. */
export function PickCard({
  entry,
  rank,
  onOpen,
}: {
  entry: ScoredDish;
  rank: number;
  onOpen: () => void;
}) {
  const { dish, match } = entry;

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: rank * 0.06, ease: [0.16, 1, 0.3, 1] }}
      data-active={rank === 0 ? "true" : undefined}
      className="glass glow-border relative block w-full overflow-hidden rounded-3xl p-5 text-left active:scale-[0.99]"
    >
      {rank === 0 ? (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-primary/25 blur-3xl"
        />
      ) : null}

      <div className="flex items-start gap-3">
        <span className="tabular grid size-8 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-sm font-bold text-primary-200">
          {rank + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <DietMark diet={dish.diet} className="mt-[5px]" />
            <h3 className="line-clamp-2 min-w-0 flex-1 text-lg font-bold leading-snug tracking-tight text-white">
              {dish.name}
            </h3>
          </div>
          {dish.canonical_name.toLowerCase() !== dish.name.toLowerCase() ? (
            <p className="mt-0.5 truncate pl-6 text-xs text-subtle">{dish.canonical_name}</p>
          ) : null}
        </div>
        <MatchBadge score={match.score} className="h-7 px-3 text-sm" />
      </div>

      {match.reasons.length > 0 ? (
        <p className="mt-3 flex items-center gap-1.5 text-[13px] font-medium text-primary-200">
          <Sparkles className="size-3.5 shrink-0 text-primary-300" />
          <span className="truncate">
            {match.reasons.map((reason, i) => (i === 0 ? reason.charAt(0).toUpperCase() + reason.slice(1) : reason)).join(" · ")}
          </span>
        </p>
      ) : null}

      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/80">{dish.taste_overview}</p>
      {dish.familiar_comparison ? (
        <p className="mt-1.5 line-clamp-1 text-sm text-muted-foreground">
          <span className="text-subtle">Like: </span>
          {dish.familiar_comparison.replace(/^Like\s+/i, "")}
        </p>
      ) : null}

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <SpiceMeter level={dish.spice} size="md" />
          {cardFlags(match.warnings).map((warning) => (
            <FlagChip key={warning.kind + warning.text} warning={warning} />
          ))}
        </div>
        <PriceTag dish={dish} />
      </div>
    </motion.button>
  );
}
