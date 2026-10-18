"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronRight, KeyRound, LogOut, Mail, RotateCcw, ScanLine, Trash2, User } from "lucide-react";
import { toast } from "sonner";

import { useAppState } from "@/components/providers/app-state";
import { InstallRow } from "@/components/pwa/install";
import { PageTitle, SectionLabel } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { initials } from "@/lib/utils";

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

export function ProfileView() {
  const router = useRouter();
  const { user, usage, setOnboarded } = useAppState();
  const [name, setName] = React.useState(user.name);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [confirm, setConfirm] = React.useState("");

  React.useEffect(() => setName(user.name), [user.name]);

  const remaining = Math.max(0, usage.limit - usage.used);
  const percent = (usage.used / usage.limit) * 100;

  return (
    <div className="space-y-7">
      <PageTitle eyebrow="Profile" title="Your account" />

      <section className="glass flex items-center gap-4 rounded-3xl p-5">
        <span className="grid size-16 shrink-0 place-items-center rounded-full bg-brand-gradient text-xl font-bold text-white shadow-glow">
          {initials(user.name, user.email)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-white">{user.name}</p>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
      </section>

      {/* Daily allowance */}
      <section className="glass rounded-3xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">Scans left today</p>
            <p className="tabular mt-2 text-[32px] font-bold leading-none text-white">
              {remaining}
              <span className="text-base font-medium text-subtle"> / {usage.limit} pages</span>
            </p>
          </div>
          <span className="grid size-10 place-items-center rounded-xl border border-primary/30 bg-primary/15 text-primary-300">
            <ScanLine className="size-5" />
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            className="h-full rounded-full bg-brand-gradient shadow-glow-sm"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <p className="mt-2 text-xs text-subtle">Resets at midnight, India time. Re-opening a past scan is free.</p>
      </section>

      {/* Name */}
      <section className="space-y-3">
        <SectionLabel>Details</SectionLabel>
        <form
          className="glass space-y-4 rounded-3xl p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim().length < 2) {
              toast.error("Enter your name");
              return;
            }
            user.setName(name.trim());
            toast.success("Name updated");
          }}
        >
          <Field label="Name" htmlFor="name">
            <Input id="name" value={name} onChange={(event) => setName(event.target.value)} icon={<User />} autoComplete="name" />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input id="email" value={user.email} icon={<Mail />} disabled readOnly />
          </Field>
          <Button type="submit" variant="secondary" className="w-full" disabled={name.trim() === user.name}>
            Save
          </Button>
        </form>
      </section>

      {/* Password */}
      <section className="space-y-3">
        <SectionLabel>Password</SectionLabel>
        <form
          className="glass space-y-4 rounded-3xl p-5"
          onSubmit={(event) => {
            event.preventDefault();
            event.currentTarget.reset();
            toast.success("Password updated");
          }}
        >
          <Field label="Current password" htmlFor="current">
            <Input id="current" type="password" icon={<KeyRound />} autoComplete="current-password" placeholder="••••••••" required />
          </Field>
          <Field label="New password" htmlFor="new">
            <Input id="new" type="password" icon={<KeyRound />} autoComplete="new-password" placeholder="At least 8 characters" minLength={8} required />
          </Field>
          <Button type="submit" variant="secondary" className="w-full">
            Change password
          </Button>
        </form>
      </section>

      {/* Actions */}
      <section className="glass divide-y divide-white/[0.06] overflow-hidden rounded-3xl">
        <InstallRow />
        <Link
          href="/onboarding"
          onClick={() => setOnboarded(false)}
          className="flex min-h-14 items-center gap-3 px-5 text-sm font-medium text-white hover:bg-white/[0.03]"
        >
          <RotateCcw className="size-4 text-primary-300" />
          Redo taste onboarding
          <ChevronRight className="ml-auto size-4 text-subtle" />
        </Link>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="flex min-h-14 w-full items-center gap-3 px-5 text-left text-sm font-medium text-white hover:bg-white/[0.03]"
        >
          <LogOut className="size-4 text-muted-foreground" />
          Sign out
        </button>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="flex min-h-14 w-full items-center gap-3 px-5 text-left text-sm font-medium text-danger hover:bg-danger/[0.06]"
        >
          <Trash2 className="size-4" />
          Delete account
        </button>
      </section>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This removes your taste profile, every scan and every rating. It can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Input value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Type DELETE to confirm" aria-label="Type DELETE to confirm" />
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={confirm.trim().toUpperCase() !== "DELETE"}
              onClick={() => {
                setDeleteOpen(false);
                toast.success("Account deleted (preview only — nothing was removed)");
                router.push("/signup");
              }}
            >
              Delete everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
