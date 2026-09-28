import Link from "next/link";
import { LocationLabel } from "@/components/ui/badge";
import { RelativeTime } from "@/components/relative-time";
import type { InvestigationSummary } from "@/lib/investigations";
import { cn } from "@/lib/cn";

export function InvestigationCard({
  investigation,
  compact = false,
}: {
  investigation: InvestigationSummary;
  compact?: boolean;
}) {
  return (
    <article className="fh-content-card">
      <Link href={investigation.href} className="block bg-ink" aria-label={investigation.title}>
        {investigation.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={investigation.coverUrl}
            alt=""
            className={cn("h-auto w-full object-cover", compact ? "aspect-[16/10]" : "aspect-[16/9]")}
          />
        ) : (
          <div className={cn("flex items-center justify-center bg-canvas", compact ? "aspect-[16/10]" : "aspect-[16/9]")}>
            <span className="fh-label">Investigation</span>
          </div>
        )}
      </Link>
      <div className={compact ? "p-3" : "p-4"}>
        <p className="fh-kicker">Investigation</p>
        <h3 className={cn("fh-report-title mt-1", compact && "text-base")}>
          <Link href={investigation.href} className="hover:underline">
            {investigation.title}
          </Link>
        </h3>
        {investigation.location ? (
          <p className="mt-2">
            <LocationLabel
              city={investigation.location.city}
              country={investigation.location.country}
              href={investigation.location.href}
              size="card"
            />
          </p>
        ) : null}
        <p className="mt-1 fh-meta">
          <Link href={`/u/${investigation.reporterUsername}`} className="hover:underline">
            {investigation.reporterName}
          </Link>
        </p>
        <p className="mt-1 fh-meta">
          {investigation.partCount} {investigation.partCount === 1 ? "part" : "parts"}
          {investigation.liveNow ? " · LIVE NOW" : null}
          {" · Updated "}
          <RelativeTime value={investigation.updatedAt} className="inline fh-meta" />
        </p>
      </div>
    </article>
  );
}
