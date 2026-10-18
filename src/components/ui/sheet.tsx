"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A Radix Dialog styled as a bottom sheet: slides up, drag handle on top,
 * capped at 85vh and scrollable. Centred at max-w-md on wide screens.
 */
const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    title: string;
    description?: string;
    hideTitle?: boolean;
    footer?: React.ReactNode;
  }
>(({ className, children, title, description, hideTitle = false, footer, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-canvas/75 backdrop-blur-sm",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-300",
      )}
    />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] w-full max-w-md flex-col",
        "rounded-t-3xl border border-b-0 border-white/[0.08] bg-surface/95 shadow-[0_-30px_80px_-30px_rgba(0,0,0,1)] backdrop-blur-2xl",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        "duration-300 ease-smooth",
        "focus:outline-none",
        className,
      )}
      {...props}
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-3xl bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      <div className="flex shrink-0 justify-center pb-1 pt-3">
        <span aria-hidden className="h-1.5 w-11 rounded-full bg-white/20" />
      </div>

      <div className={cn("flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-1", hideTitle && "sr-only")}>
        <div className="min-w-0 space-y-1">
          <DialogPrimitive.Title className="text-lg font-semibold tracking-tight text-white">
            {title}
          </DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="text-sm text-muted-foreground">
              {description}
            </DialogPrimitive.Description>
          ) : (
            <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
          )}
        </div>
        <DialogPrimitive.Close
          className="-mr-1 grid size-9 shrink-0 place-items-center rounded-full text-subtle transition-colors hover:bg-white/[0.08] hover:text-white"
          aria-label="Close"
        >
          <X className="size-4" />
        </DialogPrimitive.Close>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">{children}</div>

      {footer ? (
        <div className="shrink-0 border-t border-white/[0.06] px-5 pb-safe pt-3">
          <div className="pb-4">{footer}</div>
        </div>
      ) : (
        <div className="pb-safe" />
      )}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = "SheetContent";

export { Sheet, SheetTrigger, SheetClose, SheetContent };
