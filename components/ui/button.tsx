import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "live";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-ink text-surface hover:bg-ink/90",
  secondary:
    "border border-line bg-surface text-ink hover:bg-canvas",
  ghost:
    "text-ink hover:bg-canvas",
  danger:
    "bg-danger text-surface hover:bg-danger/90",
  live:
    "bg-live text-surface hover:bg-live/90",
};

export function buttonClass(variant: ButtonVariant = "primary", className?: string) {
  return cn(
    "inline-flex h-10 min-h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors fh-focus disabled:cursor-not-allowed disabled:opacity-60",
    variants[variant],
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ variant = "primary", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}
