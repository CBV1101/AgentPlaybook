import Link from "next/link";
import { LivePreview } from "@/components/live-preview";
import { ReporterAvatar } from "@/components/reporter-avatar";
import { Badge } from "@/components/ui/badge";
import { liveHref, type LiveStreamSummary } from "@/lib/live";
import type { FirsthandReport } from "@/lib/types";

export function CompactLiveStreamCard({
  stream,
}: {
  stream: LiveStreamSummary;
  demandCount?: number;
  tone?: "stage" | "surface";
}) {
  const live = stream.status === "live";
  return (
    <article className="min-w-0">
      <LivePreview stream={stream} autoplay={live} chrome={false} />
      <p className="fh-place mt-2.5">{stream.location.city}, {stream.location.country}</p>
      <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-ink">
        <Link href={liveHref(stream.id)} className="hover:underline">
          {stream.title}
        </Link>
      </h3>
      <ReporterRow
        name={stream.reporterName}
        username={stream.reporterUsername}
      />
    </article>
  );
}

export function CompactRecentReportCard({
  report,
}: {
  report: FirsthandReport;
  tone?: "stage" | "surface";
}) {
  const href = `/reports/${report.id}`;
  const city = report.city ?? report.location;
  const country = report.country ?? "";
  return (
    <article className="min-w-0">
      <Link href={href} className="relative block aspect-video overflow-hidden rounded-md bg-ink" aria-label={`${city}: ${report.title}`}>
        {report.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={report.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-sm text-surface/80">Recent report</span>
        )}
        <span className="absolute left-2 top-2">
          <Badge>Recent</Badge>
        </span>
      </Link>
      <p className="fh-place mt-2.5">
        {city}
        {country ? `, ${country}` : ""}
      </p>
      <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-ink">
        <Link href={href} className="hover:underline">
          {report.title}
        </Link>
      </h3>
      {report.reporterUsername ? (
        <ReporterRow
          name={report.reporterName}
          username={report.reporterUsername}
          avatarUrl={report.reporterAvatarUrl}
        />
      ) : (
        <p className="mt-1.5 text-xs text-muted">{report.reporterName}</p>
      )}
    </article>
  );
}

function ReporterRow({
  name,
  username,
  avatarUrl,
}: {
  name: string;
  username: string;
  avatarUrl?: string | null;
}) {
  return (
    <Link href={`/u/${username}`} className="mt-1.5 flex min-w-0 items-center gap-2 text-xs text-muted hover:underline">
      <ReporterAvatar name={name} username={username} avatarUrl={avatarUrl} size="sm" />
      <span className="truncate">{name}</span>
    </Link>
  );
}
