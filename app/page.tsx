import { AuthRequiredLink } from "@/components/auth-required-link";
import { CoverageWantedSection } from "@/components/coverage-wanted-section";
import { HomeHero } from "@/components/home-hero";
import { LiveNowSection } from "@/components/live-now-section";
import { ReportCard } from "@/components/report-card";
import { WorldActivitySection } from "@/components/world-activity-section";
import { EmptyState, Page, Section } from "@/components/ui/page";
import { getCurrentUser } from "@/lib/auth";
import { rankLiveNow } from "@/lib/live-rank";
import { getBrowseOverview, getHomeFeed } from "@/lib/queries";

export default async function Home() {
  const [feed, overview, user] = await Promise.all([
    getHomeFeed(),
    getBrowseOverview(),
    getCurrentUser(),
  ]);
  const signedIn = Boolean(user);
  const rankedLive = rankLiveNow(feed.liveStreams, feed.requests, feed.activeEvents);
  const cities = overview.cities.slice(0, 10);

  return (
    <Page>
      <HomeHero signedIn={signedIn} />
      <LiveNowSection ranked={rankedLive} signedIn={signedIn} />
      <CoverageWantedSection requests={feed.requests} signedIn={signedIn} />
      <WorldActivitySection cities={cities} places={feed.places} />
      <Section
        kicker="Latest firsthand"
        title="Recent reports from the ground"
      >
        {feed.reports.length === 0 ? (
          <EmptyState title="No firsthand reports have been published yet.">
            <p className="mt-2">
              <AuthRequiredLink href="/reports/new" isAuthenticated={signedIn} className="text-sm text-ink underline underline-offset-2">
                Publish a firsthand report
              </AuthRequiredLink>
            </p>
          </EmptyState>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {feed.reports.map((report) => (
              <ReportCard key={report.id} report={report} variant="media" />
            ))}
          </div>
        )}
      </Section>
      <p className="mt-10 fh-meta">
        Firsthand organizes firsthand accounts; it does not certify reporters&apos; conclusions.
      </p>
    </Page>
  );
}
