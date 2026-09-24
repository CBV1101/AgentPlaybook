import { ReporterAvatar } from "@/components/reporter-avatar";
import { Badge } from "@/components/ui/badge";
import type { AreaReporter } from "@/lib/coverage-opportunity";
import Link from "next/link";

export function AreaReporters({ reporters }: { reporters: AreaReporter[] }) {
  if (reporters.length === 0) {
    return null;
  }

  return (
    <section className="mt-8">
      <p className="fh-kicker">Reporters in the area</p>
      <h2 className="mt-1 fh-section">People who have reported from this city</h2>
      <p className="mt-2 max-w-2xl fh-meta">
        Shown only from public Firsthand activity in that city — not private device location.
      </p>
      <ul className="mt-4 divide-y divide-line">
        {reporters.map((reporter) => (
          <li key={reporter.id} className="flex items-center justify-between gap-3 py-3">
            <Link href={`/u/${reporter.username}`} className="flex min-w-0 items-center gap-3 hover:underline">
              <ReporterAvatar
                name={reporter.displayName}
                username={reporter.username}
                avatarUrl={reporter.avatarUrl}
                size="sm"
              />
              <span>
                <span className="block text-sm font-medium text-ink">{reporter.displayName}</span>
                <span className="block fh-meta">
                  {reporter.placeLabel}
                  {reporter.recentTitle ? ` · ${reporter.recentTitle}` : ""}
                </span>
              </span>
            </Link>
            {reporter.live ? <Badge tone="live">Live</Badge> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
