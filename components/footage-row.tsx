import Link from "next/link";
import { RelativeTime } from "@/components/relative-time";
import { buttonClass } from "@/components/ui/button";
import type { FirsthandReport } from "@/lib/types";

export function FootageRow({ report }: { report: FirsthandReport }) {
  const href = `/reports/${report.id}`;
  const mediaLabel = report.mediaKind === "video" ? "Video" : report.mediaKind === "photo" ? "Photo" : "Media";

  return (
    <article className="flex flex-col gap-3 border-b border-line py-4 last:border-b-0 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 gap-3">
        {report.thumbnailUrl ? (
          <Link href={href} className="relative block h-20 w-28 shrink-0 overflow-hidden bg-ink" aria-label={report.title}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={report.thumbnailUrl} alt="" className="h-full w-full object-cover" />
          </Link>
        ) : (
          <Link href={href} className="flex h-20 w-28 shrink-0 items-center justify-center bg-canvas" aria-label={report.title}>
            <span className="fh-label">{mediaLabel}</span>
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="fh-report-title">
            <Link href={href} className="hover:underline">
              {report.title}
            </Link>
          </h3>
          <p className="mt-1 fh-meta">
            {mediaLabel}
            {" · "}
            {report.locationHref ? (
              <Link href={report.locationHref} className="hover:underline">
                {report.location}
              </Link>
            ) : (
              report.location
            )}
          </p>
          <p className="mt-1">
            <RelativeTime value={report.capturedAt} prefix="Captured" className="inline fh-meta" />
          </p>
        </div>
      </div>
      <Link href={href} className={buttonClass("secondary", "self-start sm:self-center")}>
        Request licensing
      </Link>
    </article>
  );
}
