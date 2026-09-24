"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SENSITIVE_CONTENT_WARNING } from "@/lib/moderation";

type SensitiveContentGateProps = {
  active: boolean;
  children: ReactNode;
};

export function SensitiveContentGate({ active, children }: SensitiveContentGateProps) {
  const [revealed, setRevealed] = useState(false);

  if (!active || revealed) {
    return <>{children}</>;
  }

  return (
    <div className="fh-alert bg-warn-soft text-ink">
      <p className="text-sm font-medium">{SENSITIVE_CONTENT_WARNING}</p>
      <p className="mt-2 fh-meta">
        Firsthand does not autoplay this media. Choose whether to view it.
      </p>
      <Button type="button" className="mt-4" onClick={() => setRevealed(true)}>
        View content
      </Button>
    </div>
  );
}
