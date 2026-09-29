import Link from "next/link";
import { LivePreview } from "@/components/live-preview";
import { ReporterAvatar } from "@/components/reporter-avatar";
import { Badge } from "@/components/ui/badge";
import { reporterProfileHref, type LiveStreamSummary } from "@/lib/live";
import type { FirsthandReport } from "@/lib/types";

export function CompactLiveStreamCard({
  stream,
}: {
  stream: LiveStreamSummary;
  demandCount?: number;
  tone?: "stage" | "surface";
}) {
  const reporterHref = reporterProfileHref(stream.reporterUsername);
  const live = stream.status === "live";
  return (
    <article className="fh-live-tile">
      <LivePreview stream={stream} autoplay={live} variant="grid" viewerSurface="home" />
      <p className="fh-place mt-2.5">
        <Link href={stream.location.href} className="hover:underline">
          {stream.location.city}, {stream.location.country}
        </Link>
      </p>
      <h3 className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug text-ink">
        {reporterHref ? (
          <Link href={reporterHref} className="hover:underline">
            {stream.title}
          </Link>
        ) : (
          stream.title
        )}
      </h3>
      {reporterHref ? (
        <ReporterRow name={stream.reporterName} username={stream.reporterUsername} />
      ) : (
        <p className="mt-1.5 text-xs text-muted">{stream.reporterName}</p>
      )}
    </article>
  );
}

export function CompactRecentReportCard({
  report,
}: {
  report: FirsthandReport;
  tone?: "stage" | "surface";
}) {
  const reporterHref = reporterProfileHref(report.reporterUsername);
  const href = reporterHref ?? (report.id.startsWith("dev-showcase-") ? null : `/reports/${report.id}`);
  const city = report.city ?? report.location;
  const country = report.country ?? "";
  const thumb = report.thumbnailUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={report.thumbnailUrl} alt="" className="h-full w-full object-cover" />
  ) : (
    <span className="flex h-full items-center justify-center text-sm text-surface/80">Recent report</span>
  );
  return (
    <article className="fh-live-tile">
      {href ? (
        <Link href={href} className="fh-live-preview-grid" aria-label={`${report.reporterName} reporter profile`}>
          {thumb}
          <span className="absolute left-2 top-2">
            <Badge>Recent</Badge>
          </span>
        </Link>
      ) : (
        <div className="fh-live-preview-grid">
          {thumb}
          <span className="absolute left-2 top-2">
            <Badge>Recent</Badge>
          </span>
        </div>
      )}
      <p className="fh-place mt-2.5">
        {city}
        {country ? `, ${country}` : ""}
      </p>
      <h3 className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug text-ink">
        {href ? (
          <Link href={href} className="hover:underline">
            {report.title}
          </Link>
        ) : (
          report.title
        )}
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
