"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, History, MoreHorizontal, Pencil, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAppState } from "@/components/providers/app-state";
import { useScanPicker } from "@/components/providers/scan-picker";
import { ScanThumb } from "@/components/scan/scan-thumb";
import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { pickForYou, rankDishes } from "@/lib/match";
import { formatWhen, plural } from "@/lib/format";
import type { Scan } from "@/lib/types";

export function HistoryView() {
  const { scans, deleteScan, renameScan } = useAppState();
  const { openSheet } = useScanPicker();
  const [renaming, setRenaming] = React.useState<Scan | null>(null);
  const [name, setName] = React.useState("");

  function remove(scan: Scan) {
    const undo = deleteScan(scan.id);
    toast(`Deleted ${scan.restaurantName ?? "Untitled menu"}`, {
      action: { label: "Undo", onClick: undo },
      duration: 6000,
    });
  }

  return (
    <div className="space-y-7">
      <PageTitle eyebrow="History" title="Menus you've scanned" subtitle="Tap one to see the picks again — no re-scan needed." />

      {scans.length === 0 ? (
        <EmptyState
          icon={History}
          title="No scans yet"
          description="Your decoded menus show up here, so you can pull them up again next time."
          action={
            <Button onClick={openSheet}>
              <Camera /> Scan a menu
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2.5">
          <AnimatePresence initial={false}>
            {scans.map((scan, index) => (
              <motion.li
                key={scan.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0, transition: { delay: index * 0.04 } }}
                exit={{ opacity: 0, x: -40, transition: { duration: 0.25 } }}
              >
                <HistoryRow
                  scan={scan}
                  onRename={() => {
                    setName(scan.restaurantName ?? "");
                    setRenaming(scan);
                  }}
                  onDelete={() => remove(scan)}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <Dialog open={renaming !== null} onOpenChange={(open) => (!open ? setRenaming(null) : undefined)}>
        <DialogContent size="sm">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (renaming) renameScan(renaming.id, name);
              setRenaming(null);
              toast.success("Renamed");
            }}
          >
            <DialogHeader>
              <DialogTitle>Rename scan</DialogTitle>
              <DialogDescription>Use the restaurant&apos;s name so you can find it later.</DialogDescription>
            </DialogHeader>
            <DialogBody>
              <Input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Restaurant name" maxLength={60} aria-label="Restaurant name" />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setRenaming(null)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HistoryRow({ scan, onRename, onDelete }: { scan: Scan; onRename: () => void; onDelete: () => void }) {
  const { prefs, feedback } = useAppState();
  const top = React.useMemo(() => pickForYou(rankDishes(scan.dishes, prefs, feedback)).items[0], [scan.dishes, prefs, feedback]);

  return (
    <div className="glass relative flex items-center gap-3.5 rounded-3xl p-3 pr-1.5">
      <Link href={`/scan/${scan.id}`} className="flex min-w-0 flex-1 items-center gap-3.5">
        <ScanThumb src={scan.thumbnail} className="size-16" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[15px] font-semibold text-white">{scan.restaurantName ?? "Untitled menu"}</p>
            {scan.status === "partial" ? (
              <span className="shrink-0 rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">Partial</span>
            ) : scan.status === "processing" ? (
              <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-200">Decoding</span>
            ) : null}
          </div>
          <p className="tabular truncate text-[13px] text-muted-foreground">
            {`${formatWhen(scan.createdAt)} · `}
            {plural(scan.dishes.length, "dish", "dishes")}
          </p>
          {top ? (
            <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-primary-200">
              <Sparkles className="size-3 shrink-0 text-primary-300" />
              <span className="truncate">{top.dish.name}</span>
            </p>
          ) : null}
        </div>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="grid size-11 shrink-0 place-items-center rounded-full text-subtle hover:bg-white/[0.06] hover:text-white" aria-label="More actions">
            <MoreHorizontal className="size-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={onRename}>
            <Pencil /> Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={onDelete}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
