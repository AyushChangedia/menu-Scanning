"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Mail, User } from "lucide-react";

import { AuthCard, AuthDivider, Field, GoogleButton } from "@/components/auth/auth-card";
import { useAppState } from "@/components/providers/app-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EMPTY_PREFS } from "@/lib/mock/data";

const linkClass = "font-semibold text-primary-300 transition-colors hover:text-primary-200";

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    window.setTimeout(() => router.push("/"), 500);
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
      <div className="space-y-5">
        <GoogleButton onClick={() => router.push("/")} />
        <AuthDivider label="or with email" />
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" icon={<Mail />} required />
          </Field>
          <Field
            label="Password"
            htmlFor="password"
            action={
              <Link href="/forgot-password" className="text-xs text-primary-300 hover:text-primary-200">
                Forgot?
              </Link>
            }
          >
            <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" required />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={pending}>
            Sign in
          </Button>
        </form>
      </div>
    </AuthCard>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const { setPrefs, setOnboarded, user } = useAppState();
  const [pending, setPending] = React.useState(false);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    setPending(true);
    if (name) user.setName(name);
    // A brand-new account starts with a blank taste profile.
    setPrefs(EMPTY_PREFS);
    setOnboarded(false);
    window.setTimeout(() => router.push("/onboarding"), 500);
  }

  return (
    <AuthCard
      title="Create your account"
      description="Forkcast is invite-only. Use the email your invite went to."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className={linkClass}>
            Sign in
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <GoogleButton label="Sign up with Google" onClick={() => router.push("/onboarding")} />
        <AuthDivider label="or with email" />
        <form onSubmit={submit} className="space-y-4">
          <Field label="Name" htmlFor="name">
            <Input id="name" name="name" autoComplete="name" placeholder="Your name" icon={<User />} required minLength={2} />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" icon={<Mail />} required />
          </Field>
          <Field label="Password" htmlFor="password" hint="8+ characters, with a number and a capital.">
            <Input id="password" type="password" autoComplete="new-password" placeholder="••••••••" required minLength={8} />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={pending}>
            Create account
          </Button>
        </form>
      </div>
    </AuthCard>
  );
}

export function ForgotPasswordForm() {
  const [sent, setSent] = React.useState(false);

  return (
    <AuthCard
      title="Reset your password"
      description="We'll email you a link to choose a new one."
      footer={
        <Link href="/login" className={linkClass}>
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <p className="flex items-start gap-2.5 rounded-2xl border border-success/25 bg-success/10 px-3.5 py-3 text-sm text-success">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          If that email has an account, a reset link is on its way.
        </p>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSent(true);
          }}
          className="space-y-4"
        >
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" icon={<Mail />} required />
          </Field>
          <Button type="submit" size="lg" className="w-full">
            Send reset link
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
