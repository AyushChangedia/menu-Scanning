import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-gutter text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary-300">404</p>
      <h1 className="text-[32px] font-bold tracking-tight text-white">Not on the menu</h1>
      <p className="text-muted-foreground">That page doesn&apos;t exist.</p>
      <Button asChild>
        <Link href="/">Back home</Link>
      </Button>
    </main>
  );
}
