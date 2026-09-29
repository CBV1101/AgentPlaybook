import { LivePreview } from "@/components/live-preview";
import Link from "next/link";
import { LiveBadge, LocationLabel } from "@/components/ui/badge";
import { RelativeTime } from "@/components/relative-time";
import type { InvestigationPart } from "@/lib/investigations";
import { cn } from "@/lib/cn";

export function InvestigationTimeline({
  parts,
  startHref,
  latestHref,
}: {
  parts: InvestigationPart[];
  startHref?: string | null;
  latestHref?: string | null;
}) {
  if (parts.length === 0) {
    return <p className="mt-6 fh-meta">No published parts yet.</p>;
  }

  return (
    <div className="mt-8">
      {startHref || latestHref ? (
        <p className="mb-6 flex flex-wrap gap-4 text-sm">
          {startHref ? (
            <Link href={startHref} className="font-medium text-ink underline underline-offset-2">
              Start from Part 1
            </Link>
          ) : null}
          {latestHref ? (
            <Link href={latestHref} className="font-medium text-ink underline underline-offset-2">
              Jump to latest
            </Link>
          ) : null}
        </p>
      ) : null}
      <ol>
        {parts.map((part, index) => (
          <li key={part.id} className="relative flex gap-4 pb-8 last:pb-0">
            <div className="flex w-8 shrink-0 flex-col items-center">
              <span
                className={cn(
                  "mt-1 h-2.5 w-2.5 rounded-full border border-ink bg-ink",
                  part.liveNow && "border-live bg-live",
                )}
                aria-hidden
              />
              {index < parts.length - 1 ? <span className="mt-1 w-px flex-1 bg-line" aria-hidden /> : null}
            </div>
            <article id={`part-${part.position}`} className="min-w-0 flex-1">
              <p className="fh-label">
                Part {part.position}
                {part.liveNow ? " · Live now" : null}
              </p>
              <div className="mt-2 max-w-md">
                {part.liveNow && part.liveStream ? (
                  <div className="overflow-hidden rounded-md">
                    <LivePreview stream={part.liveStream} autoplay={!part.liveStream.sensitiveContent} variant="globeThumbnail" viewerSurface="location" />
                  </div>
                ) : (
                  <Link href={part.href} className="block overflow-hidden rounded-md bg-ink">
                    {part.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={part.thumbnailUrl} alt="" className="aspect-video w-full object-cover" />
                    ) : (
                      <div className="flex aspect-video items-center justify-center bg-canvas">
                        <span className="fh-label text-muted">{part.mediaKind === "photo" ? "Photos" : "Report"}</span>
                      </div>
                    )}
                  </Link>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {part.liveNow ? <LiveBadge /> : null}
                  {part.recordedLive && !part.liveNow ? <span className="fh-label">Live recorded</span> : null}
                </div>
                <h3 className="fh-report-title mt-1">
                  <Link href={part.href} className="hover:underline">
                    {part.title}
                  </Link>
                </h3>
                {part.city && part.country ? (
                  <p className="mt-1">
                    <LocationLabel city={part.city} country={part.country} size="card" />
                  </p>
                ) : null}
                {part.capturedAt ? (
                  <p className="mt-1 fh-meta">
                    <RelativeTime value={part.capturedAt} className="inline fh-meta" />
                    {part.durationLabel ? ` · ${part.durationLabel}` : null}
                  </p>
                ) : null}
              </div>
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}
