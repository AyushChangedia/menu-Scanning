"use client";

import * as React from "react";
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

function Field({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-[#F87171]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ProfileView() {
  const router = useRouter();
  const { account, usage, persistent, updateName, changePassword, signOut, deleteAccount, setOnboarded, server, invite, setInvite } = useAppState();
  const [inviteDraft, setInviteDraft] = React.useState(invite ?? "");
  const [name, setName] = React.useState(account?.name ?? "");
  const [nameError, setNameError] = React.useState<string>();
  const [passwordErrors, setPasswordErrors] = React.useState<Partial<Record<"current" | "next", string>>>({});
  const [savingPassword, setSavingPassword] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [confirm, setConfirm] = React.useState("");

  React.useEffect(() => setName(account?.name ?? ""), [account?.name]);

  if (!account) return null;

  const remaining = Math.max(0, usage.limit - usage.used);
  const percent = Math.min(100, (usage.used / usage.limit) * 100);

  async function submitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setPasswordErrors({});
    setSavingPassword(true);
    const result = await changePassword(String(form.get("current") ?? ""), String(form.get("next") ?? ""));
    setSavingPassword(false);
    if (result.ok) {
      formElement.reset();
      toast.success("Password changed");
    } else if (result.field === "current" || result.field === "next") {
      setPasswordErrors({ [result.field]: result.error });
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-7">
      <PageTitle eyebrow="Profile" title="Your account" />

      <section className="glass flex items-center gap-4 rounded-3xl p-5">
        <span className="grid size-16 shrink-0 place-items-center rounded-full bg-brand-gradient text-xl font-bold text-white shadow-glow">
          {initials(account.name, account.email)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-white">{account.name}</p>
          <p className="truncate text-sm text-muted-foreground">{account.email}</p>
        </div>
      </section>

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

      <section className="space-y-3">
        <SectionLabel>Details</SectionLabel>
        <form
          className="glass space-y-4 rounded-3xl p-5"
          onSubmit={(event) => {
            event.preventDefault();
            const result = updateName(name);
            if (result.ok) {
              setNameError(undefined);
              toast.success("Name updated");
            } else {
              setNameError(result.error);
            }
          }}
        >
          <Field label="Name" htmlFor="name" error={nameError}>
            <Input
              id="name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setNameError(undefined);
              }}
              icon={<User />}
              autoComplete="name"
              maxLength={60}
            />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input id="email" value={account.email} icon={<Mail />} disabled readOnly />
          </Field>
          <Button type="submit" variant="secondary" className="w-full" disabled={name.trim() === account.name}>
            Save
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <SectionLabel>Password</SectionLabel>
        <form className="glass space-y-4 rounded-3xl p-5" onSubmit={submitPassword} noValidate>
          <Field label="Current password" htmlFor="current" error={passwordErrors.current}>
            <Input onInput={() => setPasswordErrors((prev) => ({ ...prev, current: undefined }))} id="current" name="current" type="password" icon={<KeyRound />} autoComplete="current-password" placeholder="Your current password" invalid={Boolean(passwordErrors.current)} />
          </Field>
          <Field label="New password" htmlFor="next" error={passwordErrors.next}>
            <Input onInput={() => setPasswordErrors((prev) => ({ ...prev, next: undefined }))} id="next" name="next" type="password" icon={<KeyRound />} autoComplete="new-password" placeholder="8+ characters, a capital and a number" invalid={Boolean(passwordErrors.next)} />
          </Field>
          <Button type="submit" variant="secondary" className="w-full" loading={savingPassword}>
            Change password
          </Button>
        </form>
      </section>

      {server?.inviteRequired ? (
        <section className="space-y-3">
          <SectionLabel>Invite code</SectionLabel>
          <form
            className="glass flex gap-2 rounded-3xl p-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!inviteDraft.trim()) return;
              setInvite(inviteDraft);
              toast.success("Invite code saved");
            }}
          >
            <Input value={inviteDraft} onChange={(event) => setInviteDraft(event.target.value)} placeholder="Needed to read menus" aria-label="Invite code" autoComplete="off" />
            <Button type="submit" variant="secondary" className="shrink-0" disabled={!inviteDraft.trim() || inviteDraft.trim() === invite}>
              Save
            </Button>
          </form>
        </section>
      ) : null}

      <section className="glass divide-y divide-white/[0.06] overflow-hidden rounded-3xl">
        <InstallRow />
        <button
          type="button"
          onClick={() => {
            setOnboarded(false);
            router.push("/onboarding");
          }}
          className="flex min-h-14 w-full items-center gap-3 px-5 text-left text-sm font-medium text-white hover:bg-white/[0.03]"
        >
          <RotateCcw className="size-4 text-primary-300" />
          Redo taste onboarding
          <ChevronRight className="ml-auto size-4 text-subtle" />
        </button>
        <button
          type="button"
          onClick={() => {
            signOut();
            toast("Signed out");
          }}
          className="flex min-h-14 w-full items-center gap-3 px-5 text-left text-sm font-medium text-white hover:bg-white/[0.03]"
        >
          <LogOut className="size-4 text-muted-foreground" />
          Sign out
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirm("");
            setDeleteOpen(true);
          }}
          className="flex min-h-14 w-full items-center gap-3 px-5 text-left text-sm font-medium text-danger hover:bg-danger/[0.06]"
        >
          <Trash2 className="size-4" />
          Delete account
        </button>
      </section>

      {!persistent ? (
        <p className="text-center text-xs text-subtle">This browser isn&apos;t saving data, so everything resets when you close the page.</p>
      ) : null}

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setConfirm("");
        }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This removes your account, taste profile, every scan and every rating from this device. It can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Input value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Type DELETE to confirm" aria-label="Type DELETE to confirm" autoComplete="off" />
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
                deleteAccount();
                toast.success("Account deleted");
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
