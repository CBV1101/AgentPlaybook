import Link from "next/link";
import { Badge, LiveBadge } from "@/components/ui/badge";
import { liveHref, liveStatusLabel, reporterProfileHref, type LiveStreamSummary } from "@/lib/live";
import { formatWhen } from "@/lib/format";
import { cn } from "@/lib/cn";

export function LiveCard({
  stream,
  featured = false,
}: {
  stream: LiveStreamSummary;
  featured?: boolean;
}) {
  const live = stream.status === "live";
  const href = reporterProfileHref(stream.reporterUsername) ?? liveHref(stream.id);
  const preview = stream.thumbnailUrl;

  return (
    <article className="fh-content-card">
      <Link href={href} className="relative block bg-ink" aria-label={`${stream.reporterName} reporter profile`}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            className={cn("w-full object-cover", featured ? "h-52 sm:h-72" : "h-40 sm:h-48")}
          />
        ) : (
          <div className={cn("flex w-full items-center justify-center bg-ink", featured ? "h-52 sm:h-72" : "h-40 sm:h-48")}>
            <span className="text-sm text-surface/80">Live firsthand report</span>
          </div>
        )}
        <span className="absolute left-3 top-3">
          {live ? <LiveBadge /> : <Badge>{liveStatusLabel(stream.status)}</Badge>}
        </span>
      </Link>
      <div className="p-4">
        <h3 className="fh-report-title">
          <Link href={href} className="hover:underline">
            {stream.title}
          </Link>
        </h3>
        <p className="mt-2 fh-meta">
          <Link href={`/u/${stream.reporterUsername}`} className="underline">
            {stream.reporterName}
          </Link>
          {" · "}
          <Link href={stream.location.href} className="underline">
            {stream.location.label}
          </Link>
        </p>
        <p className="mt-1 fh-label">
          {live
            ? stream.startedAt
              ? `Live · started ${formatWhen(stream.startedAt)}`
              : "Live now"
            : stream.startedAt
              ? liveStatusLabel(stream.status) + ` · started ${formatWhen(stream.startedAt)}`
              : liveStatusLabel(stream.status)}
        </p>
      </div>
    </article>
  );
}
