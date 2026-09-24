import { AuthRequiredLink } from "@/components/auth-required-link";
import { CoverageWantedSection } from "@/components/coverage-wanted-section";
import { HomeHero } from "@/components/home-hero";
import { HomePhilosophy } from "@/components/home-philosophy";
import { HowFirsthandWorks } from "@/components/how-firsthand-works";
import { LiveNowSection } from "@/components/live-now-section";
import { ReportCard } from "@/components/report-card";
import { WorldActivitySection } from "@/components/world-activity-section";
import { EmptyState, Page } from "@/components/ui/page";
import { getCurrentUser } from "@/lib/auth";
import { applyHomepageShowcase } from "@/lib/homepage-showcase";
import { rankLiveNow } from "@/lib/live-rank";
import { getBrowseOverview, getHomeFeed } from "@/lib/queries";

export default async function Home() {
  const [feed, overview, user] = await Promise.all([
    getHomeFeed(),
    getBrowseOverview(),
    getCurrentUser(),
  ]);
  const signedIn = Boolean(user);
  const presentation = applyHomepageShowcase({
    liveStreams: feed.liveStreams,
    requests: feed.requests,
    reports: feed.reports,
    places: feed.places,
    events: feed.activeEvents,
    cities: overview.cities,
  });
  const rankedLive = rankLiveNow(presentation.liveStreams, presentation.requests, presentation.events);
  const cities = presentation.cities.slice(0, 10);

  return (
    <Page width="home">
      {presentation.usingShowcase ? (
        <p className="mb-4 text-xs font-medium text-geo">
          Development showcase — visual fallback only. Not stored in Supabase and never shown in production.
        </p>
      ) : null}
      <HomeHero signedIn={signedIn} />
      <LiveNowSection ranked={rankedLive} signedIn={signedIn} />
      <HowFirsthandWorks signedIn={signedIn} />
      <CoverageWantedSection requests={presentation.requests} signedIn={signedIn} />
      <WorldActivitySection cities={cities} places={presentation.places} />
      <section className="mt-10 sm:mt-14">
        <p className="fh-kicker">Latest firsthand</p>
        <h2 className="mt-1 fh-section">Recent reports from the ground</h2>
        {presentation.reports.length === 0 ? (
          <EmptyState title="No firsthand reports have been published yet.">
            <p className="mt-2">
              <AuthRequiredLink href="/reports/new" isAuthenticated={signedIn} className="text-sm text-ink underline underline-offset-2">
                Publish a firsthand report
              </AuthRequiredLink>
            </p>
          </EmptyState>
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {presentation.reports.map((report) => (
              <ReportCard key={report.id} report={report} variant="media" />
            ))}
          </div>
        )}
      </section>
      <HomePhilosophy />
    </Page>
  );
}
