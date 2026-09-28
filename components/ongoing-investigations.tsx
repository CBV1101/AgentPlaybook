import Link from "next/link";
import { InvestigationCard } from "@/components/investigation-card";
import type { InvestigationSummary } from "@/lib/investigations";

export function OngoingInvestigationsSection({
  investigations,
}: {
  investigations: InvestigationSummary[];
}) {
  if (investigations.length === 0) {
    return null;
  }

  return (
    <section className="mt-10 sm:mt-14">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="fh-kicker">Ongoing investigations</p>
          <h2 className="mt-1 fh-section">Stories being reported over time.</h2>
        </div>
        <Link href="/investigations" className="shrink-0 text-sm font-medium text-ink underline underline-offset-2">
          View all investigations →
        </Link>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {investigations.slice(0, 4).map((investigation) => (
          <InvestigationCard key={investigation.id} investigation={investigation} compact />
        ))}
      </div>
    </section>
  );
}
