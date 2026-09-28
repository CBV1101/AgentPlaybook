import Link from "next/link";
import { DiscoveryMap } from "@/components/discovery-map";
import { LiveStreamGrid } from "@/components/live-stream-grid";
import { YourWorldFeed } from "@/components/your-world-feed";
import { LocationLabel } from "@/components/ui/badge";
import { Notice, Page } from "@/components/ui/page";
import { getFollowingPresentation } from "@/lib/following-presentation";
import { requireUser } from "@/lib/require-user";

type FollowingPageProps = {
  searchParams: Promise<{ before?: string }>;
};

export default async function FollowingPage({ searchParams }: FollowingPageProps) {
  const user = await requireUser("/following");
  const { before } = await searchParams;
  const presentation = await getFollowingPresentation(user.id, before);

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
        What&apos;s new in the parts of the world you follow — reporters, places, and investigations you chose.
      </p>

      {presentation.liveStreams.length > 0 ? (
        <section className="fh-live-section mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="fh-kicker text-live">Live from your world</p>
              <h2 className="mt-1 fh-section">Places you follow, reporting now</h2>
            </div>
            <Link href="/browse" className="shrink-0 text-sm font-medium text-ink underline underline-offset-2">
              View all →
            </Link>
          </div>
          <LiveStreamGrid streams={presentation.liveStreams} showMore={false} />
        </section>
      ) : presentation.hasFollows || presentation.usingShowcase ? (
        <section className="fh-live-section mt-10">
          <p className="fh-kicker text-live">Live from your world</p>
          <h2 className="mt-1 fh-section">Nothing live from your world right now</h2>
          <p className="mt-2 fh-meta">Recent reporting from follows is below. Firsthand does not invent live broadcasts.</p>
        </section>
      ) : null}

      <section className="fh-your-world mt-12">
        <p className="fh-kicker">Your world</p>
        <h2 className="mt-1 fh-section">Latest from reporters, places and investigations you follow.</h2>
        <YourWorldFeed
          items={presentation.feed}
          hasMore={presentation.hasMore}
          empty={!presentation.hasFollows && !presentation.usingShowcase}
        />
      </section>

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
    </Page>
  );
}
