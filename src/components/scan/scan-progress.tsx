"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Ban, Check, Loader2, RotateCcw, TriangleAlert } from "lucide-react";

import { useAppState } from "@/components/providers/app-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { Scan } from "@/lib/types";
import { cn } from "@/lib/utils";

const LINES = [
  "Decoding fancy names…",
  "Asking the chef what 'Volcano' means…",
  "Counting chillies…",
  "Spotting the paneer swaps…",
  "Reading the tiny print…",
];

/** Live progress while pages are being read, plus per-page retry. */
export function ScanProgress({ scan }: { scan: Scan }) {
  const { retryPage } = useAppState();
  const [line, setLine] = React.useState(0);
  const processing = scan.status === "processing";

  React.useEffect(() => {
    if (!processing) return;
    const timer = window.setInterval(() => setLine((value) => (value + 1) % LINES.length), 2200);
    return () => window.clearInterval(timer);
  }, [processing]);

  const settled = scan.pages.filter((page) => page.status !== "pending").length;
  const failed = scan.pages.filter((page) => page.status === "failed");
  const notMenu = scan.pages.filter((page) => page.status === "not_menu");
  const current = Math.min(settled + 1, scan.pageCount);

  if (!processing && failed.length === 0 && notMenu.length === 0) return null;

  return (
    <section className="glass relative overflow-hidden rounded-3xl p-5">
      {processing ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[15px] font-semibold text-white">
              Reading page <span className="tabular">{current}</span> of <span className="tabular">{scan.pageCount}</span>…
            </p>
            <Loader2 className="size-4 animate-spin text-primary-300" />
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className="h-full rounded-full bg-brand-gradient shadow-glow-sm"
              initial={{ width: "6%" }}
              animate={{ width: `${Math.max(6, (settled / scan.pageCount) * 100)}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <div className="relative mt-3 h-5 overflow-hidden text-sm text-muted-foreground">
            <AnimatePresence mode="wait">
              <motion.p className="truncate" key={line} initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={{ duration: 0.3 }}>
                {LINES[line]}
              </motion.p>
            </AnimatePresence>
          </div>
        </>
      ) : (
        <p className="flex items-center gap-2 text-[15px] font-semibold text-warning">
          <TriangleAlert className="size-4" />
          {failed.length === 0
            ? notMenu.length === 1
              ? "One photo wasn't a menu"
              : `${notMenu.length} photos weren't menus`
            : failed.length === 1
              ? "One page wasn't read"
              : `${failed.length} pages weren't read`}
        </p>
      )}

      <ul className="mt-4 space-y-2">
        {scan.pages.map((page) => (
          <li
            key={page.index}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-2xl border px-3 py-2",
              page.status === "failed" || page.status === "not_menu" ? "border-warning/25 bg-warning-soft" : "border-white/[0.06] bg-white/[0.02]",
            )}
          >
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full",
                page.status === "done" && "bg-success-soft text-success",
                page.status === "pending" && "bg-primary/15 text-primary-300",
                (page.status === "failed" || page.status === "not_menu") && "bg-warning/20 text-warning",
              )}
            >
              {page.status === "done" ? (
                <Check className="size-3.5" strokeWidth={3} />
              ) : page.status === "pending" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : page.status === "not_menu" ? (
                <Ban className="size-3.5" />
              ) : (
                <TriangleAlert className="size-3.5" />
              )}
            </span>
            <span className="min-w-0 flex-1 text-sm">
              <span className="font-medium text-white">Page {page.index + 1}</span>
              <span className="text-muted-foreground">
                {" · "}
                {page.status === "done"
                  ? "Decoded"
                  : page.status === "pending"
                    ? "Reading…"
                    : page.status === "not_menu"
                      ? "Doesn't look like a menu"
                      : (page.error ?? "Not analysed — re-upload")}
              </span>
            </span>
            {page.status === "failed" && page.code !== "gone" && page.code !== "invite_required" && page.code !== "bad_type" ? (
              <button
                type="button"
                onClick={() => retryPage(scan.id, page.index)}
                className="flex h-9 items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.06] px-3 text-xs font-semibold text-white hover:bg-white/[0.1]"
              >
                <RotateCcw className="size-3.5" /> Retry
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Shimmer placeholders shaped like real dish cards. */
export function DishCardSkeleton() {
  return (
    <div className="glass space-y-3 rounded-3xl p-4">
      <div className="flex items-center gap-2.5">
        <Skeleton className="size-4 rounded-[3px]" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-12" />
      </div>
      <div className="flex gap-2 pl-[26px]">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-11 rounded-full" />
      </div>
      <Skeleton className="ml-[26px] h-3.5 w-[80%]" />
    </div>
  );
}
