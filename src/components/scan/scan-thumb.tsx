import { cn } from "@/lib/utils";

/** Page-1 thumbnail, or a drawn menu card when there's no photo. */
export function ScanThumb({ src, className }: { src: string | null; className?: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- local data/object URLs
      <img src={src} alt="" className={cn("size-14 shrink-0 rounded-2xl border border-white/[0.08] object-cover", className)} />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "relative flex size-14 shrink-0 flex-col items-center justify-center gap-[3px] overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#1b1530] to-[#0f1a2b]",
        className,
      )}
    >
      <span className="mb-0.5 h-[3px] w-6 rounded-full bg-primary-300/70" />
      {[18, 26, 22, 26, 16].map((width, index) => (
        <span key={index} className="h-[2px] rounded-full bg-white/25" style={{ width }} />
      ))}
    </span>
  );
}
