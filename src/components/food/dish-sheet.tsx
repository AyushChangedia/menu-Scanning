"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Ban, Info, MessageCircleQuestion, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

import { useAppState } from "@/components/providers/app-state";
import { DietMark, DIET_WORD } from "@/components/food/diet-mark";
import { FlagChip, MatchBadge } from "@/components/food/badges";
import { SpiceMeter } from "@/components/food/spice-meter";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { ScoredDish } from "@/lib/match";
import { ALLERGY_LABEL, COURSE_LABEL, CUISINE_LABEL, FLAVOR_LABEL, HEAVINESS_META, type FlavorId } from "@/lib/taste";
import { cn, formatPrice } from "@/lib/utils";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5 border-t border-white/[0.06] pt-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-subtle">{title}</h3>
      {children}
    </section>
  );
}

const HEAVINESS_LEVEL = { light: 1, balanced: 2, indulgent: 3 } as const;

export function DishSheet({ entry, onClose }: { entry: ScoredDish | null; onClose: () => void }) {
  // Keep the last dish around while the sheet animates closed.
  const [shown, setShown] = React.useState(entry);
  React.useEffect(() => {
    if (entry) setShown(entry);
  }, [entry]);

  return (
    <Sheet open={entry !== null} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      {shown ? <DishSheetBody entry={shown} /> : null}
    </Sheet>
  );
}

function DishSheetBody({ entry }: { entry: ScoredDish }) {
  const { dish, match } = entry;
  const { feedback, rateDish, removeFeedback } = useAppState();
  const verdict = feedback.find((item) => item.slug === dish.slug)?.verdict;

  const flavors = (Object.entries(dish.flavor) as [FlavorId, number][])
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]);

  function rate(next: 1 | -1) {
    if (verdict === next) {
      removeFeedback(dish.slug);
      return;
    }
    rateDish(dish, next);
    toast.success(next === 1 ? "Saved — we'll rank it higher next time" : "Noted — we'll steer you away from it");
  }

  return (
    <SheetContent title={dish.name} hideTitle>
      <div className="space-y-4">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-start gap-2.5">
            <DietMark diet={dish.diet} className="mt-[7px]" />
            <h2 className="min-w-0 flex-1 text-[22px] font-bold leading-tight tracking-tight text-white">
              {dish.name}
            </h2>
            {!match.excluded ? <MatchBadge score={match.score} className="mt-1 h-7 px-3 text-sm" /> : null}
          </div>
          {dish.printed_description ? (
            <p className="pl-[26px] text-sm italic leading-relaxed text-muted-foreground">
              “{dish.printed_description}”
            </p>
          ) : null}
          {dish.price_variants.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pl-[26px]">
              {dish.price_variants.map((variant) => (
                <span key={variant.label} className="tabular rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs text-white/85">
                  {variant.label} <span className="font-semibold">{formatPrice(variant.price)}</span>
                </span>
              ))}
            </div>
          ) : dish.price !== null ? (
            <p className="tabular pl-[26px] text-sm font-semibold text-white/85">{formatPrice(dish.price)}</p>
          ) : null}
        </div>

        {match.excluded && match.excludedReason ? (
          <div className="flex items-center gap-2.5 rounded-2xl border border-danger/30 bg-danger-soft px-3.5 py-3 text-sm font-semibold text-[#FCA5A5]">
            <Ban className="size-4 shrink-0" />
            Not for you: {match.excludedReason}
          </div>
        ) : null}

        <Section title="What it is">
          <p className="text-sm text-white">
            {dish.canonical_name}
            <span className="text-subtle"> · </span>
            {CUISINE_LABEL[dish.cuisine]}
            <span className="text-subtle"> · </span>
            {COURSE_LABEL[dish.course]}
            <span className="text-subtle"> · </span>
            {DIET_WORD[dish.diet]}
          </p>
          <SpiceMeter level={dish.spice} size="md" label="word" />
        </Section>

        <Section title="Taste">
          <p className="text-[15px] leading-relaxed text-white">{dish.taste_overview}</p>
          {dish.familiar_comparison ? (
            <p className="rounded-2xl border border-primary/20 bg-primary/10 px-3.5 py-2.5 text-sm text-primary-100">
              <span className="font-semibold text-primary-200">Like: </span>
              {dish.familiar_comparison.replace(/^Like\s+/i, "")}
            </p>
          ) : null}
        </Section>

        <Section title="Ingredients">
          <div className="flex flex-wrap gap-1.5">
            {dish.key_ingredients.map((ingredient) => (
              <span key={ingredient} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[13px] capitalize text-white/85">
                {ingredient}
              </span>
            ))}
          </div>
        </Section>

        <Section title="Flavour profile">
          <div className="space-y-2">
            {flavors.map(([flavor, value]) => (
              <Bar key={flavor} label={FLAVOR_LABEL[flavor]} value={value} />
            ))}
            <Bar label={`Heaviness · ${HEAVINESS_META[dish.heaviness].label}`} value={HEAVINESS_LEVEL[dish.heaviness]} tone="cyan" />
          </div>
        </Section>

        {dish.india_style_note ? (
          <div className="flex gap-2.5 rounded-2xl border border-cyan/20 bg-cyan/10 px-3.5 py-3 text-sm leading-relaxed text-cyan">
            <Info className="mt-0.5 size-4 shrink-0" />
            <p>
              <span className="font-semibold">In India: </span>
              <span className="text-white/85">{dish.india_style_note}</span>
            </p>
          </div>
        ) : null}

        {dish.likely_allergens.length > 0 ? (
          <Section title="Likely allergens">
            <div className="flex flex-wrap gap-1.5">
              {dish.likely_allergens.map((allergen) => (
                <span key={allergen} className="rounded-full border border-danger/25 bg-danger-soft px-2.5 py-1 text-xs font-semibold text-[#FCA5A5]">
                  {ALLERGY_LABEL[allergen]}
                </span>
              ))}
            </div>
            <p className="text-xs text-subtle">AI estimate from the menu. Always confirm allergies with the restaurant.</p>
          </Section>
        ) : null}

        {dish.confidence !== "high" ? (
          <div className="flex gap-2.5 rounded-2xl border border-warning/25 bg-warning-soft px-3.5 py-3 text-sm">
            <MessageCircleQuestion className="mt-0.5 size-4 shrink-0 text-warning" />
            <div className="space-y-0.5">
              <p className="font-semibold text-warning">
                {dish.confidence === "low" ? "This one's a guess" : "Could vary here"} — ask the waiter
              </p>
              {dish.confidence_reason ? <p className="text-white/75">{dish.confidence_reason}</p> : null}
            </div>
          </div>
        ) : null}

        <Section title="Why this score">
          {match.warnings.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {match.warnings.map((warning) => (
                <FlagChip key={warning.kind + warning.text} warning={warning} />
              ))}
            </div>
          ) : null}
          <ul className="space-y-1.5 text-sm">
            <li className="flex justify-between text-subtle">
              <span>Starting point</span>
              <span className="tabular">50</span>
            </li>
            {match.breakdown.map((line) => (
              <li key={line.label} className="flex justify-between gap-3">
                <span className="text-white/80">{line.label}</span>
                <span className={cn("tabular font-semibold", line.delta >= 0 ? "text-success" : "text-[#F87171]")}>
                  {line.delta >= 0 ? "+" : "−"}
                  {Math.abs(line.delta)}
                </span>
              </li>
            ))}
            <li className="flex justify-between border-t border-white/[0.06] pt-1.5 font-semibold text-white">
              <span>Match</span>
              <span className="tabular">{match.excluded ? "Excluded" : `${match.score}%`}</span>
            </li>
          </ul>
        </Section>

        <Section title="Had it?">
          <div className="grid grid-cols-2 gap-2">
            <RateButton active={verdict === 1} onClick={() => rate(1)} tone="good">
              <ThumbsUp /> Loved it
            </RateButton>
            <RateButton active={verdict === -1} onClick={() => rate(-1)} tone="bad">
              <ThumbsDown /> Not for me
            </RateButton>
          </div>
        </Section>
      </div>
    </SheetContent>
  );
}

function Bar({ label, value, tone = "primary" }: { label: string; value: number; tone?: "primary" | "cyan" }) {
  return (
    <div className="grid grid-cols-[minmax(0,9.5rem)_1fr] items-center gap-3">
      <span className="truncate text-[13px] text-white/80">{label}</span>
      <div className="grid grid-cols-3 gap-1">
        {[1, 2, 3].map((step) => (
          <motion.span
            key={step}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.4, delay: step * 0.06, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "h-2 origin-left rounded-full",
              step <= value
                ? tone === "cyan"
                  ? "bg-gradient-to-r from-cyan to-cyan-bright"
                  : "bg-brand-gradient"
                : "bg-white/[0.08]",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function RateButton({
  active,
  tone,
  onClick,
  children,
}: {
  active: boolean;
  tone: "good" | "bad";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-12 items-center justify-center gap-2 rounded-full border text-sm font-semibold transition-colors [&_svg]:size-4",
        active
          ? tone === "good"
            ? "border-success/40 bg-success-soft text-success"
            : "border-danger/40 bg-danger-soft text-[#F87171]"
          : "border-white/[0.10] bg-white/[0.04] text-white hover:bg-white/[0.08]",
      )}
    >
      {children}
    </motion.button>
  );
}
