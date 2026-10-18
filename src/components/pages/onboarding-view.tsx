"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";

import { useAppState } from "@/components/providers/app-state";
import { GradientBlobs } from "@/components/shared/gradient-blobs";
import { LogoTile } from "@/components/shared/logo";
import { AvoidPicker, DietPicker, FlavorGrid, HeavinessPicker, SpiceSelector } from "@/components/taste/controls";
import { Button } from "@/components/ui/button";
import type { TastePreference } from "@/lib/types";

type Step = {
  title: string;
  subtitle: string;
  skippable: boolean;
  render: (draft: TastePreference, update: (patch: Partial<TastePreference>) => void) => React.ReactNode;
};

const STEPS: Step[] = [
  {
    title: "How do you like your dishes?",
    subtitle: "Pick every flavour you'd happily order. At least one.",
    skippable: false,
    render: (draft, update) => <FlavorGrid value={draft.flavors} onChange={(flavors) => update({ flavors })} />,
  },
  {
    title: "How much heat can you handle?",
    subtitle: "Rated for an Indian palate, against dishes you already know.",
    skippable: false,
    render: (draft, update) => (
      <SpiceSelector value={draft.spiceTolerance} onChange={(spiceTolerance) => update({ spiceTolerance })} />
    ),
  },
  {
    title: "How filling do you like it?",
    subtitle: "We'll nudge the picks towards your kind of meal.",
    skippable: true,
    render: (draft, update) => <HeavinessPicker value={draft.heaviness} onChange={(heaviness) => update({ heaviness })} />,
  },
  {
    title: "What do you eat?",
    subtitle: "Dishes outside your diet never show up in your picks.",
    skippable: true,
    render: (draft, update) => <DietPicker value={draft.diet} onChange={(diet) => update({ diet })} />,
  },
  {
    title: "Anything to steer clear of?",
    subtitle: "Dislikes sink a dish. Allergies flag it loudly.",
    skippable: true,
    render: (draft, update) => (
      <AvoidPicker
        dislikes={draft.dislikes}
        allergies={draft.allergies}
        onDislikes={(dislikes) => update({ dislikes })}
        onAllergies={(allergies) => update({ allergies })}
      />
    ),
  },
];

export function OnboardingView() {
  const router = useRouter();
  const { prefs, setPrefs, setOnboarded, hydrated } = useAppState();
  const [step, setStep] = React.useState(0);
  const [direction, setDirection] = React.useState(1);
  const [draft, setDraft] = React.useState<TastePreference>(prefs);

  // Pick up stored prefs once localStorage has been read.
  React.useEffect(() => {
    if (hydrated) setDraft(prefs);
    // Only on hydration — later edits live in the draft until Finish.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const current = STEPS[step];
  const last = step === STEPS.length - 1;
  const canContinue = step !== 0 || draft.flavors.length > 0;

  function go(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
    window.scrollTo({ top: 0 });
  }

  function finish() {
    setPrefs(draft);
    setOnboarded(true);
    toast.success("You're all set — go scan a menu");
    router.push("/");
  }

  return (
    <div className="relative min-h-dvh">
      <GradientBlobs variant="subtle" />

      <header className="sticky top-0 z-30 bg-canvas/75 pt-safe backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-md items-center gap-3 px-gutter">
          <LogoTile />
          <span className="tabular text-sm font-medium text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </span>
          {current.skippable && !last ? (
            <button type="button" onClick={() => go(step + 1)} className="ml-auto h-11 rounded-full px-4 text-sm font-semibold text-muted-foreground hover:text-white">
              Skip
            </button>
          ) : current.skippable && last ? (
            <button type="button" onClick={finish} className="ml-auto h-11 rounded-full px-4 text-sm font-semibold text-muted-foreground hover:text-white">
              Skip
            </button>
          ) : null}
        </div>
        <div className="mx-auto max-w-md px-gutter pb-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
            <motion.div
              className="h-full rounded-full bg-brand-gradient shadow-glow-sm"
              animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md overflow-x-hidden px-gutter pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))] pt-4">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -32 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <h1 className="text-balance text-[32px] font-bold leading-[1.1] tracking-tight text-white">{current.title}</h1>
              <p className="text-base text-muted-foreground">{current.subtitle}</p>
            </div>
            {current.render(draft, (patch) => setDraft((prev) => ({ ...prev, ...patch })))}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.06] bg-canvas/85 pb-safe backdrop-blur-2xl">
        <div className="mx-auto flex max-w-md gap-2.5 px-gutter py-4">
          {step > 0 ? (
            <Button variant="secondary" size="lg" className="w-14 shrink-0 px-0" onClick={() => go(step - 1)} aria-label="Back">
              <ArrowLeft />
            </Button>
          ) : null}
          <Button size="lg" className="flex-1" disabled={!canContinue} onClick={() => (last ? finish() : go(step + 1))}>
            {last ? (
              <>
                Finish <Check />
              </>
            ) : canContinue ? (
              <>
                Continue <ArrowRight />
              </>
            ) : (
              "Pick at least one flavour"
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}
