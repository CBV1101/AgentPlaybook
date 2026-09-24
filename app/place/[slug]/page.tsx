import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FollowButton } from "@/components/follow-button";
import { AuthRequiredLink } from "@/components/auth-required-link";
import { InterestButton } from "@/components/interest-button";
import { MapPreview } from "@/components/map-preview";
import { PlaceArchiveControls } from "@/components/place-archive-controls";
import { ReportCard } from "@/components/report-card";
import { RequestCard } from "@/components/request-card";
import { EventCard } from "@/components/event-card";
import { LiveCard } from "@/components/live-card";
import { buttonClass } from "@/components/ui/button";
import { EmptyState, Page, Section } from "@/components/ui/page";
import { getCurrentUser } from "@/lib/auth";
import { isFollowingLocation } from "@/lib/data";
import { filterAndSortPlaceReports, parsePlaceArchiveFilters } from "@/lib/data/discovery";
import { getCityPage, getPlacePageData } from "@/lib/queries";
import { GeographyBreadcrumbs } from "@/components/geography-breadcrumbs";
import { cityHref, countryHref } from "@/lib/geo";

type PlacePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string | string[]; kind?: string | string[]; usage?: string | string[] }>;
};

export default async function PlacePage({ params, searchParams }: PlacePageProps) {
  const { slug } = await params;
  const rawFilters = await searchParams;
  const filters = parsePlaceArchiveFilters(rawFilters);
  const user = await getCurrentUser();
  const page = await getPlacePageData(slug, user?.id);

  if (!page) {
    const cityPage = await getCityPage(slug);
    if (cityPage) {
      redirect(`/city/${slug}`);
    }
    notFound();
  }

  const title = page.location.place || page.location.city;
  const following = user
    ? await isFollowingLocation(user.id, {
        kind: "place",
        label: title,
        country: page.location.country,
        city: page.location.city,
        locationId: page.location.id,
      })
    : false;
  const latestReports = [...page.reports]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 3);
  const historicalReports = filterAndSortPlaceReports(page.reports, filters);

  return (
    <Page>
      <GeographyBreadcrumbs
        items={[
          { href: "/browse", label: "World" },
          { href: countryHref(page.location.country), label: page.location.country },
          { href: cityHref(page.location.city, page.location.country), label: page.location.city },
          { label: title },
        ]}
      />
      <p className="mt-4 fh-kicker">Place archive</p>
      <h1 className="mt-3 fh-hero">
        {title}
        {page.location.place ? (
          <span className="block text-2xl font-normal text-muted sm:inline sm:text-3xl">
            {", "}
            {page.location.city}
          </span>
        ) : null}
      </h1>
      <p className="mt-2 fh-meta">
        <Link href={cityHref(page.location.city, page.location.country)} className="underline">
          {page.location.city}
        </Link>
        {", "}
        <Link href={countryHref(page.location.country)} className="underline">
          {page.location.country}
        </Link>
      </p>
      <div className="mt-4">
        <FollowButton
          kind="place"
          country={page.location.country}
          city={page.location.city}
          locationId={page.location.id}
          latitude={page.location.latitude}
          longitude={page.location.longitude}
          isAuthenticated={Boolean(user)}
          following={following}
          nextPath={`/place/${slug}`}
          followLabel={`Follow ${title}`}
          followingLabel={`Following ${title}`}
        />
      </div>

      <nav className="mt-6 flex gap-3 overflow-x-auto text-sm text-muted">
        <a href="#overview" className="whitespace-nowrap underline">
          Overview
        </a>
        <a href="#open-questions" className="whitespace-nowrap underline">
          Open questions
        </a>
        <a href="#latest" className="whitespace-nowrap underline">
          Latest reports
        </a>
        <a href="#archive" className="whitespace-nowrap underline">
          Historical reports
        </a>
      </nav>

      <section id="overview" className="mt-8 scroll-mt-24">
        <h2 className="fh-section">Overview</h2>
        <p className="mt-2 max-w-3xl fh-lede">
          This is a permanent archive of firsthand reporting and coverage requests for {page.location.label}.
          It answers what reporting exists from this place, and what people are asking someone to cover
          here. Firsthand does not verify whether a report is true.
        </p>
        <div className="mt-6 max-w-3xl">
          <MapPreview
            latitude={page.location.latitude}
            longitude={page.location.longitude}
            label={page.location.label}
          />
        </div>
        <dl className="mt-8 grid max-w-xl grid-cols-2 gap-6 border-y border-line py-5">
          <div>
            <dt className="fh-label">Open coverage requests</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight text-ink">{page.openRequestCount}</dd>
          </div>
          <div>
            <dt className="fh-label">Firsthand reports</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight text-ink">{page.reportCount}</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <AuthRequiredLink
            href={`/live/new?locationId=${page.location.id}`}
            isAuthenticated={Boolean(user)}
            className={buttonClass("live")}
          >
            Go live
          </AuthRequiredLink>
          <AuthRequiredLink
            href="/reports/new"
            isAuthenticated={Boolean(user)}
            className={buttonClass("secondary")}
          >
            Report from this location
          </AuthRequiredLink>
          <AuthRequiredLink
            href="/requests/new"
            isAuthenticated={Boolean(user)}
            className={buttonClass("secondary")}
          >
            Request coverage here
          </AuthRequiredLink>
        </div>
      </section>

      <Section kicker="Live" title="Live from here">
        {page.liveStreams.length === 0 ? (
          <EmptyState title="No live firsthand reports from this place right now." />
        ) : (
          <div className="fh-grid">
            {page.liveStreams.map((stream) => (
              <LiveCard key={stream.id} stream={stream} />
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Active events here"
        description="Time-bound groupings of firsthand reporting at this place. The place archive stays permanent."
      >
        {page.activeEvents.length === 0 ? (
          <EmptyState title="No active events at this location." />
        ) : (
          <div className="fh-grid">
            {page.activeEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </Section>

      <section id="open-questions" className="fh-section-block scroll-mt-24">
        <h2 className="fh-section">Open questions</h2>
        <p className="mt-2 fh-lede">What people are asking someone to cover here.</p>
        {page.openRequests.length === 0 ? (
          <EmptyState title="There are no open requests for this place." />
        ) : (
          <div className="fh-grid">
            {page.openRequests.map((request) => (
              <div key={request.id} className="space-y-3">
                <RequestCard request={request} />
                <InterestButton
                  requestId={request.id}
                  nextPath={`/requests/${request.id}`}
                  isAuthenticated={Boolean(user)}
                  alreadyInterested={Boolean(request.currentUserInterested)}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section id="latest" className="fh-section-block scroll-mt-24">
        <h2 className="fh-section">Latest firsthand reports</h2>
        <p className="mt-2 fh-lede">The most recently uploaded reports from this place.</p>
        {latestReports.length === 0 ? (
          <EmptyState title="No firsthand reports from this place yet." />
        ) : (
          <div className="fh-grid">
            {latestReports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </section>

      <section id="archive" className="fh-section-block scroll-mt-24">
        <h2 className="fh-section">Historical reports</h2>
        <p className="mt-2 fh-lede">
          The full reporting record for this place. Sort by time or by whether a report answered a
          highly requested question. There is no algorithmic ranking.
        </p>
        <div className="mt-5">
          <PlaceArchiveControls slug={slug} filters={filters} />
        </div>
        {historicalReports.length === 0 ? (
          <EmptyState title="No reports match these filters." />
        ) : (
          <div className="fh-grid">
            {historicalReports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </section>

      <p className="mt-10 fh-meta">
        Looking for another place?{" "}
        <Link href="/browse" className="underline">
          Browse all locations
        </Link>
        .
      </p>
    </Page>
  );
}
