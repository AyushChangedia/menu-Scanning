"use client";

import * as React from "react";
import { motion } from "framer-motion";

/** FluxFin's auth card: glass, gradient hairline, title block, optional footer. */
export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="glass glow-border relative overflow-hidden rounded-3xl"
      data-active="true"
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
      <div className="space-y-1.5 p-6 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="px-6 pb-6">{children}</div>
      {footer ? (
        <div className="border-t border-white/[0.06] px-6 py-5 text-center text-sm text-muted-foreground">{footer}</div>
      ) : null}
    </motion.div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  action,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </label>
        {action}
      </div>
      {children}
      {hint ? <p className="text-xs text-subtle">{hint}</p> : null}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5a11 11 0 0 0-9.82 6.05l3.66 2.84c.87-2.6 3.3-4.64 6.16-4.64Z" />
    </svg>
  );
}

export function GoogleButton({ label = "Continue with Google", onClick }: { label?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/[0.10] bg-white/[0.04] text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
    >
      <GoogleIcon />
      {label}
    </button>
  );
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span aria-hidden className="h-px flex-1 bg-white/[0.08]" />
      <span className="text-xs uppercase tracking-wider text-subtle">{label}</span>
      <span aria-hidden className="h-px flex-1 bg-white/[0.08]" />
    </div>
  );
}
