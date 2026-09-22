"use client";

import Link from "next/link";
import { LiveBadge } from "@/components/ui/badge";
import { SensitiveContentGate } from "@/components/sensitive-content-gate";
import { liveHref, type LiveStreamSummary } from "@/lib/live";
import { cn } from "@/lib/cn";

export function LivePreview({
  stream,
  featured = false,
  autoplay = false,
}: {
  stream: LiveStreamSummary;
  featured?: boolean;
  autoplay?: boolean;
}) {
  const href = liveHref(stream.id);
  const playFile = autoplay && !stream.sensitiveContent && stream.playbackKind === "file" && Boolean(stream.playbackUrl);
  const frame = cn("relative block overflow-hidden bg-ink", featured ? "aspect-[16/9] max-h-[28rem]" : "aspect-video");

  return (
    <SensitiveContentGate active={stream.sensitiveContent}>
      <div className={frame}>
        {playFile ? (
          <video
            src={stream.playbackUrl ?? undefined}
            muted
            playsInline
            autoPlay
            loop
            preload="metadata"
            className="pointer-events-none h-full w-full object-cover"
          />
        ) : stream.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={stream.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full min-h-32 items-center justify-center bg-ink px-4">
            <span className="text-center text-sm text-surface/80">Live firsthand report</span>
          </div>
        )}
        <span className="absolute left-3 top-3">
          <LiveBadge />
        </span>
        <Link href={href} className="absolute inset-0" aria-label={stream.title} />
      </div>
    </SensitiveContentGate>
  );
}
