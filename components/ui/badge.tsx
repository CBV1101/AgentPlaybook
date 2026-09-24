import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type BadgeTone = "neutral" | "brand" | "live" | "danger";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-canvas text-muted",
  brand: "bg-brand-soft text-brand",
  live: "bg-live text-surface",
  danger: "bg-danger-soft text-danger",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function LiveBadge({ className }: { className?: string }) {
  return (
    <Badge tone="live" className={cn("px-2 py-1 text-[11px] sm:text-xs", className)}>
      Live
    </Badge>
  );
}

export function LocationLabel({
  children,
  city,
  country,
  href,
  size = "inline",
  className,
}: {
  children?: ReactNode;
  city?: string;
  country?: string;
  href?: string;
  size?: "hero" | "card" | "inline" | "overlay";
  className?: string;
}) {
  const label = city && country ? `${city}, ${country}` : children;
  const classes = cn(
    size === "inline" && "fh-meta",
    size === "card" && "fh-place",
    size === "hero" && "fh-place-lg",
    size === "overlay" && "text-sm font-semibold uppercase tracking-[0.14em] text-surface sm:text-xl",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={cn(classes, "hover:underline")}>
        {label}
      </Link>
    );
  }

  return <span className={classes}>{label}</span>;
}

export function Timestamp({ children, className }: { children: ReactNode; className?: string }) {
  return <time className={cn("fh-meta", className)}>{children}</time>;
}
