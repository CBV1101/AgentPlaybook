import { notFound } from "next/navigation";
import { FollowButton } from "@/components/follow-button";
import { DiscoveryMap } from "@/components/discovery-map";
import { GeographyBreadcrumbs } from "@/components/geography-breadcrumbs";
import { ReportCard } from "@/components/report-card";
import { RequestCard } from "@/components/request-card";
import { EventCard } from "@/components/event-card";
import { LiveCard } from "@/components/live-card";
import { SearchBox } from "@/components/search-box";
import { EmptyState, Page, Section } from "@/components/ui/page";
import { getCurrentUser } from "@/lib/auth";
import { isFollowingLocation } from "@/lib/data";
import { getCityPage } from "@/lib/queries";

type CityPageProps = {
  params: Promise<{ citySlug: string }>;
};

export default async function CityPage({ params }: CityPageProps) {
  const { citySlug } = await params;
  const user = await getCurrentUser();
  const page = await getCityPage(citySlug, user?.id);

  if (!page) {
    notFound();
  }

  const following = user
    ? await isFollowingLocation(user.id, {
        kind: "city",
        label: page.city.name,
        country: page.city.country,
        city: page.city.name,
        latitude: page.city.latitude,
        longitude: page.city.longitude,
      })
    : false;

  return (
    <Page>
      <GeographyBreadcrumbs
        items={[
          { href: "/browse", label: "World" },
          { href: `/country/${page.city.countrySlug}`, label: page.city.country },
          { label: page.city.name },
        ]}
      />
      <p className="mt-4 fh-kicker">City</p>
      <h1 className="mt-3 fh-hero">{page.city.name}</h1>
      <p className="mt-2 fh-meta">{page.city.country}</p>
      <div className="mt-4 max-w-xl">
        <SearchBox />
      </div>
      <div className="mt-4">
        <FollowButton
          kind="city"
          country={page.city.country}
          city={page.city.name}
          latitude={page.city.latitude}
          longitude={page.city.longitude}
          isAuthenticated={Boolean(user)}
          following={following}
          nextPath={`/city/${citySlug}`}
          followLabel={`Follow ${page.city.name}`}
          followingLabel={`Following ${page.city.name}`}
        />
      </div>
      <p className="mt-3 max-w-3xl fh-lede">
        This city archive includes reports and requests from specific places and from city-level
        locations when a landmark is not named. Firsthand does not verify whether a report is true.
      </p>

      <dl className="mt-8 grid max-w-2xl grid-cols-3 gap-6 border-y border-line py-5">
        <div>
          <dt className="fh-label">Firsthand reports</dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight text-ink">{page.city.reportCount}</dd>
        </div>
        <div>
          <dt className="fh-label">Open requests</dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight text-ink">{page.city.openRequestCount}</dd>
        </div>
        <div>
          <dt className="fh-label">Places</dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight text-ink">{page.city.placeCount}</dd>
        </div>
      </dl>

      <Section kicker="Live" title="Live from here">
        {page.liveStreams.length === 0 ? (
          <EmptyState title="No live firsthand reports in this city right now." />
        ) : (
          <div className="fh-grid">
            {page.liveStreams.map((stream) => (
              <LiveCard key={stream.id} stream={stream} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Active events here">
        {page.activeEvents.length === 0 ? (
          <EmptyState title="No active events in this city right now." />
        ) : (
          <div className="fh-grid">
            {page.activeEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Places being reported from">
        {page.places.length === 0 ? (
          <EmptyState title="Coverage here is currently city-level. No specific landmark archives have activity yet." />
        ) : (
          <ul className="mt-5">
            {page.places.map((place) => (
              <li key={place.id} className="fh-list-row">
                <a href={`/place/${place.slug}`} className="block">
                  <p className="font-medium text-ink">{place.place || place.city}</p>
                  <p className="mt-1 fh-meta">
                    {place.reportCount} firsthand reports · {place.openRequestCount} open requests
                    {place.liveCount > 0 ? ` · ${place.liveCount} live` : ""}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {page.mapPlaces.length > 0 ? (
        <Section title="Map">
          <div className="mt-5">
            <DiscoveryMap places={page.mapPlaces} />
          </div>
        </Section>
      ) : null}

      <Section title="Latest firsthand reports">
        {page.latestReports.length === 0 ? (
          <EmptyState title="No firsthand reports from this city yet." />
        ) : (
          <div className="fh-grid">
            {page.latestReports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Most requested questions">
        {page.mostRequested.length === 0 ? (
          <EmptyState title="No open coverage requests in this city yet." />
        ) : (
          <div className="fh-grid">
            {page.mostRequested.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        )}
      </Section>
    </Page>
  );
}
