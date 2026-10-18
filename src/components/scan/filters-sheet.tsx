"use client";

import * as React from "react";

import { DietMark, DIET_WORD } from "@/components/food/diet-mark";
import { SpiceMeter } from "@/components/food/spice-meter";
import { DEFAULT_FILTERS, SORT_LABEL, type MenuFilters, type SortKey } from "@/components/scan/filters";
import { Chip } from "@/components/taste/chip";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ToggleRow } from "@/components/ui/toggle";
import type { ScoredDish } from "@/lib/match";
import { COURSE_LABEL, FLAVORS, spiceWord } from "@/lib/taste";
import type { Course, DishDiet } from "@/lib/types";
import { plural } from "@/lib/format";

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5 border-b border-white/[0.06] py-4 first:pt-1 last:border-0">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-subtle">{title}</h3>
      {children}
    </section>
  );
}

export function FiltersSheet({
  open,
  onOpenChange,
  filters,
  onChange,
  resultCount,
  ranked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: MenuFilters;
  onChange: (next: MenuFilters) => void;
  resultCount: number;
  ranked: ScoredDish[];
}) {
  const set = <K extends keyof MenuFilters>(key: K, value: MenuFilters[K]) => onChange({ ...filters, [key]: value });

  // Only offer the courses and diets this menu actually has.
  const courses = [...new Set(ranked.map((entry) => entry.dish.course))] as Course[];
  const diets = (["veg", "egg", "non_veg", "unknown"] as DishDiet[]).filter((diet) =>
    ranked.some((entry) => entry.dish.diet === diet),
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title="Filters"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => onChange(DEFAULT_FILTERS)}>
              Reset
            </Button>
            <Button className="flex-[2]" onClick={() => onOpenChange(false)}>
              Show {plural(resultCount, "dish", "dishes")}
            </Button>
          </div>
        }
      >
        <Group title="Sort">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
              <Chip key={key} selected={filters.sort === key} onClick={() => set("sort", key)}>
                {SORT_LABEL[key]}
              </Chip>
            ))}
          </div>
        </Group>

        <Group title="Diet">
          <div className="flex flex-wrap gap-2">
            {diets.map((diet) => (
              <Chip key={diet} selected={filters.diets.includes(diet)} onClick={() => set("diets", toggle(filters.diets, diet))}>
                <DietMark diet={diet} />
                {DIET_WORD[diet]}
              </Chip>
            ))}
          </div>
        </Group>

        <Group title="Max spice">
          <div className="flex items-center justify-between">
            <SpiceMeter level={filters.maxSpice} size="md" label="none" />
            <span className="text-sm text-white/85">
              <span className="tabular font-semibold">{filters.maxSpice}/5</span>
              <span className="text-muted-foreground"> · {spiceWord(filters.maxSpice)}</span>
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={5}
            step={1}
            value={filters.maxSpice}
            onChange={(event) => set("maxSpice", Number(event.target.value))}
            className="range-brand w-full"
            style={{ ["--fill" as string]: `${(filters.maxSpice / 5) * 100}%` }}
            aria-label="Maximum spice"
          />
        </Group>

        <Group title="Flavours">
          <div className="flex flex-wrap gap-2">
            {FLAVORS.map((flavor) => (
              <Chip key={flavor.id} selected={filters.flavors.includes(flavor.id)} onClick={() => set("flavors", toggle(filters.flavors, flavor.id))}>
                {flavor.label}
              </Chip>
            ))}
          </div>
        </Group>

        <Group title="Course">
          <div className="flex flex-wrap gap-2">
            {courses.map((course) => (
              <Chip key={course} selected={filters.courses.includes(course)} onClick={() => set("courses", toggle(filters.courses, course))}>
                {COURSE_LABEL[course]}
              </Chip>
            ))}
          </div>
        </Group>

        <Group title="Show">
          <ToggleRow label="Hide drinks" checked={filters.hideDrinks} onChange={(value) => set("hideDrinks", value)} />
          <ToggleRow
            label="Hide heads-up dishes"
            hint="Anything with your dislikes or allergies"
            checked={filters.hideHeadsUp}
            onChange={(value) => set("hideHeadsUp", value)}
          />
        </Group>
      </SheetContent>
    </Sheet>
  );
}
