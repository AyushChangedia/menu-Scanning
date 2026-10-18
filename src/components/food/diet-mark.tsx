import type { DishDiet } from "@/lib/types";
import { cn } from "@/lib/utils";

const LABEL: Record<DishDiet, string> = {
  veg: "Vegetarian",
  egg: "Contains egg",
  non_veg: "Non-vegetarian",
  unknown: "Diet unclear",
};

/** Indian FSSAI-style diet square. */
export function DietMark({ diet, className }: { diet: DishDiet; className?: string }) {
  const base = "relative grid size-4 shrink-0 place-items-center rounded-[3px] border-[1.5px] bg-canvas/60";

  return (
    <span role="img" aria-label={LABEL[diet]} title={LABEL[diet]} className={cn("inline-grid", className)}>
      {diet === "veg" ? (
        <span className={cn(base, "border-[#22C55E]")}>
          <span className="size-[7px] rounded-full bg-[#22C55E]" />
        </span>
      ) : diet === "egg" ? (
        <span className={cn(base, "border-[#F59E0B]")}>
          <span className="size-[7px] rounded-full bg-[#F59E0B]" />
        </span>
      ) : diet === "non_veg" ? (
        <span className={cn(base, "border-[#B4432F]")}>
          <svg viewBox="0 0 10 10" className="size-[8px]" aria-hidden>
            <path d="M5 1.2 9 8.6H1Z" fill="#C2492F" />
          </svg>
        </span>
      ) : (
        <span className={cn(base, "border-dashed border-white/40 text-[9px] font-bold leading-none text-white/60")}>?</span>
      )}
    </span>
  );
}

export const DIET_WORD: Record<DishDiet, string> = {
  veg: "Veg",
  egg: "Egg",
  non_veg: "Non-veg",
  unknown: "Diet unclear",
};
