import { AuthRequiredLink } from "@/components/auth-required-link";
import { LocationLabel } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import {
  opportunityDisclaimer,
  type CoverageOpportunity,
} from "@/lib/coverage-opportunity";
import { peopleWantThisCovered } from "@/lib/coverage-wanted";
import Link from "next/link";

export function CoverageOpportunityCard({
  item,
  isAuthenticated,
}: {
  item: CoverageOpportunity;
  isAuthenticated: boolean;
}) {
  const requestHref =
    item.relatedRequestIds[0] && !item.relatedRequestIds[0].startsWith("dev-showcase-")
      ? `/requests/${item.relatedRequestIds[0]}`
      : `/requests/new`;
  const seeHref = item.location.href;

  return (
    <article className="flex h-full flex-col rounded-xl border border-earth/25 bg-earth-soft/40 p-5">
      <LocationLabel city={item.location.city} country={item.location.country} href={item.location.href} size="card" />
      <p className="mt-3 fh-kicker">
        {item.urgency === "high" ? "High coverage demand" : item.eventType ? item.eventType.replace(/_/g, " ") : "Coverage needed"}
      </p>
      <h3 className="mt-1 fh-report-title">{item.title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{item.summary}</p>
      <p className="mt-3 text-sm font-medium text-earth">{peopleWantThisCovered(item.interestedCount)}</p>
      {item.reporterCount > 0 ? (
        <p className="mt-1 fh-meta">
          {item.reporterCount === 1 ? "1 reporter associated with this area" : `${item.reporterCount} reporters associated with this area`}
        </p>
      ) : null}
      <p className="mt-3 fh-meta">{opportunityDisclaimer(item)}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <AuthRequiredLink href="/requests/new" isAuthenticated={isAuthenticated} className={buttonClass("primary")}>
          Request coverage
        </AuthRequiredLink>
        <Link href={item.sourceType === "firsthand_demand" ? requestHref : seeHref} className={buttonClass("secondary")}>
          See activity
        </Link>
      </div>
    </article>
  );
}
