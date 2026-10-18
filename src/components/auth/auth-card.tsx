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
  error,
  action,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
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
      {error ? (
        <p className="text-xs text-[#F87171]" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

/** Inline error banner above a form. */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <motion.p
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      role="alert"
      className="rounded-2xl border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-sm text-[#FCA5A5]"
    >
      {message}
    </motion.p>
  );
}
