import { AuthRequiredLink } from "@/components/auth-required-link";
import { LocationLabel } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { firsthandResponseLabel, peopleWantThisCovered } from "@/lib/coverage-wanted";
import type { CoverageRequest } from "@/lib/types";
import Link from "next/link";

type CoverageWantedCardProps = {
  request: CoverageRequest;
  isAuthenticated: boolean;
  distanceLabel?: string | null;
  compact?: boolean;
};

export function CoverageWantedCard({
  request,
  isAuthenticated,
  distanceLabel,
  compact = false,
}: CoverageWantedCardProps) {
  const reportHref = `/reports/new?requestId=${request.id}`;
  const location = request.locationHref ? (
    <Link href={request.locationHref} className="hover:underline">
      {request.location}
    </Link>
  ) : (
    <span>{request.location}</span>
  );

  return (
    <article className="fh-content-card flex h-full flex-col p-4">
      {request.city && request.country ? (
        <LocationLabel city={request.city} country={request.country} href={request.locationHref} size="card" />
      ) : (
        <p className="fh-place">{location}</p>
      )}
      <Link href={`/requests/${request.id}`} className="mt-2 block hover:underline">
        <h3 className="fh-report-title">{request.title}</h3>
      </Link>
      <p className="mt-3 text-sm font-medium text-ink">{peopleWantThisCovered(request.supporterCount)}</p>
      {compact ? null : (
        <dl className="mt-3 space-y-1 fh-meta">
          <div>
            <dt className="sr-only">Existing reports</dt>
            <dd>{firsthandResponseLabel(request.responseCount ?? 0)}</dd>
          </div>
          <div>
            <dt className="sr-only">Requested</dt>
            <dd>Requested {request.requestedLabel ?? request.createdAt}</dd>
          </div>
          {distanceLabel ? (
            <div>
              <dt className="sr-only">Distance</dt>
              <dd>{distanceLabel}</dd>
            </div>
          ) : null}
        </dl>
      )}
      {compact && distanceLabel ? <p className="mt-1 fh-meta">{distanceLabel}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <AuthRequiredLink
          href={reportHref}
          isAuthenticated={isAuthenticated}
          className={buttonClass("primary")}
        >
          Report on this
        </AuthRequiredLink>
        {compact ? null : (
          <Link href={`/requests/${request.id}`} className={buttonClass("secondary")}>
            View request
          </Link>
        )}
      </div>
    </article>
  );
}
