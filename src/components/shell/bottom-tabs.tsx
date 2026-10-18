"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Camera, History, House, SlidersHorizontal, UserRound, type LucideIcon } from "lucide-react";

import { useScanPicker } from "@/components/providers/scan-picker";
import { cn } from "@/lib/utils";

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/history", label: "History", icon: History },
  { href: "/taste", label: "Taste", icon: SlidersHorizontal },
  { href: "/profile", label: "Profile", icon: UserRound },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/scan/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.08] bg-canvas/85 pb-safe backdrop-blur-2xl"
      aria-label="Primary"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-[64px] flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-300",
                  active ? "text-white" : "text-subtle hover:text-muted-foreground",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="tab-indicator"
                    className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-brand-gradient shadow-glow-sm"
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  />
                ) : null}
                <tab.icon
                  className={cn("size-[22px]", active ? "text-primary-300" : "text-subtle")}
                  strokeWidth={1.8}
                />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function ScanFab() {
  const { openSheet } = useScanPicker();

  return (
    <div className="bottom-safe-20 pointer-events-none fixed inset-x-0 z-30">
      <div className="mx-auto flex max-w-md justify-end px-gutter">
        <motion.button
          type="button"
          onClick={openSheet}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          whileTap={{ scale: 0.92 }}
          className="pointer-events-auto grid size-[60px] place-items-center rounded-3xl bg-brand-gradient shadow-[0_14px_40px_-8px_rgba(124,58,237,0.95)] ring-1 ring-white/15"
          aria-label="Scan a menu"
        >
          <Camera className="size-6 text-white" strokeWidth={2.2} />
        </motion.button>
      </div>
    </div>
  );
}
