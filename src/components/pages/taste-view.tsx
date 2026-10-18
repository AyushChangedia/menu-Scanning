"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ThumbsDown, ThumbsUp, X } from "lucide-react";
import { toast } from "sonner";

import { useAppState } from "@/components/providers/app-state";
import { PageTitle } from "@/components/shared/page-title";
import { AvoidPicker, DietPicker, FlavorGrid, HeavinessPicker, SpiceSelector } from "@/components/taste/controls";
import { Segmented } from "@/components/ui/segmented";
import { CUISINE_LABEL } from "@/lib/taste";
import type { TastePreference } from "@/lib/types";

function Block({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3.5">
      <div className="space-y-0.5">
        <h2 className="text-lg font-bold tracking-tight text-white">{title}</h2>
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function TasteView() {
  const { prefs, setPrefs, feedback, removeFeedback } = useAppState();
  const [ratedTab, setRatedTab] = React.useState<"loved" | "nope">("loved");
  const toastTimer = React.useRef<number | undefined>(undefined);

  // Auto-save: every change is applied immediately; the toast is debounced so
  // dragging through options doesn't stack a pile of them.
  function update(patch: Partial<TastePreference>) {
    setPrefs((prev) => ({ ...prev, ...patch }));
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => toast.success("Taste saved", { id: "taste-saved" }), 500);
  }

  const rated = feedback.filter((entry) => entry.verdict === (ratedTab === "loved" ? 1 : -1));

  return (
    <div className="space-y-10">
      <PageTitle eyebrow="Your taste" title="How you like it" subtitle="Changes save as you go and re-rank every menu instantly." />

      <Block title="Flavours you love" hint="Pick as many as you like.">
        <FlavorGrid value={prefs.flavors} onChange={(flavors) => update({ flavors })} />
      </Block>

      <Block title="Heat you can handle">
        <SpiceSelector value={prefs.spiceTolerance} onChange={(spiceTolerance) => update({ spiceTolerance })} />
      </Block>

      <Block title="How filling">
        <HeavinessPicker value={prefs.heaviness} onChange={(heaviness) => update({ heaviness })} />
      </Block>

      <Block title="What you eat">
        <DietPicker value={prefs.diet} onChange={(diet) => update({ diet })} />
      </Block>

      <Block title="Steer clear of">
        <AvoidPicker
          dislikes={prefs.dislikes}
          allergies={prefs.allergies}
          onDislikes={(dislikes) => update({ dislikes })}
          onAllergies={(allergies) => update({ allergies })}
        />
      </Block>

      <Block title="Dishes you rated" hint="Loved dishes rank higher next time; 'not for me' sinks them.">
        <Segmented
          layoutId="rated-tab"
          value={ratedTab}
          onChange={setRatedTab}
          options={[
            { value: "loved", label: <><ThumbsUp className="size-4" /> Loved</> },
            { value: "nope", label: <><ThumbsDown className="size-4" /> Not for me</> },
          ]}
        />
        {rated.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-white/[0.10] px-4 py-8 text-center text-sm text-subtle">
            Rate a dish from its detail sheet after you&apos;ve had it.
          </p>
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {rated.map((entry) => (
                <motion.li
                  key={entry.slug}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  className="glass flex items-center gap-3 rounded-3xl py-2.5 pl-4 pr-2"
                >
                  <span className={entry.verdict === 1 ? "text-success" : "text-[#F87171]"}>
                    {entry.verdict === 1 ? <ThumbsUp className="size-4" /> : <ThumbsDown className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">{entry.name}</span>
                    <span className="block text-xs text-subtle">{CUISINE_LABEL[entry.cuisine]}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFeedback(entry.slug)}
                    className="grid size-11 place-items-center rounded-full text-subtle hover:bg-white/[0.06] hover:text-white"
                    aria-label={`Remove rating for ${entry.name}`}
                  >
                    <X className="size-4" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Block>
    </div>
  );
}
