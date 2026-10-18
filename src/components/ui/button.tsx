import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * FluxFin's button, reshaped into pills to match the screenshots: the primary
 * is a brand-gradient pill with a glow, the secondary a dark bordered pill.
 */
const buttonVariants = cva(
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-300 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-brand-gradient bg-[length:200%_200%] text-white shadow-[0_10px_30px_-8px_rgba(124,58,237,0.75)] hover:bg-[position:100%_50%] hover:shadow-[0_14px_38px_-8px_rgba(124,58,237,0.95)]",
        secondary:
          "border border-white/[0.10] bg-white/[0.04] text-white hover:border-white/[0.18] hover:bg-white/[0.08]",
        outline:
          "border border-white/[0.12] bg-transparent text-white hover:border-primary/50 hover:bg-primary/10",
        ghost: "text-muted-foreground hover:bg-white/[0.06] hover:text-white",
        destructive:
          "bg-danger/90 text-white shadow-[0_8px_24px_-10px_rgba(239,68,68,0.8)] hover:bg-danger",
        "destructive-ghost": "text-danger hover:bg-danger/10",
        link: "rounded-md px-0 text-primary-300 underline-offset-4 hover:text-primary-200 hover:underline",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-6 text-[15px]",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Slot>
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

/** The circular, hairline-bordered icon button from the FluxFin header. */
const IconButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }
>(({ className, label, children, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    aria-label={label}
    className={cn(
      "grid size-11 shrink-0 place-items-center rounded-full border border-white/[0.10] bg-white/[0.03] text-white/80 transition-colors hover:border-white/[0.18] hover:text-white active:scale-95 [&_svg]:size-[18px]",
      className,
    )}
    {...props}
  >
    {children}
  </button>
));
IconButton.displayName = "IconButton";

export { Button, IconButton, buttonVariants };
