import { countLabel } from "@/lib/data/reporter";
import type { ReporterStats } from "@/lib/types";

export function ReporterStatsHeader({ stats }: { stats: ReporterStats }) {
  return (
    <div>
      <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <li className="rounded-2xl border border-stone-200 bg-white px-4 py-4">
          <p className="font-[family-name:var(--font-display)] text-xl text-stone-950">
            {countLabel(stats.reportCount, "firsthand report", "firsthand reports")}
          </p>
        </li>
        <li className="rounded-2xl border border-stone-200 bg-white px-4 py-4">
          <p className="font-[family-name:var(--font-display)] text-xl text-stone-950">
            {countLabel(stats.locationCount, "place covered", "places covered")}
          </p>
        </li>
        <li className="rounded-2xl border border-stone-200 bg-white px-4 py-4">
          <p className="font-[family-name:var(--font-display)] text-xl text-stone-950">
            {countLabel(
              stats.licensingAvailableCount,
              "report available for licensing",
              "reports available for licensing",
            )}
          </p>
        </li>
      </ul>
      <p className="mt-3 text-sm text-stone-500">
        These counts describe published work. Firsthand does not score accuracy, assign a reputation
        rating, or verify whether a report is true.
      </p>
    </div>
  );
}
