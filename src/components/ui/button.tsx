import * as React from "react";
import { cn } from "../../lib/utils";
import { fontConfig } from "../../config/font.config";

type ButtonVariant = "primary" | "secondary" | "ghost" | "icon";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-primary)] text-[var(--color-secondary)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] hover:-translate-y-0.5",
  secondary:
    "border border-[var(--color-secondary)] bg-white text-[var(--color-secondary)] hover:bg-[var(--color-secondary)] hover:text-white",
  ghost:
    "bg-transparent text-[var(--color-secondary)] hover:bg-[var(--color-surface)]",
  icon:
    "grid aspect-square w-10 place-items-center rounded-full bg-white/90 text-[var(--color-secondary)] shadow-sm hover:bg-[var(--color-primary)]",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex min-h-10 items-center justify-center rounded-[var(--radius-sm)] px-5 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:pointer-events-none disabled:opacity-50",
        fontConfig.className,
        variants[variant],
        className
      )}
      {...props}
    />
  )
);

Button.displayName = "Button";
