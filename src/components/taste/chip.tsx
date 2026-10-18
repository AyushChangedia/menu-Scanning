"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/** Toggle chip that springs when tapped. */
export function Chip({
  selected,
  onClick,
  children,
  tone = "primary",
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "primary" | "danger";
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      whileTap={{ scale: 0.9 }}
      animate={{ scale: selected ? 1.02 : 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 22 }}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors",
        selected
          ? tone === "danger"
            ? "border-danger/50 bg-danger-soft text-[#FCA5A5]"
            : "border-primary/50 bg-primary/20 text-white"
          : "border-white/[0.10] bg-white/[0.03] text-muted-foreground hover:border-white/[0.18] hover:text-white",
        className,
      )}
    >
      {selected ? <Check className="size-3.5" strokeWidth={3} /> : null}
      {children}
    </motion.button>
  );
}
