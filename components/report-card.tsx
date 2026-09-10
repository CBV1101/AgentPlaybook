import Link from "next/link";
import { formatWhen } from "@/lib/format";
import type { FirsthandReport } from "@/lib/types";

const mediaLabel = {
  video: "Video",
  photo: "Photos",
  text: "Text",
} as const;

type ReportCardProps = {
  report: FirsthandReport;
  variant?: "feed" | "portfolio";
};

export function ReportCard({ report, variant = "feed" }: ReportCardProps) {
  const href = `/reports/${report.id}`;
  const location = report.locationSlug ? (
    <Link href={`/place/${report.locationSlug}`} className="hover:underline">
      {report.location}
    </Link>
  ) : (
    <span>{report.location}</span>
  );

  return (
    <article className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      {report.thumbnailUrl ? (
        <Link href={href} className="block" aria-label={report.title}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={report.thumbnailUrl} alt="" className="h-40 w-full object-cover" />
        </Link>
      ) : null}
      <div className="p-5">
        <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-wide text-stone-500">
          {location}
          <span>{mediaLabel[report.mediaKind]}</span>
        </div>
        <Link href={href} className="block hover:underline">
          <h3 className="mt-2 font-[family-name:var(--font-display)] text-lg text-stone-900">{report.title}</h3>
        </Link>

        {variant === "portfolio" ? (
          <dl className="mt-3 grid gap-2 text-sm text-stone-600">
            <div>
              <dt className="text-xs uppercase tracking-wide text-stone-400">Captured</dt>
              <dd>{formatWhen(report.capturedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-stone-400">Uploaded</dt>
              <dd>{formatWhen(report.publishedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-stone-400">Published as</dt>
              <dd>
                {report.respondsToRequest ? (
                  report.requestId ? (
                    <>
                      Responded to a{" "}
                      <Link href={`/requests/${report.requestId}`} className="underline">
                        coverage request
                      </Link>
                    </>
                  ) : (
                    "Responded to a coverage request"
                  )
                ) : (
                  "Independently published"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-stone-400">Media usage</dt>
              <dd>
                {report.licensingStatus === "licensing_available"
                  ? "Available for licensing"
                  : "View only"}
              </dd>
            </div>
          </dl>
        ) : (
          <>
            <p className="mt-2 text-sm leading-6 text-stone-600">{report.excerpt}</p>
            <p className="mt-4 text-sm text-stone-500">
              {report.reporterUsername ? (
                <>
                  Reported by{" "}
                  <Link href={`/u/${report.reporterUsername}`} className="underline">
                    {report.reporterName}
                  </Link>
                </>
              ) : (
                <>Reported by {report.reporterName}</>
              )}
            </p>
          </>
        )}
      </div>
    </article>
  );
}
