"use client";

import * as React from "react";
import { MotionConfig } from "framer-motion";
import { Toaster } from "sonner";
import { CheckCircle2, Info, TriangleAlert, XCircle } from "lucide-react";

import { AppStateProvider } from "@/components/providers/app-state";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    // "user" makes every Framer animation honour prefers-reduced-motion.
    <MotionConfig reducedMotion="user">
      <AppStateProvider>
        {children}
        <Toaster
          position="top-center"
          duration={4000}
          gap={8}
          offset={{ top: "calc(76px + env(safe-area-inset-top, 0px))" }}
          mobileOffset={{ top: "calc(76px + env(safe-area-inset-top, 0px))" }}
          toastOptions={{
            classNames: {
              toast:
                "group !rounded-2xl !border !border-white/[0.08] !bg-surface/95 !text-white !backdrop-blur-2xl !shadow-[0_24px_60px_-24px_rgba(0,0,0,0.95)]",
              title: "!text-sm !font-medium !text-white",
              description: "!text-xs !text-muted-foreground",
              actionButton: "!rounded-full !bg-brand-gradient !text-white !text-xs !font-semibold !px-3 !h-8",
              success: "!border-success/25",
              error: "!border-danger/25",
              warning: "!border-warning/25",
            },
          }}
          icons={{
            success: <CheckCircle2 className="size-4 text-success" />,
            error: <XCircle className="size-4 text-danger" />,
            warning: <TriangleAlert className="size-4 text-warning" />,
            info: <Info className="size-4 text-primary-300" />,
          }}
        />
      </AppStateProvider>
    </MotionConfig>
  );
}
