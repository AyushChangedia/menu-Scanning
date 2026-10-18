import * as React from "react";

import { cn } from "@/lib/utils";

/** Eyebrow · 32px title · muted subtitle — the FluxFin page title block. */
export function PageTitle({
  eyebrow,
  title,
  subtitle,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {eyebrow ? (
        <p className="min-h-4 text-xs font-semibold uppercase tracking-[0.28em] text-primary-300">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-balance text-[32px] font-bold leading-[1.1] tracking-tight text-white">
        {title}
      </h1>
      {subtitle ? (
        <p className="text-pretty text-base leading-relaxed text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}

export function SectionLabel({
  children,
  action,
  className,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {children}
      </h2>
      {action}
    </div>
  );
}
