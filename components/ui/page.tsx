import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Page({
  children,
  width = "default",
  className,
}: {
  children: ReactNode;
  width?: "default" | "narrow" | "article" | "home";
  className?: string;
}) {
  const widthClass =
    width === "narrow"
      ? "fh-page-narrow"
      : width === "article"
        ? "fh-page-article"
        : width === "home"
          ? "fh-page-home"
          : "fh-page";
  return <main className={cn(widthClass, className)}>{children}</main>;
}

export function Section({
  kicker,
  title,
  description,
  action,
  children,
  className,
}: {
  kicker?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("fh-section-block", className)}>
      {kicker || title || action ? (
        <div className="flex items-end justify-between gap-4">
          <div>
            {kicker ? <p className="fh-kicker">{kicker}</p> : null}
            {title ? <h2 className={cn("fh-section", kicker && "mt-1")}>{title}</h2> : null}
            {description ? <p className="mt-2 fh-meta">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mt-5">
      <p className="fh-meta">{title}</p>
      {children}
    </div>
  );
}

export function ErrorState({ children }: { children: ReactNode }) {
  return (
    <p className="fh-alert bg-danger-soft text-danger" role="alert">
      {children}
    </p>
  );
}

export function Notice({
  tone = "warn",
  children,
}: {
  tone?: "warn" | "ok" | "danger" | "brand";
  children: ReactNode;
}) {
  const toneClass =
    tone === "ok"
      ? "bg-ok-soft text-ink"
      : tone === "danger"
        ? "bg-danger-soft text-danger"
        : tone === "brand"
          ? "bg-brand-soft text-brand"
          : "bg-warn-soft text-ink";
  return <p className={cn("fh-alert", toneClass)}>{children}</p>;
}

export function LoadingState({ children = "Loading…" }: { children?: ReactNode }) {
  return (
    <p className="mt-5 fh-meta" aria-live="polite">
      {children}
    </p>
  );
}

export function MenuSurface({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("fh-menu", className)} {...props}>
      {children}
    </div>
  );
}

export function Tabs({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap gap-1 border-b border-line", className)}>{children}</div>;
}

export function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-10 items-center px-3 text-sm font-medium fh-focus",
        active ? "border-b-2 border-ink text-ink" : "text-muted hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
