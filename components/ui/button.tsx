import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:translate-y-0 active:scale-[0.985] active:duration-75 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas motion-reduce:transition-none motion-reduce:hover:translate-y-0",
  {
    variants: {
      variant: {
        // Primary, inverts with the theme (dark button on light, light button on dark)
        default:
          "bg-ink text-canvas hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-10px_rgba(0,0,0,0.4)]",
        // White card button with hairline border
        secondary: "bg-surface text-ink border border-line hover:border-ink hover:shadow-card",
        // Transparent with border
        outline: "bg-transparent text-ink border border-line hover:border-ink hover:bg-surface/60",
        // Restrained blue accent, used sparingly
        accent:
          "bg-accent text-accent-fg hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-10px_rgba(93,95,239,0.6)]",
        // Quiet text button
        ghost: "bg-transparent text-dim hover:bg-raised hover:text-ink",
        // On dark sections: white fill
        onDark:
          "bg-surface text-ink hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-10px_rgba(0,0,0,0.6)]",
        // On dark sections: outlined
        onDarkOutline:
          "bg-transparent text-white border border-[#2A2A2A] hover:border-[#4A4A4A]",
      },
      size: {
        sm: "text-[13px] px-3.5 py-2",
        default: "text-sm px-5 py-3",
        lg: "text-[15px] px-6 py-3.5",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
