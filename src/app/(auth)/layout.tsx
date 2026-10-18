import Link from "next/link";

import { RedirectIfSignedIn } from "@/components/auth/guards";
import { GradientBlobs } from "@/components/shared/gradient-blobs";
import { LogoTile, Wordmark } from "@/components/shared/logo";
import { BRAND } from "@/lib/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <RedirectIfSignedIn>
      <div className="relative flex min-h-dvh flex-col pt-safe">
        <GradientBlobs variant="default" />
        <header className="mx-auto flex h-[68px] w-full max-w-md shrink-0 items-center px-gutter">
          <Link href="/login" className="flex items-center gap-3 rounded-2xl">
            <LogoTile />
            <Wordmark />
          </Link>
        </header>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-gutter py-8">{children}</main>
        <footer className="mx-auto w-full max-w-md shrink-0 px-gutter pb-safe">
          <p className="pb-6 text-center text-xs text-subtle">{BRAND.tagline}</p>
        </footer>
      </div>
    </RedirectIfSignedIn>
  );
}
