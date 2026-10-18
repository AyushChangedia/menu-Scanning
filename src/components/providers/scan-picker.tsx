"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Camera, Images } from "lucide-react";
import { toast } from "sonner";

import { useAppState, type DraftPage } from "@/components/providers/app-state";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { makeThumbnail } from "@/lib/image";

export const MAX_PAGES = 6;

type ScanPicker = {
  openCamera: () => void;
  openGallery: () => void;
  openSheet: () => void;
};

const ScanPickerContext = React.createContext<ScanPicker | null>(null);

/**
 * Owns the two hidden file inputs. "Scan menu" uses `capture="environment"`,
 * which on iOS opens the camera for one photo at a time; "Upload photos"
 * allows multi-select from the gallery.
 */
export function ScanPickerProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { draft, addDraft } = useAppState();
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const galleryRef = React.useRef<HTMLInputElement>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const room = MAX_PAGES - draft.length;
    if (room <= 0) {
      toast.error(`Up to ${MAX_PAGES} pages per scan.`);
      return;
    }
    if (files.length > room) toast.warning(`Only the first ${room} added — ${MAX_PAGES} pages max.`);

    const pages: DraftPage[] = [];
    for (const file of files.slice(0, room)) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} isn't a photo.`);
        continue;
      }
      try {
        const preview = await makeThumbnail(file);
        pages.push({ id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`, file, preview });
      } catch {
        toast.error("Couldn't read this photo format — try a JPEG or a screenshot.");
      }
    }
    if (pages.length === 0) return;

    addDraft(pages);
    if (pathname !== "/") router.push("/");
  }

  const value = React.useMemo<ScanPicker>(
    () => ({
      openCamera: () => cameraRef.current?.click(),
      openGallery: () => galleryRef.current?.click(),
      openSheet: () => setSheetOpen(true),
    }),
    [],
  );

  return (
    <ScanPickerContext.Provider value={value}>
      {children}

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={handleFiles} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-hidden onChange={handleFiles} />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent title="Scan a menu" description="Shoot each page, or pick photos you already took.">
          <div className="grid gap-3">
            <PickerOption
              icon={Camera}
              title="Take photos"
              hint="One page at a time — add more after each shot"
              primary
              onClick={() => {
                cameraRef.current?.click();
                setSheetOpen(false);
              }}
            />
            <PickerOption
              icon={Images}
              title="Choose from gallery"
              hint={`Select up to ${MAX_PAGES} pages at once`}
              onClick={() => {
                galleryRef.current?.click();
                setSheetOpen(false);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </ScanPickerContext.Provider>
  );
}

function PickerOption({
  icon: Icon,
  title,
  hint,
  primary,
  onClick,
}: {
  icon: typeof Camera;
  title: string;
  hint: string;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-4 rounded-3xl border border-white/[0.08] bg-white/[0.03] p-4 text-left transition-colors hover:border-white/[0.16] hover:bg-white/[0.06] active:scale-[0.99]"
    >
      <span
        className={
          primary
            ? "grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-gradient shadow-glow-sm"
            : "grid size-12 shrink-0 place-items-center rounded-2xl border border-white/[0.10] bg-white/[0.05]"
        }
      >
        <Icon className="size-5 text-white" />
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold text-white">{title}</span>
        <span className="block text-sm text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}

export function useScanPicker(): ScanPicker {
  const context = React.useContext(ScanPickerContext);
  if (!context) throw new Error("useScanPicker must be used inside <ScanPickerProvider>.");
  return context;
}
