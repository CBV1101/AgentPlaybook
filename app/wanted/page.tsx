import { AuthRequiredLink } from "@/components/auth-required-link";
import { CoverageWantedBoard } from "@/components/coverage-wanted-board";
import { AreaReporters } from "@/components/area-reporters";
import { CoverageOpportunityCard } from "@/components/coverage-opportunity-card";
import { DiscoveryMap } from "@/components/discovery-map";
import { EmptyState, Notice, Page } from "@/components/ui/page";
import { getCurrentUser } from "@/lib/auth";
import { reportersInArea } from "@/lib/coverage-opportunity";
import { getWantedPresentation } from "@/lib/explore-presentation";

export default async function WantedPage() {
  const user = await getCurrentUser();
  const presentation = await getWantedPresentation(user?.id);
  const signedIn = Boolean(user);
  const hot = presentation.opportunities.slice(0, 4);
  const areaReporters = (() => {
    for (const item of presentation.opportunities) {
      const found = reportersInArea(
        item.location.city,
        item.location.country,
        presentation.reports,
        presentation.liveStreams,
      );
      if (found.length > 0) {
        return found;
      }
    }
    return [];
  })();

  return (
    <Page width="home">
      {presentation.usingShowcase ? (
        <Notice>
          Development showcase — visual fallback only. Event signals here are illustrative, not current
          verified events, not stored in Supabase, and never shown in production.
        </Notice>
      ) : null}

      <section className="fh-hero-geo relative overflow-hidden rounded-2xl border border-geo/20 px-4 py-6 sm:px-8 sm:py-8">
        <p className="fh-kicker">Coverage wanted</p>
        <h1 className="fh-hero mt-2">Where the world wants eyes.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
          See what people want reported — or ask someone on the ground to show you. A coverage
          request is a question about a place, not a Firsthand confirmation of an event.
        </p>
        <p className="mt-4">
          <AuthRequiredLink href="/requests/new" isAuthenticated={signedIn} className="text-sm font-medium text-brand underline underline-offset-2">
            Ask someone on the ground
          </AuthRequiredLink>
        </p>
      </section>

      <section className="mt-10">
        <p className="fh-kicker">Hot coverage</p>
        <h2 className="mt-1 fh-section">Where firsthand views would help right now</h2>
        <p className="mt-2 max-w-2xl fh-meta">
          Ranked from Firsthand demand, plus optional event signals in development. An event signal
          is not a report.
        </p>
        {hot.length === 0 ? (
          <EmptyState title="No open coverage demand yet. Ask for a view from a place you care about." />
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {hot.map((item) => (
              <CoverageOpportunityCard key={item.id} item={item} isAuthenticated={signedIn} />
            ))}
          </div>
        )}
      </section>

      <AreaReporters reporters={areaReporters} />

      {presentation.places.length > 0 ? (
        <section className="mt-10">
          <p className="fh-kicker">Coverage map</p>
          <h2 className="mt-1 fh-section">Where people are asking, reporting, or live</h2>
          <div className="mt-4">
            <DiscoveryMap
              places={presentation.places}
              caption="Red: live. Terracotta: coverage wanted. Teal: recent reports. Geographic discovery, not a ranking."
            />
          </div>
        </section>
      ) : null}

      <CoverageWantedBoard items={presentation.requests} isAuthenticated={signedIn} />
    </Page>
  );
}
