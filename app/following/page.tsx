import Link from "next/link";
import { DiscoveryMap } from "@/components/discovery-map";
import { LiveStreamGrid } from "@/components/live-stream-grid";
import { ReportCard } from "@/components/report-card";
import { RequestCard } from "@/components/request-card";
import { LocationLabel } from "@/components/ui/badge";
import { EmptyState, Notice, Page } from "@/components/ui/page";
import { getFollowingPresentation } from "@/lib/following-presentation";
import { formatRelativeTime } from "@/lib/format";
import { requireUser } from "@/lib/require-user";

export default async function FollowingPage() {
  const user = await requireUser("/following");
  const presentation = await getFollowingPresentation(user.id);

  return (
    <Page width="home">
      {presentation.usingShowcase ? (
        <Notice>
          Development showcase — not follows you created. Not stored in Supabase and never shown in
          production.
        </Notice>
      ) : null}

      <p className="fh-kicker">Following</p>
      <h1 className="mt-2 fh-hero">Your window into the parts of the world you care about.</h1>
      <p className="mt-3 max-w-2xl fh-lede">
        Live and recent firsthand activity from reporters and places you follow — not a ranked news
        feed.
      </p>

      {presentation.liveStreams.length > 0 ? (
        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="fh-kicker text-live">Live from your world</p>
              <h2 className="mt-1 fh-section">Places you follow, reporting now</h2>
            </div>
            <Link href="/browse" className="shrink-0 text-sm font-medium text-ink underline underline-offset-2">
              View all live →
            </Link>
          </div>
          <div className="mt-6">
            <LiveStreamGrid streams={presentation.liveStreams} showMore={false} />
          </div>
        </section>
      ) : presentation.latestReports.length > 0 ? (
        <section className="mt-8">
          <p className="fh-kicker">Latest from your world</p>
          <h2 className="mt-1 fh-section">Recent reports from places you follow</h2>
          <p className="mt-2 fh-meta">These are published firsthand reports, not live broadcasts.</p>
          <div className="mt-4">
            <LiveStreamGrid reports={presentation.latestReports} showMore={false} />
          </div>
        </section>
      ) : (
        <EmptyState title="Nothing from your follows yet.">
          <p className="mt-2">
            <Link href="/browse" className="underline">
              Explore the world
            </Link>
          </p>
        </EmptyState>
      )}

      {presentation.cities.length > 0 ? (
        <section className="mt-10 rounded-2xl border border-geo/20 bg-geo-soft/40 p-4 sm:p-6">
          <p className="fh-kicker">Following world view</p>
          <h2 className="mt-1 fh-section">Where your follows are active</h2>
          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            {presentation.places.length > 0 ? (
              <DiscoveryMap places={presentation.places} compact caption="Followed activity only. The map does not rank places." />
            ) : null}
            <ul>
              {presentation.cities.slice(0, 8).map((city) => (
                <li key={`${city.city}-${city.country}`} className="border-b border-geo/15 last:border-0">
                  <Link href={city.href} className="flex items-baseline justify-between gap-3 py-3">
                    <LocationLabel city={city.city} country={city.country} size="card" />
                    <span className="text-sm text-ink">
                      {[
                        city.liveCount ? `${city.liveCount} live` : null,
                        city.reportCount ? `${city.reportCount} reports` : null,
                        city.requestCount ? `${city.requestCount} requests` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <p className="fh-kicker">Followed activity</p>
        <h2 className="mt-1 fh-section">Where, who, what, when</h2>
        {presentation.feed.length === 0 ? (
          <EmptyState title="Follow a reporter or a city archive to fill this list." />
        ) : (
          <ol className="mt-5 space-y-6">
            {presentation.feed.map((item) => (
              <li key={item.id}>
                <p className="mb-2 fh-meta">
                  {item.reason}
                  {item.report?.capturedAt ? ` · ${formatRelativeTime(item.report.capturedAt)}` : null}
                  {item.request?.createdAt && !item.report ? ` · ${formatRelativeTime(item.request.createdAt)}` : null}
                </p>
                {item.report ? <ReportCard report={item.report} /> : null}
                {item.request ? <RequestCard request={item.request} /> : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </Page>
  );
}
