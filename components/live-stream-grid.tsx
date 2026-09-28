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

/**
 * Compact live discovery grid. Owns collection layout only.
 * Presentation of each tile is CompactLiveStreamCard + LivePreview variant="grid".
 * Do not reuse this class for globe Going On Now or the full live page player.
 *
 * Invariant at ~1600px viewport: .fh-live-section is ~1450–1520px wide;
 * .fh-live-grid has 5 tracks; each .fh-live-tile is 250–310px; no horizontal overflow.
 */
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
    <>
      <div className="fh-live-grid" data-live-grid="compact">
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
    </>
  );
}
