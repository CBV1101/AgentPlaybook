import { AuthRequiredLink } from "@/components/auth-required-link";
import { LocationLabel } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";
import { peopleWantThisCovered } from "@/lib/coverage-wanted";
import { isHomepageShowcaseId } from "@/lib/homepage-showcase";
import type { CoverageRequest } from "@/lib/types";
import Link from "next/link";

export function CoverageWantedSection({
  requests,
  signedIn,
}: {
  requests: CoverageRequest[];
  signedIn: boolean;
}) {
  return (
    <section className="mt-10 sm:mt-12">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-earth">Coverage wanted</p>
          <h2 className="mt-1 fh-section">People around the world want to see this</h2>
        </div>
        <Link href="/wanted" className="shrink-0 text-sm font-medium text-brand underline underline-offset-2">
          See all
        </Link>
      </div>
      {requests.length === 0 ? (
        <EmptyState title="No open coverage requests yet.">
          <p className="mt-2">
            <AuthRequiredLink href="/requests/new" isAuthenticated={signedIn} className="text-sm text-ink underline underline-offset-2">
              Ask someone to cover a place
            </AuthRequiredLink>
          </p>
        </EmptyState>
      ) : (
        <div className="-mx-4 mt-5 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {requests.slice(0, 8).map((request) => (
            <HomeDemandCard key={request.id} request={request} signedIn={signedIn} />
          ))}
        </div>
      )}
    </section>
  );
}

function HomeDemandCard({ request, signedIn }: { request: CoverageRequest; signedIn: boolean }) {
  const actionHref = isHomepageShowcaseId(request.id) ? "/requests/new" : `/reports/new?requestId=${request.id}`;
  const detailHref = isHomepageShowcaseId(request.id) ? "/wanted" : `/requests/${request.id}`;

  return (
    <article className="flex min-w-[16.5rem] shrink-0 snap-start flex-col border-l-4 border-earth bg-earth-soft/60 p-4 sm:min-w-0">
      {request.city && request.country ? (
        <LocationLabel city={request.city} country={request.country} href={request.locationHref} size="card" />
      ) : (
        <p className="fh-place">{request.location}</p>
      )}
      <Link href={detailHref} className="mt-3 block hover:underline">
        <h3 className="text-base font-semibold leading-snug tracking-tight text-ink">{request.title}</h3>
      </Link>
      <p className="fh-demand mt-4">{peopleWantThisCovered(request.supporterCount)}</p>
      <AuthRequiredLink href={actionHref} isAuthenticated={signedIn} className={buttonClass("primary", "mt-4")}>
        Report on this
      </AuthRequiredLink>
    </article>
  );
}
