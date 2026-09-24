import { compactReporterStatsLine, countLabel } from "@/lib/data/reporter";
import { peopleSupportedThisReporting } from "@/lib/support";
import type { ReporterStats } from "@/lib/types";

export function ReporterStatsHeader({
  stats,
  livestreamCount = 0,
}: {
  stats: ReporterStats;
  livestreamCount?: number;
}) {
  return (
    <div className="mt-4">
      <p className="fh-meta">{compactReporterStatsLine(stats, livestreamCount)}</p>
      {stats.supportCount > 0 ? (
        <p className="mt-1 fh-meta">{peopleSupportedThisReporting(stats.supportCount)}</p>
      ) : null}
    </div>
  );
}

export function reporterPlacesLabel(count: number) {
  return countLabel(count, "firsthand report", "firsthand reports");
}
