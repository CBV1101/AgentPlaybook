"use client";

import { cn } from "@/lib/cn";
import { useEffect, type HTMLAttributes, type ReactNode } from "react";

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-ink/30"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fh-modal-title"
        className="relative z-10 w-full max-w-lg rounded-lg border border-line bg-surface p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="fh-modal-title" className="fh-section">
            {title}
          </h2>
          <button type="button" className="fh-meta fh-focus" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function Dropdown({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("fh-menu", className)} {...props}>
      {children}
    </div>
  );
}
