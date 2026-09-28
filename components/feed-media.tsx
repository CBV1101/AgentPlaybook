import Link from "next/link";
import type { FirsthandReport } from "@/lib/types";
import { reporterProfileHref } from "@/lib/live";

export function FeedMedia({ report, href }: { report: FirsthandReport; href?: string | null }) {
  const target =
    href ??
    reporterProfileHref(report.reporterUsername) ??
    (report.id.startsWith("dev-showcase-") ? report.locationHref ?? "/browse" : `/reports/${report.id}`);

  return (
    <Link
      href={target}
      className="relative block aspect-video overflow-hidden rounded-md bg-ink"
      aria-label={report.reporterName ? `${report.reporterName} reporter profile` : report.title}
    >
      {report.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={report.thumbnailUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full items-center justify-center text-sm text-surface/80">Firsthand report</span>
      )}
    </Link>
  );
}
