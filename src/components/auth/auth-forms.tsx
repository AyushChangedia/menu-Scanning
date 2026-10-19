"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, KeyRound, Mail, User } from "lucide-react";

import { AuthCard, Field, FormError } from "@/components/auth/auth-card";
import { useAppState } from "@/components/providers/app-state";
import { Button } from "@/components/ui/button";
import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const linkClass = "font-semibold text-primary-300 transition-colors hover:text-primary-200";

type Errors = Partial<Record<string, string>>;

function PasswordInput({ className, ...props }: InputProps) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} icon={<KeyRound />} className={cn("pr-12", className)} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-subtle hover:text-white"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

const RULES = [
  { label: "8+ characters", test: (value: string) => value.length >= 8 },
  { label: "Lowercase", test: (value: string) => /[a-z]/.test(value) },
  { label: "Uppercase", test: (value: string) => /[A-Z]/.test(value) },
  { label: "Number", test: (value: string) => /[0-9]/.test(value) },
];

/** Live checklist of the password rules. */
function PasswordRules({ value }: { value: string }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 pt-1" aria-label="Password rules">
      {RULES.map((rule) => {
        const passed = rule.test(value);
        return (
          <li key={rule.label} className={cn("flex items-center gap-1.5 text-xs transition-colors", passed ? "text-success" : "text-subtle")}>
            <span className={cn("size-1.5 rounded-full", passed ? "bg-success" : "bg-white/20")} />
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

function DeviceNote() {
  const { persistent } = useAppState();
  return (
    <p className="text-center text-xs leading-relaxed text-subtle">
      {persistent
        ? "Your account and scans are saved on this device."
        : "This browser isn't saving data, so your account lasts until you close the page."}
    </p>
  );
}

export function LoginForm() {
  const { signIn } = useAppState();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fields, setFields] = React.useState<Errors>({});

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setFields({});
    const result = await signIn({ email: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") });
    setPending(false);
    if (!result.ok) {
      if (result.field) setFields({ [result.field]: result.error });
      else setError(result.error);
    }
    // On success the auth layout redirects into the app.
  }

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in and your taste comes with you."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className={linkClass}>
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormError message={error} />
        <Field label="Email" htmlFor="email" error={fields.email}>
          <Input onInput={() => setFields((prev) => ({ ...prev, email: undefined }))} id="email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" icon={<Mail />} invalid={Boolean(fields.email)} required />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          error={fields.password}
          action={
            <Link href="/forgot-password" className="text-xs text-primary-300 hover:text-primary-200">
              Forgot?
            </Link>
          }
        >
          <PasswordInput onInput={() => setFields((prev) => ({ ...prev, password: undefined }))} id="password" name="password" autoComplete="current-password" placeholder="Your password" invalid={Boolean(fields.password)} required />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          Sign in
        </Button>
        <DeviceNote />
      </form>
    </AuthCard>
  );
}

export function SignUpForm() {
  const { signUp } = useAppState();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fields, setFields] = React.useState<Errors>({});
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setFields({});
    if (password !== confirm) {
      setFields({ confirm: "Passwords don't match" });
      return;
    }
    setPending(true);
    const result = await signUp({
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      password,
    });
    setPending(false);
    if (!result.ok) {
      if (result.field) setFields({ [result.field]: result.error });
      else setError(result.error);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      description="Two minutes, then Forkcast knows how you like your food."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className={linkClass}>
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormError message={error} />
        <Field label="Name" htmlFor="name" error={fields.name}>
          <Input onInput={() => setFields((prev) => ({ ...prev, name: undefined }))} id="name" name="name" autoComplete="name" placeholder="Your name" icon={<User />} invalid={Boolean(fields.name)} required maxLength={60} />
        </Field>
        <Field label="Email" htmlFor="email" error={fields.email}>
          <Input onInput={() => setFields((prev) => ({ ...prev, email: undefined }))} id="email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" icon={<Mail />} invalid={Boolean(fields.email)} required />
        </Field>
        <Field label="Password" htmlFor="password" error={fields.password}>
          <PasswordInput id="password" autoComplete="new-password" placeholder="Choose a password" value={password} onChange={(event) => {
              setPassword(event.target.value);
              setFields((prev) => ({ ...prev, password: undefined }));
            }} invalid={Boolean(fields.password)} required />
          <PasswordRules value={password} />
        </Field>
        <Field label="Confirm password" htmlFor="confirm" error={fields.confirm}>
          <PasswordInput id="confirm" autoComplete="new-password" placeholder="Type it again" value={confirm} onChange={(event) => {
              setConfirm(event.target.value);
              setFields((prev) => ({ ...prev, confirm: undefined }));
            }} invalid={Boolean(fields.confirm)} required />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          Create account
        </Button>
        <DeviceNote />
      </form>
    </AuthCard>
  );
}

export function ForgotPasswordForm() {
  const { resetPassword, persistent } = useAppState();
  const [done, setDone] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [fields, setFields] = React.useState<Errors>({});
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setFields({});
    if (password !== confirm) {
      setFields({ confirm: "Passwords don't match" });
      return;
    }
    setPending(true);
    const result = await resetPassword(String(form.get("email") ?? ""), password);
    setPending(false);
    if (result.ok) setDone(true);
    else setFields({ [result.field ?? "email"]: result.error });
  }

  return (
    <AuthCard
      title="Reset your password"
      description={
        persistent
          ? "Accounts are saved on this device, so you can set a new password right here."
          : "Accounts in this browser only last until you close the page, so you can set a new password right here."
      }
      footer={
        <Link href="/login" className={linkClass}>
          Back to sign in
        </Link>
      }
    >
      {done ? (
        <div className="space-y-4">
          <p className="flex items-start gap-2.5 rounded-2xl border border-success/25 bg-success/10 px-3.5 py-3 text-sm text-success">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            Password updated. Sign in with your new password.
          </p>
          <Button asChild size="lg" className="w-full">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Email" htmlFor="email" error={fields.email}>
            <Input onInput={() => setFields((prev) => ({ ...prev, email: undefined }))} id="email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" icon={<Mail />} invalid={Boolean(fields.email)} required />
          </Field>
          <Field label="New password" htmlFor="password" error={fields.password}>
            <PasswordInput id="password" autoComplete="new-password" placeholder="Choose a new password" value={password} onChange={(event) => {
              setPassword(event.target.value);
              setFields((prev) => ({ ...prev, password: undefined }));
            }} invalid={Boolean(fields.password)} required />
            <PasswordRules value={password} />
          </Field>
          <Field label="Confirm new password" htmlFor="confirm" error={fields.confirm}>
            <PasswordInput id="confirm" autoComplete="new-password" placeholder="Type it again" value={confirm} onChange={(event) => {
              setConfirm(event.target.value);
              setFields((prev) => ({ ...prev, confirm: undefined }));
            }} invalid={Boolean(fields.confirm)} required />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={pending}>
            Set new password
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
