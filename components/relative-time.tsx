"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime, formatWhenUtc } from "@/lib/format";
import { cn } from "@/lib/cn";

export function RelativeTime({
  value,
  prefix,
  className,
}: {
  value: string;
  prefix?: string;
  className?: string;
}) {
  const [label, setLabel] = useState(() => formatWhenUtc(value));

  useEffect(() => {
    function update() {
      setLabel(formatRelativeTime(value));
    }
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, [value]);

  return (
    <time className={cn("fh-meta", className)} dateTime={value} title={formatWhenUtc(value)}>
      {prefix ? `${prefix} ${label}` : label}
    </time>
  );
}
