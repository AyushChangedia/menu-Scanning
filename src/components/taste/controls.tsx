"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check, Feather, Plus, Scale, Soup } from "lucide-react";

import { Chip } from "@/components/taste/chip";
import { DietMark } from "@/components/food/diet-mark";
import { SpiceMeter } from "@/components/food/spice-meter";
import { Input } from "@/components/ui/input";
import {
  ALLERGY_LABEL,
  ALLERGY_OPTIONS,
  DIETS,
  DIET_META,
  DISLIKE_OPTIONS,
  FLAVORS,
  HEAVINESS,
  HEAVINESS_META,
  SPICE_LEVELS,
  type FlavorId,
} from "@/lib/taste";
import { FLAVOR_ICON } from "@/lib/taste-icons";
import type { Allergen, Diet, Heaviness } from "@/lib/types";
import { cn } from "@/lib/utils";

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

// ---------------------------------------------------------------------------
// Flavours
// ---------------------------------------------------------------------------

export function FlavorGrid({ value, onChange }: { value: FlavorId[]; onChange: (next: FlavorId[]) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {FLAVORS.map((flavor) => {
        const Icon = FLAVOR_ICON[flavor.id];
        const selected = value.includes(flavor.id);
        return (
          <motion.button
            key={flavor.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(toggle(value, flavor.id))}
            whileTap={{ scale: 0.94 }}
            animate={{ scale: selected ? 1.02 : 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 24 }}
            className={cn(
              "relative flex min-h-[92px] flex-col items-start gap-2 rounded-3xl border p-3.5 text-left transition-colors",
              selected
                ? "border-primary/50 bg-gradient-to-br from-primary/25 via-primary/10 to-cyan/10 shadow-glow-sm"
                : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.16]",
            )}
          >
            <span
              className={cn(
                "grid size-9 place-items-center rounded-xl",
                selected ? "bg-brand-gradient text-white" : "bg-white/[0.06] text-muted-foreground",
              )}
            >
              <Icon className="size-[18px]" strokeWidth={2} />
            </span>
            <span className="w-full min-w-0">
              <span className="block text-sm font-semibold text-white">{flavor.label}</span>
              <span className="block truncate text-xs text-subtle">{flavor.hint}</span>
            </span>
            {selected ? (
              <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-white text-primary-700">
                <Check className="size-3" strokeWidth={3.5} />
              </span>
            ) : null}
          </motion.button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Heat
// ---------------------------------------------------------------------------

export function SpiceSelector({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <div className="space-y-2" role="radiogroup" aria-label="Spice tolerance">
      {SPICE_LEVELS.map((level) => {
        const selected = level.level === value;
        return (
          <button
            key={level.level}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(level.level)}
            className={cn(
              "flex w-full items-center gap-3 rounded-3xl border p-3.5 text-left transition-all duration-300",
              selected
                ? "gradient-border-static shadow-glow-sm"
                : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.16]",
            )}
          >
            <span
              className={cn(
                "tabular grid size-9 shrink-0 place-items-center rounded-xl text-sm font-bold",
                selected ? "bg-brand-gradient text-white" : "bg-white/[0.06] text-muted-foreground",
              )}
            >
              {level.level}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-white first-letter:uppercase">{level.word}</span>
                <SpiceMeter level={level.level} label="none" />
              </span>
              <span className="mt-0.5 block truncate text-xs text-subtle">{level.anchors.join(" · ")}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Heaviness
// ---------------------------------------------------------------------------

const HEAVINESS_ICON = { light: Feather, balanced: Scale, indulgent: Soup } as const;

export function HeavinessPicker({ value, onChange }: { value: Heaviness; onChange: (next: Heaviness) => void }) {
  return (
    <div className="grid gap-2.5" role="radiogroup" aria-label="How filling">
      {HEAVINESS.map((option) => {
        const Icon = HEAVINESS_ICON[option];
        const selected = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option)}
            className={cn(
              "flex items-center gap-3.5 rounded-3xl border p-4 text-left transition-all duration-300",
              selected ? "gradient-border-static shadow-glow-sm" : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.16]",
            )}
          >
            <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", selected ? "bg-brand-gradient text-white" : "bg-white/[0.06] text-muted-foreground")}>
              <Icon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-white">{HEAVINESS_META[option].label}</span>
              <span className="block text-sm text-muted-foreground">{HEAVINESS_META[option].hint}</span>
            </span>
            <RadioDot selected={selected} />
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Diet
// ---------------------------------------------------------------------------

const DIET_PREVIEW: Record<Diet, React.ReactNode> = {
  veg: <DietMark diet="veg" />,
  eggetarian: (
    <span className="flex gap-1">
      <DietMark diet="veg" />
      <DietMark diet="egg" />
    </span>
  ),
  non_veg: (
    <span className="flex gap-1">
      <DietMark diet="veg" />
      <DietMark diet="egg" />
      <DietMark diet="non_veg" />
    </span>
  ),
  vegan: <DietMark diet="veg" />,
  jain: <DietMark diet="veg" />,
};

export function DietPicker({ value, onChange }: { value: Diet; onChange: (next: Diet) => void }) {
  return (
    <div className="grid gap-2.5" role="radiogroup" aria-label="Diet">
      {DIETS.map((option) => {
        const selected = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option)}
            className={cn(
              "flex min-h-[64px] items-center gap-3.5 rounded-3xl border px-4 py-3 text-left transition-all duration-300",
              selected ? "gradient-border-static shadow-glow-sm" : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.16]",
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-white">{DIET_META[option].label}</span>
              <span className="block text-sm text-muted-foreground">{DIET_META[option].hint}</span>
            </span>
            {DIET_PREVIEW[option]}
            <RadioDot selected={selected} />
          </button>
        );
      })}
    </div>
  );
}

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors", selected ? "border-primary-400 bg-primary-500" : "border-white/20")}>
      {selected ? <Check className="size-3.5 text-white" strokeWidth={3.5} /> : null}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Dislikes & allergies
// ---------------------------------------------------------------------------

export function AvoidPicker({
  dislikes,
  allergies,
  onDislikes,
  onAllergies,
}: {
  dislikes: string[];
  allergies: Allergen[];
  onDislikes: (next: string[]) => void;
  onAllergies: (next: Allergen[]) => void;
}) {
  const [custom, setCustom] = React.useState("");
  const options = [...DISLIKE_OPTIONS, ...dislikes.filter((item) => !DISLIKE_OPTIONS.includes(item))];

  function addCustom(event: React.FormEvent) {
    event.preventDefault();
    const value = custom.trim().toLowerCase();
    if (!value) return;
    if (!dislikes.includes(value)) onDislikes([...dislikes, value]);
    setCustom("");
  }

  return (
    <div className="space-y-7">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white">Don&apos;t like</h3>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <Chip key={option} selected={dislikes.includes(option)} onClick={() => onDislikes(toggle(dislikes, option))}>
              <span className="capitalize">{option}</span>
            </Chip>
          ))}
        </div>
        <form onSubmit={addCustom} className="flex gap-2">
          <Input value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="Add something else, e.g. beetroot" maxLength={30} aria-label="Add a dislike" />
          <button type="submit" className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/[0.10] bg-white/[0.04] text-white transition-colors hover:bg-white/[0.08]" aria-label="Add">
            <Plus className="size-4" />
          </button>
        </form>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white">Allergic to</h3>
        <div className="flex flex-wrap gap-2">
          {ALLERGY_OPTIONS.map((option) => (
            <Chip key={option} tone="danger" selected={allergies.includes(option)} onClick={() => onAllergies(toggle(allergies, option))}>
              {ALLERGY_LABEL[option]}
            </Chip>
          ))}
        </div>
        <p className="rounded-2xl border border-warning/20 bg-warning-soft px-3.5 py-3 text-[13px] leading-relaxed text-warning">
          Ingredients are AI estimates from the menu. Always confirm allergies with the restaurant.
        </p>
      </div>
    </div>
  );
}
