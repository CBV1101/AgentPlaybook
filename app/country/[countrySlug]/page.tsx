import Link from "next/link";
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
import { getCountryPage } from "@/lib/queries";
import { isPubliclyLive } from "@/lib/live";

type CountryPageProps = {
  params: Promise<{ countrySlug: string }>;
};

export default async function CountryPage({ params }: CountryPageProps) {
  const { countrySlug } = await params;
  const user = await getCurrentUser();
  const page = await getCountryPage(countrySlug, user?.id);

  if (!page) {
    notFound();
  }

  const following = user
    ? await isFollowingLocation(user.id, {
        kind: "country",
        label: page.country.name,
        country: page.country.name,
        latitude: page.country.latitude,
        longitude: page.country.longitude,
      })
    : false;

  const mapPlaces = page.cities
    .filter((city) => city.latitude !== null && city.longitude !== null)
    .map((city) => ({
      id: city.slug,
      slug: city.slug,
      place: city.name,
      city: city.name,
      country: city.country,
      latitude: city.latitude,
      longitude: city.longitude,
      label: `${city.name}, ${city.country}`,
      href: city.href,
      reportCount: city.reportCount,
      openRequestCount: city.openRequestCount,
      liveCount: page.liveStreams.filter(
        (stream) => isPubliclyLive(stream) && stream.location.city === city.name,
      ).length,
    }));

  return (
    <Page>
      <GeographyBreadcrumbs
        items={[
          { href: "/browse", label: "World" },
          { label: page.country.name },
        ]}
      />
      <p className="mt-4 fh-kicker">Country</p>
      <h1 className="mt-3 fh-hero">{page.country.name}</h1>
      <div className="mt-4 max-w-xl">
        <SearchBox />
      </div>
      <div className="mt-4">
        <FollowButton
          kind="country"
          country={page.country.name}
          latitude={page.country.latitude}
          longitude={page.country.longitude}
          isAuthenticated={Boolean(user)}
          following={following}
          nextPath={`/country/${countrySlug}`}
          followLabel={`Follow ${page.country.name}`}
          followingLabel={`Following ${page.country.name}`}
        />
      </div>
      <p className="mt-2 fh-lede">
        Firsthand reporting and coverage requests currently attached to locations in this country.
        Firsthand does not verify whether a report is true.
      </p>

      <dl className="mt-8 grid max-w-xl grid-cols-2 gap-6 border-y border-line py-5">
        <div>
          <dt className="fh-label">Firsthand reports</dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight text-ink">{page.country.reportCount}</dd>
        </div>
        <div>
          <dt className="fh-label">Open coverage requests</dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight text-ink">{page.country.openRequestCount}</dd>
        </div>
      </dl>

      <Section kicker="Live" title="Live from here">
        {page.liveStreams.length === 0 ? (
          <EmptyState title="No live firsthand reports in this country right now." />
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
          <EmptyState title="No active events in this country right now." />
        ) : (
          <div className="fh-grid">
            {page.activeEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Active cities">
        {page.cities.length === 0 ? (
          <EmptyState title="No cities in this country have coverage yet." />
        ) : (
          <ul className="mt-5">
            {page.cities.map((city) => (
              <li key={city.slug} className="fh-list-row">
                <Link href={city.href} className="block">
                  <p className="font-medium text-ink">{city.name}</p>
                  <p className="mt-1 fh-meta">
                    {city.reportCount} firsthand reports · {city.openRequestCount} open requests ·{" "}
                    {city.placeCount} places
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {mapPlaces.length > 0 ? (
        <Section title="Map">
          <div className="mt-5">
            <DiscoveryMap places={mapPlaces} />
          </div>
        </Section>
      ) : null}

      <Section title="Latest firsthand reports">
        {page.latestReports.length === 0 ? (
          <EmptyState title="No firsthand reports from this country yet." />
        ) : (
          <div className="fh-grid">
            {page.latestReports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Most requested coverage">
        {page.mostRequested.length === 0 ? (
          <EmptyState title="No open coverage requests in this country yet." />
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
