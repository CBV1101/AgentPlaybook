import Link from "next/link";
import { LivePreview } from "@/components/live-preview";
import { LocationLabel } from "@/components/ui/badge";
import { peopleWantThisCovered } from "@/lib/coverage-wanted";
import { formatRelativeTime } from "@/lib/format";
import { liveHref, type LiveStreamSummary } from "@/lib/live";
import { cn } from "@/lib/cn";

export function FeaturedLiveStream({
  stream,
  demandCount = 0,
}: {
  stream: LiveStreamSummary;
  demandCount?: number;
}) {
  return (
    <article className="fh-content-card">
      <LivePreview stream={stream} featured autoplay />
      <div className="p-4 sm:p-5">
        <LocationLabel city={stream.location.city} country={stream.location.country} href={stream.location.href} size="hero" />
        <h3 className="mt-2 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          <Link href={liveHref(stream.id)} className="hover:underline">
            {stream.title}
          </Link>
        </h3>
        <p className="mt-2 fh-meta">
          <Link href={`/u/${stream.reporterUsername}`} className="underline">
            {stream.reporterName}
          </Link>
          {stream.startedAt ? (
            <>
              {" · "}
              Started {formatRelativeTime(stream.startedAt)}
            </>
          ) : null}
        </p>
        {demandCount > 0 ? <p className="mt-2 text-sm font-medium text-ink">{peopleWantThisCovered(demandCount)}</p> : null}
      </div>
    </article>
  );
}

export function LiveStreamCard({
  stream,
  demandCount = 0,
  compact = false,
}: {
  stream: LiveStreamSummary;
  demandCount?: number;
  compact?: boolean;
}) {
  return (
    <article className={cn("fh-content-card", compact && "min-w-[16rem] shrink-0 snap-start sm:min-w-0")}>
      <LivePreview stream={stream} />
      <div className="p-3">
        <LocationLabel city={stream.location.city} country={stream.location.country} href={stream.location.href} size="card" />
        <h3 className="mt-1.5 line-clamp-2 fh-report-title">
          <Link href={liveHref(stream.id)} className="hover:underline">
            {stream.title}
          </Link>
        </h3>
        <p className="mt-1 truncate fh-meta">
          <Link href={`/u/${stream.reporterUsername}`} className="underline">
            {stream.reporterName}
          </Link>
          {stream.startedAt ? ` · ${formatRelativeTime(stream.startedAt)}` : null}
        </p>
        {demandCount > 0 ? <p className="mt-1 line-clamp-1 fh-label">{peopleWantThisCovered(demandCount)}</p> : null}
      </div>
    </article>
  );
}
