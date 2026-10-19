"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Flame, Info, KeyRound, Pencil, RotateCcw, Search, SearchX, SlidersHorizontal, Sparkles, TriangleAlert, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

import { useAppState } from "@/components/providers/app-state";
import { DishCard, PickCard } from "@/components/food/dish-card";
import { DishSheet } from "@/components/food/dish-sheet";
import { SpiceMeter } from "@/components/food/spice-meter";
import { DishCardSkeleton, ScanProgress } from "@/components/scan/scan-progress";
import { FiltersSheet } from "@/components/scan/filters-sheet";
import { DEFAULT_FILTERS, activeFilterCount, applyFilters, groupBySection, type MenuFilters } from "@/components/scan/filters";
import { EmptyState } from "@/components/shared/empty-state";
import { Chip } from "@/components/taste/chip";
import { Button, IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { isHeadsUp, pickForYou, rankDishes, type ScoredDish } from "@/lib/match";
import { plural } from "@/lib/format";
import { CUISINE_LABEL, FLAVORS, spiceWord, type FlavorId } from "@/lib/taste";
import { FLAVOR_ICON } from "@/lib/taste-icons";
import type { Scan } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "for-you" | "full";

function sameSet<T>(a: T[], b: T[]) {
  return a.length === b.length && a.every((item) => b.includes(item));
}

export function ResultsView({ id }: { id: string }) {
  const { scans, prefs, setPrefs, feedback } = useAppState();
  const scan = scans.find((entry) => entry.id === id);

  const [tab, setTab] = React.useState<Tab>("for-you");
  const [moodFlavors, setMoodFlavors] = React.useState<FlavorId[] | null>(null);
  const [moodSpice, setMoodSpice] = React.useState<number | null>(null);
  const [open, setOpen] = React.useState<ScoredDish | null>(null);
  const [query, setQuery] = React.useState("");
  const [filters, setFilters] = React.useState<MenuFilters>(DEFAULT_FILTERS);

  const flavors = moodFlavors ?? prefs.flavors;
  const spice = moodSpice ?? prefs.spiceTolerance;
  const moodChanged = !sameSet(flavors, prefs.flavors) || spice !== prefs.spiceTolerance;

  const ranked = React.useMemo(
    () => (scan ? rankDishes(scan.dishes, prefs, feedback, { flavors, spice }) : []),
    [scan, prefs, feedback, flavors, spice],
  );
  const forYou = React.useMemo(() => pickForYou(ranked), [ranked]);
  const menuCount = React.useMemo(() => applyFilters(ranked, filters, "").length, [ranked, filters]);

  // Keep the open sheet in sync with re-ranking (score changes as mood changes).
  const openEntry = open ? (ranked.find((entry) => entry.dish.id === open.dish.id) ?? open) : null;

  if (!scan) {
    return (
      <EmptyState
        icon={SearchX}
        title="This scan isn't on this device"
        description="It may have been deleted, or it was scanned on another phone or account."
        action={
          <Button asChild>
            <Link href="/history">Open history</Link>
          </Button>
        }
      />
    );
  }

  const stats = {
    picked: forYou.label === "Picked for you" ? forYou.items.length : 0,
    withinHeat: ranked.filter((entry) => !entry.match.excluded && entry.dish.course !== "drink" && entry.dish.spice <= spice).length,
    headsUp: ranked.filter((entry) => isHeadsUp(entry.match)).length,
  };

  const processing = scan.status === "processing";
  const pendingPages = scan.pages.filter((page) => page.status === "pending").length;

  function saveMood() {
    setPrefs((prev) => ({ ...prev, flavors, spiceTolerance: spice }));
    setMoodFlavors(null);
    setMoodSpice(null);
    toast.success("Saved as your default taste");
  }

  return (
    <div className="space-y-6">
      <ResultsHeader scan={scan} />

      {scan.source === "demo" ? <SampleNotice /> : null}
      <InviteRecovery scan={scan} />
      <ScanProgress scan={scan} />

      {scan.dishes.length > 0 ? (
        <>
          <div className="grid grid-cols-3 gap-2.5">
            <StatCard label="Picked for you" value={stats.picked} icon={Sparkles} tone="primary" />
            <StatCard label="Within your heat" value={stats.withinHeat} icon={Flame} tone="success" />
            <StatCard label="Heads-up" value={stats.headsUp} icon={TriangleAlert} tone="danger" />
          </div>

          <MoodPanel
            flavors={flavors}
            spice={spice}
            changed={moodChanged}
            onFlavors={setMoodFlavors}
            onSpice={setMoodSpice}
            onSave={saveMood}
            onReset={() => {
              setMoodFlavors(null);
              setMoodSpice(null);
            }}
          />

          <Segmented
            layoutId="results-tab"
            value={tab}
            onChange={setTab}
            options={[
              { value: "for-you", label: "For you" },
              { value: "full", label: <>Full menu <span className="tabular text-xs opacity-70">{menuCount}</span></> },
            ]}
          />

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              {tab === "for-you" ? (
                <ForYou label={forYou.label} items={forYou.items} pending={pendingPages} onOpen={setOpen} />
              ) : (
                <FullMenu
                  ranked={ranked}
                  pending={pendingPages}
                  onOpen={setOpen}
                  query={query}
                  onQuery={setQuery}
                  filters={filters}
                  onFilters={setFilters}
                />
              )}
            </motion.div>
          </AnimatePresence>

          <p className="px-4 text-center text-xs leading-relaxed text-subtle">
            Spice, ingredients and taste are AI estimates from the menu text.
          </p>
        </>
      ) : processing ? (
        <div className="space-y-3">
          {[0, 1, 2].map((key) => (
            <DishCardSkeleton key={key} />
          ))}
        </div>
      ) : scan.pages.some((page) => page.status === "failed") ? null : (
        <EmptyState
          icon={UtensilsCrossed}
          title="That doesn't look like a menu"
          description="We couldn't find any dishes on these photos. Try a sharper, straight-on shot of the menu page."
          action={
            <Button asChild>
              <Link href="/">Retake</Link>
            </Button>
          }
        />
      )}

      <DishSheet entry={openEntry} onClose={() => setOpen(null)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notices
// ---------------------------------------------------------------------------

/** Shown when the server has no AI key, so nobody mistakes a sample for their menu. */
function SampleNotice() {
  return (
    <div className="flex gap-3 rounded-3xl border border-cyan/25 bg-cyan/10 p-4 text-sm leading-relaxed">
      <Info className="mt-0.5 size-4 shrink-0 text-cyan" />
      <p className="text-white/85">
        <span className="font-semibold text-white">This is a sample menu, not your photo.</span> AI menu reading isn&apos;t
        switched on yet, so Forkcast shows example dishes to try the app with.
      </p>
    </div>
  );
}

/** When the server wants an invite code, ask for it here and retry the pages. */
function InviteRecovery({ scan }: { scan: Scan }) {
  const { setInvite, retryPage } = useAppState();
  const [code, setCode] = React.useState("");
  const blocked = scan.pages.filter((page) => page.status === "failed" && page.code === "invite_required");
  if (blocked.length === 0) return null;

  return (
    <form
      className="glass space-y-3 rounded-3xl p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!code.trim()) return;
        setInvite(code);
        blocked.forEach((page) => retryPage(scan.id, page.index));
      }}
    >
      <p className="flex items-center gap-2 text-[15px] font-semibold text-white">
        <KeyRound className="size-4 text-primary-300" />
        Enter the invite code to read menus
      </p>
      <p className="text-sm text-muted-foreground">Ask whoever shared Forkcast with you. You only need it once on this phone.</p>
      <div className="flex gap-2">
        <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Invite code" autoComplete="off" aria-label="Invite code" />
        <Button type="submit" className="shrink-0">
          Retry
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function ResultsHeader({ scan }: { scan: Scan }) {
  const router = useRouter();
  const { renameScan } = useAppState();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(scan.restaurantName ?? "");

  function commit() {
    renameScan(scan.id, draft);
    setEditing(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <IconButton
          label="Back"
          onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
        >
          <ArrowLeft />
        </IconButton>

        <div className="min-w-0 flex-1 pt-0.5">
          {editing ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                commit();
              }}
            >
              <Input
                autoFocus
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commit}
                placeholder="Restaurant name"
                maxLength={60}
                className="h-11 text-lg font-bold"
                aria-label="Restaurant name"
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(scan.restaurantName ?? "");
                setEditing(true);
              }}
              className="group flex max-w-full items-center gap-2 text-left"
              aria-label="Rename"
            >
              <h1 className={cn("truncate text-[26px] font-bold leading-tight tracking-tight", scan.restaurantName ? "text-white" : "text-white/60")}>
                {scan.restaurantName ?? "Untitled menu"}
              </h1>
              <Pencil className="size-4 shrink-0 text-subtle transition-colors group-hover:text-white" />
            </button>
          )}

          <p className="tabular mt-1 text-sm text-muted-foreground">
            {plural(scan.dishes.length, "dish", "dishes")} · {plural(scan.pageCount, "page")}
          </p>
        </div>
      </div>

      {scan.cuisines.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pl-14">
          {scan.cuisines.map((cuisine) => (
            <span key={cuisine} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-white/80">
              {CUISINE_LABEL[cuisine]}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Sparkles;
  tone: "primary" | "success" | "danger";
}) {
  const tile = {
    primary: "border-primary/30 bg-primary/15 text-primary-300",
    success: "border-success/30 bg-success-soft text-success",
    danger: "border-danger/30 bg-danger-soft text-[#F87171]",
  }[tone];

  return (
    <div className="glass rounded-3xl p-3.5">
      <span className={cn("grid size-8 place-items-center rounded-xl border", tile)}>
        <Icon className="size-4" strokeWidth={2.2} />
      </span>
      <p className="tabular mt-3 text-[28px] font-bold leading-none tracking-tight text-white">{value}</p>
      <p className="mt-1.5 text-[10px] font-semibold uppercase leading-tight tracking-[0.1em] text-subtle">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mood
// ---------------------------------------------------------------------------

function MoodPanel({
  flavors,
  spice,
  changed,
  onFlavors,
  onSpice,
  onSave,
  onReset,
}: {
  flavors: FlavorId[];
  spice: number;
  changed: boolean;
  onFlavors: (next: FlavorId[]) => void;
  onSpice: (next: number) => void;
  onSave: () => void;
  onReset: () => void;
}) {
  // Selected flavours first, so tonight's picks are visible without scrolling.
  const ordered = [...FLAVORS].sort((a, b) => Number(flavors.includes(b.id)) - Number(flavors.includes(a.id)));

  return (
    <section className="glass rounded-3xl p-4">
      <div className="flex min-h-9 items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-white">Tonight I&apos;m feeling…</h2>
        <AnimatePresence>
          {changed ? (
            <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="flex items-center">
              <button type="button" onClick={onReset} className="grid size-9 place-items-center rounded-full text-subtle hover:text-white" aria-label="Reset to my usual taste">
                <RotateCcw className="size-4" />
              </button>
              <button type="button" onClick={onSave} className="h-9 rounded-full px-2 text-sm font-semibold text-primary-300 hover:text-primary-200">
                Save as default
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="hide-scrollbar mask-fade-x -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 py-1">
        {ordered.map((flavor) => {
          const Icon = FLAVOR_ICON[flavor.id];
          const selected = flavors.includes(flavor.id);
          return (
            <Chip
              key={flavor.id}
              selected={selected}
              onClick={() => onFlavors(selected ? flavors.filter((item) => item !== flavor.id) : [...flavors, flavor.id])}
            >
              {!selected ? <Icon className="size-3.5" /> : null}
              {flavor.label}
            </Chip>
          );
        })}
      </div>

      <div className="mt-3 border-t border-white/[0.06] pt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">Heat up to</span>
          <SpiceMeter level={spice} label="word" />
        </div>
        <input
          type="range"
          min={0}
          max={5}
          step={1}
          value={spice}
          onChange={(event) => onSpice(Number(event.target.value))}
          className="range-brand w-full"
          style={{ ["--fill" as string]: `${(spice / 5) * 100}%` }}
          aria-label="Spice tolerance for tonight"
          aria-valuetext={`${spice} of 5, ${spiceWord(spice)}`}
        />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// For you
// ---------------------------------------------------------------------------

function ForYou({
  label,
  items,
  pending,
  onOpen,
}: {
  label: string;
  items: ScoredDish[];
  pending: number;
  onOpen: (entry: ScoredDish) => void;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={UtensilsCrossed}
        title="Nothing fits yet"
        description="Every dish here clashes with your diet or allergies. Check the full menu for the details."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-1">
        <h2 className="text-lg font-bold tracking-tight text-white">{label}</h2>
        {label === "Closest matches" ? <span className="text-xs text-subtle">Fewer than 3 dishes scored 60%+</span> : null}
      </div>
      {items.map((entry, rank) => (
        <PickCard key={entry.dish.id} entry={entry} rank={rank} onOpen={() => onOpen(entry)} />
      ))}
      {pending > 0 ? <DishCardSkeleton /> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Full menu
// ---------------------------------------------------------------------------

function FullMenu({
  ranked,
  pending,
  onOpen,
  query,
  onQuery: setQuery,
  filters,
  onFilters: setFilters,
}: {
  ranked: ScoredDish[];
  pending: number;
  onOpen: (entry: ScoredDish) => void;
  query: string;
  onQuery: (value: string) => void;
  filters: MenuFilters;
  onFilters: (value: MenuFilters) => void;
}) {
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const visible = React.useMemo(() => applyFilters(ranked, filters, query), [ranked, filters, query]);
  const hiddenDrinks =
    filters.hideDrinks && !filters.courses.includes("drink") ? ranked.filter((entry) => entry.dish.course === "drink").length : 0;
  const groups = filters.sort === "best" ? groupBySection(visible) : [{ section: "", items: visible }];
  const activeCount = activeFilterCount(filters);
  let index = 0;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search dishes or ingredients…"
          icon={<Search />}
          type="search"
          aria-label="Search dishes or ingredients"
        />
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className={cn(
            "relative flex h-11 shrink-0 items-center gap-2 rounded-2xl border px-3.5 text-sm font-semibold transition-colors",
            activeCount > 0 ? "border-primary/40 bg-primary/15 text-white" : "border-white/[0.10] bg-white/[0.03] text-white/85 hover:bg-white/[0.06]",
          )}
        >
          <SlidersHorizontal className="size-4" />
          Filters
          {activeCount > 0 ? (
            <span className="tabular grid size-5 place-items-center rounded-full bg-brand-gradient text-[11px]">{activeCount}</span>
          ) : null}
        </button>
      </div>

      {hiddenDrinks > 0 ? (
        <p className="flex items-center justify-between gap-3 px-1 text-[13px] text-subtle">
          <span>{plural(hiddenDrinks, "drink")} hidden</span>
          <button type="button" onClick={() => setFilters({ ...filters, hideDrinks: false })} className="h-9 rounded-full px-2 font-semibold text-primary-300 hover:text-primary-200">
            Show drinks
          </button>
        </p>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No dishes match"
          description="Try a different search, or loosen the filters."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery("");
                setFilters(DEFAULT_FILTERS);
              }}
            >
              Clear all
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.section || "all"} className="space-y-2.5">
              {group.section ? (
                <h3 className="sticky top-[calc(68px+env(safe-area-inset-top,0px))] z-10 -mx-2 rounded-2xl bg-canvas/85 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary-300 backdrop-blur-xl">
                  {group.section}
                  <span className="tabular ml-2 text-subtle">{group.items.length}</span>
                </h3>
              ) : null}
              {group.items.map((entry) => (
                <DishCard key={entry.dish.id} entry={entry} index={index++} onOpen={() => onOpen(entry)} />
              ))}
            </section>
          ))}
          {pending > 0 ? <DishCardSkeleton /> : null}
        </div>
      )}

      <FiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={filters}
        onChange={setFilters}
        resultCount={visible.length}
        ranked={ranked}
      />
    </div>
  );
}
