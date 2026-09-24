import Link from "next/link";
import {
  CompactLiveStreamCard,
  CompactRecentReportCard,
} from "@/components/compact-live-stream-card";
import type { LiveStreamSummary } from "@/lib/live";
import type { RankedLiveStream } from "@/lib/live-rank";
import type { FirsthandReport } from "@/lib/types";

type StreamInput = LiveStreamSummary | RankedLiveStream;

function toCard(item: StreamInput) {
  if ("stream" in item) {
    return { stream: item.stream };
  }
  return { stream: item };
}

export function LiveStreamGrid({
  streams,
  reports = [],
  limit = 10,
  moreHref = "/browse",
  moreLabel = "View all live",
  showMore = true,
}: {
  streams?: StreamInput[];
  reports?: FirsthandReport[];
  limit?: number;
  moreHref?: string;
  moreLabel?: string;
  showMore?: boolean;
}) {
  const ranked = (streams ?? []).map(toCard);
  const visibleStreams = ranked.slice(0, limit);
  const visibleReports = reports.slice(0, limit);
  const extra = ranked.length > limit || reports.length > limit;

  return (
    <div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-8 min-[600px]:grid-cols-2 min-[900px]:grid-cols-3 min-[1200px]:grid-cols-4 min-[1500px]:!grid-cols-5">
        {visibleStreams.map((item) => (
          <CompactLiveStreamCard key={item.stream.id} stream={item.stream} />
        ))}
        {visibleStreams.length === 0
          ? visibleReports.map((report) => <CompactRecentReportCard key={report.id} report={report} />)
          : null}
      </div>
      {showMore && extra ? (
        <p className="mt-5">
          <Link href={moreHref} className="text-sm font-medium text-ink underline underline-offset-2">
            {moreLabel} →
          </Link>
        </p>
      ) : null}
    </div>
  );
}
