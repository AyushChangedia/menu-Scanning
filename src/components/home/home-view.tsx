"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, ChevronRight, ImagePlus, Images, Plus, Sparkles, X } from "lucide-react";

import { useAppState } from "@/components/providers/app-state";
import { InstallBanner } from "@/components/pwa/install";
import { MAX_PAGES, useScanPicker } from "@/components/providers/scan-picker";
import { SpiceMeter } from "@/components/food/spice-meter";
import { PageTitle, SectionLabel } from "@/components/shared/page-title";
import { ScanThumb } from "@/components/scan/scan-thumb";
import { Button } from "@/components/ui/button";
import { formatWhen, mealEyebrow, plural } from "@/lib/format";
import { ALLERGY_LABEL, DIET_META, FLAVOR_LABEL, HEAVINESS_META, spiceWord } from "@/lib/taste";
import { FLAVOR_ICON } from "@/lib/taste-icons";

export function HomeView() {
  const { user } = useAppState();
  const [eyebrow, setEyebrow] = React.useState<string | null>(null);
  React.useEffect(() => setEyebrow(mealEyebrow()), []);

  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-8">
      <PageTitle
        eyebrow={eyebrow ?? " "}
        title={`What's on the menu, ${firstName}?`}
        subtitle="Snap the menu. I'll decode the fancy names and pick what you'll like."
      />
      <ScanHero />
      <InstallBanner />
      <TasteCard />
      <RecentScans />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scan hero
// ---------------------------------------------------------------------------

function ScanHero() {
  const router = useRouter();
  const { draft, removeDraft, startScan } = useAppState();
  const { openCamera, openGallery } = useScanPicker();

  function decode() {
    const id = startScan();
    if (id) router.push(`/scan/${id}`);
  }

  return (
    <section className="gradient-ring animate-gradient-pan relative isolate overflow-hidden rounded-3xl p-5 shadow-glow">
      {/* Drifting orbs — decoration only. */}
      <div aria-hidden className="pointer-events-none absolute -left-16 -top-20 -z-10 size-56 animate-float rounded-full bg-primary-500/35 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-16 -z-10 size-56 animate-float-slow rounded-full bg-cyan/25 blur-3xl" />

      <AnimatePresence mode="wait" initial={false}>
        {draft.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="flex items-center gap-4">
              <span className="relative grid size-16 shrink-0 place-items-center">
                <span aria-hidden className="absolute inset-0 animate-pulse-ring rounded-3xl bg-primary-500/50" />
                <span className="relative grid size-16 place-items-center rounded-3xl bg-brand-gradient shadow-glow">
                  <Camera className="size-7 text-white" strokeWidth={2} />
                </span>
              </span>
              <div className="min-w-0">
                <h2 className="text-xl font-bold tracking-tight text-white">Scan a menu</h2>
                <p className="text-sm text-muted-foreground">Every page, every fancy name, decoded.</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <Button size="lg" onClick={openCamera}>
                <Camera /> Scan menu
              </Button>
              <Button size="lg" variant="secondary" onClick={openGallery}>
                <Images /> Upload photos
              </Button>
            </div>

            <p className="mt-4 text-center text-xs leading-relaxed text-subtle">
              Up to {MAX_PAGES} pages. Big menu? Shoot one section at a time — duplicates are merged.
            </p>
          </motion.div>
        ) : (
          <motion.div key="draft" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-bold tracking-tight text-white">{plural(draft.length, "page")} ready</h2>
              <span className="tabular text-xs text-subtle">
                {draft.length}/{MAX_PAGES}
              </span>
            </div>

            <div className="hide-scrollbar -mx-5 mt-2 flex gap-3 overflow-x-auto px-5 pb-1 pt-2.5">
              <AnimatePresence initial={false}>
                {draft.map((page, index) => (
                  <motion.div
                    key={page.id}
                    layout
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className="relative h-[120px] w-[90px] shrink-0"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                    <img src={page.preview} alt={`Page ${index + 1}`} className="size-full rounded-2xl border border-white/[0.10] object-cover" />
                    <span className="tabular absolute bottom-1.5 left-1.5 rounded-full bg-canvas/80 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                      {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeDraft(page.id)}
                      className="absolute -right-1.5 -top-1.5 grid size-7 place-items-center rounded-full border border-white/20 bg-canvas text-white shadow-lg"
                      aria-label={`Remove page ${index + 1}`}
                    >
                      <X className="size-3.5" strokeWidth={2.6} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {draft.length < MAX_PAGES ? (
                <button
                  type="button"
                  onClick={openCamera}
                  className="flex h-[120px] w-[90px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/20 bg-white/[0.03] px-2 text-center text-[11px] font-medium leading-tight text-muted-foreground transition-colors hover:border-primary/50 hover:text-white"
                >
                  <Plus className="size-5" />
                  Add another page
                </button>
              ) : null}
            </div>

            <Button size="lg" className="mt-4 w-full" onClick={decode}>
              <Sparkles /> Decode {plural(draft.length, "page")}
            </Button>
            <button type="button" onClick={openGallery} className="mt-2 flex h-11 w-full items-center justify-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-white">
              <ImagePlus className="size-4" /> Add from gallery
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Taste summary
// ---------------------------------------------------------------------------

function TasteCard() {
  const { prefs } = useAppState();

  return (
    <section className="glass rounded-3xl p-5">
      <SectionLabel
        action={
          <Link href="/taste" className="flex h-9 items-center rounded-full px-3 text-sm font-semibold text-primary-300 hover:text-primary-200">
            Edit
          </Link>
        }
      >
        Your taste
      </SectionLabel>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {prefs.flavors.length === 0 ? (
          <p className="text-sm text-subtle">No flavours picked yet.</p>
        ) : (
          prefs.flavors.map((flavor) => {
            const Icon = FLAVOR_ICON[flavor];
            return (
              <span key={flavor} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/15 px-3 text-[13px] font-medium text-primary-100">
                <Icon className="size-3.5 text-primary-300" />
                {FLAVOR_LABEL[flavor]}
              </span>
            );
          })
        )}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-4">
        <div className="space-y-1.5">
          <dt className="text-[11px] font-medium uppercase tracking-wider text-subtle">Heat</dt>
          <dd>
            <SpiceMeter level={prefs.spiceTolerance} label="none" />
            <span className="mt-1 block text-xs text-white/80 first-letter:uppercase">{spiceWord(prefs.spiceTolerance)}</span>
          </dd>
        </div>
        <div className="space-y-1.5">
          <dt className="text-[11px] font-medium uppercase tracking-wider text-subtle">Diet</dt>
          <dd className="text-sm font-semibold text-white">{DIET_META[prefs.diet].label}</dd>
        </div>
        <div className="space-y-1.5">
          <dt className="text-[11px] font-medium uppercase tracking-wider text-subtle">Filling</dt>
          <dd className="text-sm font-semibold text-white">{HEAVINESS_META[prefs.heaviness].label}</dd>
        </div>
      </dl>

      {prefs.dislikes.length > 0 || prefs.allergies.length > 0 ? (
        <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
          {prefs.dislikes.length > 0 ? <>Skipping {prefs.dislikes.join(", ")}</> : null}
          {prefs.dislikes.length > 0 && prefs.allergies.length > 0 ? " · " : null}
          {prefs.allergies.length > 0 ? (
            <span className="font-semibold text-[#F87171]">
              Allergic to {prefs.allergies.map((item) => ALLERGY_LABEL[item].toLowerCase()).join(", ")}
            </span>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Recent scans
// ---------------------------------------------------------------------------

function RecentScans() {
  const { scans, hydrated } = useAppState();
  const recent = scans.slice(0, 3);
  if (recent.length === 0) return null;

  return (
    <section className="space-y-3">
      <SectionLabel
        action={
          <Link href="/history" className="flex h-9 items-center rounded-full px-3 text-sm font-semibold text-primary-300 hover:text-primary-200">
            See all
          </Link>
        }
      >
        Recent
      </SectionLabel>
      <ul className="space-y-2.5">
        {recent.map((scan, index) => (
          <motion.li key={scan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04, duration: 0.4 }}>
            <Link href={`/scan/${scan.id}`} className="glass flex items-center gap-3.5 rounded-3xl p-3 pr-4 transition-colors hover:border-white/[0.14]">
              <ScanThumb src={scan.thumbnail} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-white">{scan.restaurantName ?? "Untitled menu"}</p>
                <p className="truncate text-[13px] text-muted-foreground">
                  {scan.status === "processing" ? "Decoding…" : plural(scan.dishes.length, "dish", "dishes")}
                  {hydrated ? ` · ${formatWhen(scan.createdAt)}` : null}
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-subtle" />
            </Link>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
