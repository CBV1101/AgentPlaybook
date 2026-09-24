import Link from "next/link";
import { LocationLabel } from "@/components/ui/badge";
import { RelativeTime } from "@/components/relative-time";
import { ReporterAvatar } from "@/components/reporter-avatar";
import { peopleWantedThisCovered } from "@/lib/coverage-wanted";
import type { FirsthandReport } from "@/lib/types";

type ReportCardProps = {
  report: FirsthandReport;
  variant?: "feed" | "portfolio" | "media";
};

export function ReportCard({ report }: ReportCardProps) {
  const showcase = report.id.startsWith("dev-showcase-");
  const href = showcase ? report.locationHref || "/browse" : `/reports/${report.id}`;

  const indicators = [
    report.mediaKind === "video" ? "Video" : report.mediaKind === "photo" ? "Photos" : null,
    report.recordedLive ? "Recorded live" : null,
    report.licensingStatus === "licensing_available" ? "Licensing available" : null,
  ].filter(Boolean) as string[];

  const demand =
    report.respondsToRequest && report.requestSupporterCount && report.requestSupporterCount > 0
      ? peopleWantedThisCovered(report.requestSupporterCount)
      : null;

  return (
    <article className="fh-content-card">
      {report.thumbnailUrl ? (
        <Link href={href} className="relative block bg-ink" aria-label={report.title}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={report.thumbnailUrl} alt="" className="aspect-[16/10] h-auto w-full object-cover" />
          {report.city && report.country ? (
            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent px-3 py-2">
              <LocationLabel city={report.city} country={report.country} size="overlay" className="text-[0.7rem] sm:text-xs" />
            </span>
          ) : null}
          {report.mediaKind === "video" ? (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink/75">
                <span className="ml-0.5 h-0 w-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-surface" />
              </span>
            </span>
          ) : null}
        </Link>
      ) : report.mediaKind !== "text" ? (
        <Link href={href} className="block bg-canvas" aria-label={report.title}>
          <div className="flex h-40 items-center justify-center">
            <span className="fh-label">{report.mediaKind === "video" ? "Video" : "Photos"}</span>
          </div>
        </Link>
      ) : null}

      <div className="p-4">
        <Link href={href} className="block hover:underline">
          <h3 className="fh-report-title">{report.title}</h3>
        </Link>
        <p className="mt-2 fh-meta">
          <RelativeTime value={report.capturedAt} prefix="Captured" className="inline fh-meta" />
        </p>
        <div className="mt-3">
          {report.reporterUsername ? (
            <Link href={`/u/${report.reporterUsername}`} className="flex items-center gap-2 hover:underline">
              <ReporterAvatar
                name={report.reporterName}
                username={report.reporterUsername}
                avatarUrl={report.reporterAvatarUrl}
                size="sm"
              />
              <span className="text-sm font-medium text-ink">{report.reporterName}</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <ReporterAvatar name={report.reporterName} username="reporter" avatarUrl={report.reporterAvatarUrl} size="sm" />
              <span className="text-sm font-medium text-ink">{report.reporterName}</span>
            </div>
          )}
        </div>
        {indicators.length > 0 ? (
          <p className="mt-3 fh-label">
            {indicators.map((label, index) => (
              <span key={label}>
                {index > 0 ? <span className="px-1.5 text-line">·</span> : null}
                {label}
              </span>
            ))}
          </p>
        ) : null}
        {report.respondsToRequest && report.requestTitle ? (
          <p className="mt-3 fh-meta">
            Responding to:{" "}
            {report.requestId ? (
              <Link href={`/requests/${report.requestId}`} className="text-ink underline">
                {report.requestTitle}
              </Link>
            ) : (
              <span className="text-ink">{report.requestTitle}</span>
            )}
          </p>
        ) : null}
        {demand ? <p className="mt-1 fh-meta">{demand}</p> : null}
      </div>
    </article>
  );
}
