"use client";

import Link from "next/link";
import { useEffect } from "react";
import { LivePreview } from "@/components/live-preview";
import { reporterProfileHref, type LiveStreamSummary } from "@/lib/live";
import type { FirsthandReport } from "@/lib/types";
import { cityHref } from "@/lib/geo";
import { formatWatchingCount } from "@/lib/format";

export { thumbnailPosition } from "@/lib/explore-popup";

export function GoingOnNow({
  city,
  country,
  streams,
  index,
  report,
  onClose,
  onIndexChange,
}: {
  city: string;
  country: string;
  streams: LiveStreamSummary[];
  index: number;
  report?: FirsthandReport | null;
  onClose: () => void;
  onIndexChange?: (next: number) => void;
}) {
  const stream = streams[index] ?? null;
  const live = Boolean(stream);
  const multiple = streams.length > 1;
  const reporterHref = reporterProfileHref(stream?.reporterUsername);
  const placeHref = cityHref(stream?.location.city ?? city, stream?.location.country ?? country);
  const watching = stream?.viewerCount != null ? formatWatchingCount(stream.viewerCount) : null;
  const showPrev = Boolean(multiple && onIndexChange && index > 0);
  const showNext = Boolean(multiple && onIndexChange && index < streams.length - 1);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
      if (!multiple || !onIndexChange) {
        return;
      }
      if (event.key === "ArrowRight" && index < streams.length - 1) {
        event.preventDefault();
        onIndexChange(index + 1);
      }
      if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        onIndexChange(index - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, multiple, onClose, onIndexChange, streams.length]);

  return (
    <aside
      className="fh-going-on-now relative overflow-visible rounded-md bg-ink text-surface shadow-sm"
      role="dialog"
      aria-label={live ? "Going on now" : `Activity in ${city}`}
      data-stream-count={streams.length}
      data-stream-index={index}
      data-reporter-href={reporterHref ?? ""}
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-t-md">
        {stream ? (
          <LivePreview stream={stream} autoplay={!stream.sensitiveContent} variant="globeThumbnail" />
        ) : report?.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={report.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-ink px-3 text-center text-xs text-surface/80">
            Nothing live here right now
          </div>
        )}
        {!stream ? (
          <Link href={placeHref} className="absolute inset-0 z-[9]" aria-label={`${city} archive`} />
        ) : reporterHref ? (
          <Link
            href={reporterHref}
            className="absolute inset-0 z-20"
            aria-label={`${stream?.reporterName} reporter profile`}
          />
        ) : null}
        <div className="pointer-events-none absolute inset-0 z-40">
          {live ? (
            <p className="absolute left-2 top-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-live">
              <span className="h-1.5 w-1.5 rounded-full bg-live" aria-hidden />
              Live
            </p>
          ) : null}
          {multiple ? (
            <p className="absolute left-1/2 top-1.5 -translate-x-1/2 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] font-medium text-surface">
              {index + 1} of {streams.length}
            </p>
          ) : null}
          <button
            type="button"
            className="pointer-events-auto absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-ink/80 text-base leading-none text-surface hover:bg-ink fh-focus"
            onClick={onClose}
            aria-label="Close live stream"
          >
            ×
          </button>
          {showPrev ? (
            <button
              type="button"
              className="fh-going-on-now-nav fh-going-on-now-nav-prev fh-focus"
              onClick={() => onIndexChange?.(index - 1)}
              aria-label="Previous live stream"
            >
              <span className="fh-going-on-now-nav-face" aria-hidden>
                ←
              </span>
            </button>
          ) : null}
          {showNext ? (
            <button
              type="button"
              className="fh-going-on-now-nav fh-going-on-now-nav-next fh-focus"
              onClick={() => onIndexChange?.(index + 1)}
              aria-label="Next live stream"
            >
              <span className="fh-going-on-now-nav-face" aria-hidden>
                →
              </span>
            </button>
          ) : null}
        </div>
      </div>
      <div className="relative z-10 bg-ink px-2 py-1.5">
        <p className="truncate text-[11px] font-semibold text-surface">
          <Link href={placeHref} className="hover:underline">
            {stream?.location.city ?? city}
            {stream ? "" : ` · ${country}`}
          </Link>
        </p>
        {stream && reporterHref ? (
          <p className="truncate text-[11px] text-surface/80">
            <Link href={reporterHref} className="hover:underline">
              {stream.reporterName}
            </Link>
          </p>
        ) : stream ? (
          <p className="truncate text-[11px] text-surface/80">{stream.reporterName}</p>
        ) : null}
        {watching ? <p className="text-[11px] text-surface/80">{watching}</p> : null}
      </div>
    </aside>
  );
}
