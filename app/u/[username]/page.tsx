import Link from "next/link";
import { notFound } from "next/navigation";
import { InvestigationCard } from "@/components/investigation-card";
import { CompactRecentReportCard } from "@/components/compact-live-stream-card";
import { DiscoveryMap } from "@/components/discovery-map";
import { FollowButton } from "@/components/follow-button";
import { FootageRow } from "@/components/footage-row";
import { LiveCard } from "@/components/live-card";
import { ReportCard } from "@/components/report-card";
import { ReporterAvatar } from "@/components/reporter-avatar";
import { ReporterStatsHeader, reporterPlacesLabel } from "@/components/reporter-stats";
import { Badge, LiveBadge } from "@/components/ui/badge";
import { EmptyState, Page, Tabs, TabLink } from "@/components/ui/page";
import { getCurrentUser } from "@/lib/auth";
import { isFollowingReporter } from "@/lib/data";
import type { DiscoveryPlace } from "@/lib/data/discovery";
import { parseReporterProfileTab, type ReporterProfileTab } from "@/lib/data/reporter";
import { applyHomepageLiveReporterShowcase } from "@/lib/homepage-showcase";
import { applyShowcaseReporterProfile } from "@/lib/investigation-showcase";
import { cityHref, countryHref } from "@/lib/geo";
import { liveHref } from "@/lib/live";
import { reporterTopicLabels } from "@/lib/profile";
import { getProfileByUserId, getProfilePage } from "@/lib/queries";

type PublicProfilePageProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string; sort?: string }>;
};

export default async function PublicProfilePage({ params, searchParams }: PublicProfilePageProps) {
  const { username } = await params;
  const query = await searchParams;
  const loaded = await getProfilePage(username);
  const page = applyHomepageLiveReporterShowcase(
    username,
    applyShowcaseReporterProfile(username, loaded),
  );

  if (!page) {
    notFound();
  }

  const user = await getCurrentUser();
  const ownProfile = user ? await getProfileByUserId(user.id) : null;
  const isOwner = ownProfile?.id === page.profile.id;
  const followingReporter =
    user && !isOwner ? await isFollowingReporter(user.id, page.profile.id) : false;

  const recordedReports = page.latestReports.filter(
    (report) =>
      report.recordedLive && !page.pastLive.some((stream) => stream.reportId === report.id),
  );
  const showLive = page.liveNow.length > 0 || page.pastLive.length > 0 || recordedReports.length > 0;
  const showPlaces = page.placesCovered.length > 0;
  const showFootage = page.licensingReports.length > 0;
  const showInvestigations = page.investigations.length > 0;

  let tab = parseReporterProfileTab(query.tab);
  if (!query.tab && page.liveNow.length > 0) {
    tab = "live";
  } else if (!query.tab && showInvestigations) {
    tab = "investigations";
  }
  if (tab === "live" && !showLive) {
    tab = "reporting";
  }
  if (tab === "places" && !showPlaces) {
    tab = "reporting";
  }
  if (tab === "footage" && !showFootage) {
    tab = "reporting";
  }
  if (tab === "investigations" && !showInvestigations) {
    tab = "reporting";
  }

  const sortOldest = query.sort === "oldest";
  const reports = sortOldest ? [...page.latestReports].reverse() : page.latestReports;
  const livestreamCount = page.liveNow.length + page.pastLive.length;
  const liveNow = page.liveNow[0];
  const homeBits = [page.profile.home_city, page.profile.home_country].filter(Boolean);
  const topics = reporterTopicLabels(page.profile.topics);
  const profileHref = profileTabHref(page.profile.username, tab, sortOldest);

  const placeMap: DiscoveryPlace[] = page.placesCovered.map((place) => ({
    ...place.location,
    reportCount: place.reportCount,
    openRequestCount: 0,
    liveCount: page.liveNow.filter((stream) => stream.location.id === place.location.id).length,
  }));

  return (
    <Page>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        <ReporterAvatar
          name={page.profile.display_name}
          username={page.profile.username}
          avatarUrl={page.profile.avatar_url}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="fh-title">{page.profile.display_name}</h1>
              <p className="mt-1 fh-meta">@{page.profile.username}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {isOwner ? (
                <>
                  <Link href="/profile/investigations" className="fh-meta underline">
                    Investigations
                  </Link>
                  <Link href="/profile" className="fh-meta underline">
                    Edit profile
                  </Link>
                </>
              ) : (
                <FollowButton
                  kind="reporter"
                  reporterId={page.profile.id}
                  isAuthenticated={Boolean(user)}
                  following={followingReporter}
                  nextPath={profileHref}
                  followLabel="Follow"
                  followingLabel="Following"
                />
              )}
            </div>
          </div>

          {liveNow ? (
            <p className="mt-3 flex flex-wrap items-center gap-2">
              <LiveBadge />
              <span className="text-sm font-semibold text-ink">LIVE NOW</span>
              <Link href={liveHref(liveNow.id)} className="text-sm font-medium text-ink underline">
                {liveNow.title}
              </Link>
              <Link href={liveNow.location.href} className="fh-meta underline">
                {liveNow.location.label}
              </Link>
            </p>
          ) : null}

          {homeBits.length > 0 ? (
            <p className="mt-3 fh-meta">
              {page.profile.home_city && page.profile.home_country ? (
                <Link href={cityHref(page.profile.home_city, page.profile.home_country)} className="hover:underline">
                  {page.profile.home_city}
                </Link>
              ) : page.profile.home_city ? (
                page.profile.home_city
              ) : null}
              {page.profile.home_city && page.profile.home_country ? ", " : null}
              {page.profile.home_country ? (
                <Link href={countryHref(page.profile.home_country)} className="hover:underline">
                  {page.profile.home_country}
                </Link>
              ) : null}
            </p>
          ) : null}

          {page.profile.bio ? <p className="mt-3 max-w-2xl fh-body">{page.profile.bio}</p> : null}

          {topics.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {topics.map((label) => (
                <li key={label}>
                  <Badge>{label}</Badge>
                </li>
              ))}
            </ul>
          ) : null}

          <ReporterStatsHeader stats={page.stats} livestreamCount={livestreamCount} />
        </div>
      </header>

      <Tabs className="mt-8">
        {showInvestigations ? (
          <TabLink href={profileTabHref(page.profile.username, "investigations", sortOldest)} active={tab === "investigations"}>
            Investigations
          </TabLink>
        ) : null}
        <TabLink href={profileTabHref(page.profile.username, "reporting", sortOldest)} active={tab === "reporting"}>
          Reports
        </TabLink>
        {showLive ? (
          <TabLink href={profileTabHref(page.profile.username, "live", sortOldest)} active={tab === "live"}>
            Live
          </TabLink>
        ) : null}
        {showPlaces ? (
          <TabLink href={profileTabHref(page.profile.username, "places", sortOldest)} active={tab === "places"}>
            Places
          </TabLink>
        ) : null}
        {showFootage ? (
          <TabLink href={profileTabHref(page.profile.username, "footage", sortOldest)} active={tab === "footage"}>
            Footage
          </TabLink>
        ) : null}
      </Tabs>

      {tab === "investigations" && showInvestigations ? (
        <section className="mt-6">
          <div className="fh-grid">
            {page.investigations.map((item) => (
              <InvestigationCard key={item.id} investigation={item} />
            ))}
          </div>
        </section>
      ) : null}

      {tab === "reporting" ? (
        <section className="mt-6">
          {page.latestReports.length === 0 ? (
            <EmptyState title="This reporter has not published a firsthand report yet." />
          ) : (
            <>
              <p className="fh-meta">
                <Link
                  href={profileTabHref(page.profile.username, "reporting", false)}
                  className={sortOldest ? "underline" : "font-medium text-ink"}
                >
                  Latest
                </Link>
                <span className="px-2 text-faint">·</span>
                <Link
                  href={profileTabHref(page.profile.username, "reporting", true)}
                  className={sortOldest ? "font-medium text-ink" : "underline"}
                >
                  Oldest
                </Link>
              </p>
              <div className="fh-live-grid mt-4">
                {reports.map((report) => (
                  <CompactRecentReportCard key={report.id} report={report} />
                ))}
              </div>
            </>
          )}
        </section>
      ) : null}

      {tab === "live" && showLive ? (
        <section className="mt-6 space-y-8">
          {page.liveNow.length > 0 ? (
            <div>
              <h2 className="fh-section">Live now</h2>
              <div className="fh-grid">
                {page.liveNow.map((stream) => (
                  <LiveCard key={stream.id} stream={stream} featured viewerSurface="profile" />
                ))}
              </div>
            </div>
          ) : null}
          {page.pastLive.length > 0 || recordedReports.length > 0 ? (
            <div>
              <h2 className="fh-section">Recorded livestreams</h2>
              {page.pastLive.length > 0 ? (
                <div className="fh-grid">
                  {page.pastLive.map((stream) => (
                    <LiveCard key={stream.id} stream={stream} />
                  ))}
                </div>
              ) : null}
              {recordedReports.length > 0 ? (
                <div className="fh-grid">
                  {recordedReports.map((report) => (
                    <ReportCard key={report.id} report={report} />
                  ))}
                </div>
              ) : null}
            </div>
          ) : page.liveNow.length === 0 ? (
            <EmptyState title="No livestreams from this reporter yet." />
          ) : null}
        </section>
      ) : null}

      {tab === "places" && showPlaces ? (
        <section className="mt-6">
          <p className="fh-meta">Places this reporter has published firsthand reports from.</p>
          <div className="mt-4">
            <DiscoveryMap
              places={placeMap}
              compact
              caption="Reporting locations from published firsthand reports. Home address is not shown."
            />
          </div>
          <ul className="mt-5">
            {page.placesCovered.map((place) => (
              <li key={place.location.id} className="fh-list-row">
                <Link href={place.location.href} className="block">
                  <p className="font-medium text-ink">{place.location.place || place.location.city}</p>
                  <p className="mt-1 fh-meta">
                    {place.location.city}, {place.location.country}
                  </p>
                  <p className="mt-1 fh-meta">{reporterPlacesLabel(place.reportCount)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tab === "footage" && showFootage ? (
        <section className="mt-6">
          <h2 className="fh-section">Available footage</h2>
          <p className="mt-2 max-w-2xl fh-meta">
            Original media this creator has marked as available for licensing. An inquiry does not
            grant permission to use the media.
          </p>
          <div className="mt-4">
            {page.licensingReports.map((report) => (
              <FootageRow key={report.id} report={report} />
            ))}
          </div>
        </section>
      ) : null}
    </Page>
  );
}

function profileTabHref(username: string, tab: ReporterProfileTab, oldest: boolean) {
  const params = new URLSearchParams();
  if (tab !== "investigations" && tab !== "reporting") {
    params.set("tab", tab);
  } else if (tab === "reporting") {
    params.set("tab", "reporting");
  } else if (tab === "investigations") {
    params.set("tab", "investigations");
  }
  if (oldest) {
    params.set("sort", "oldest");
  }
  const query = params.toString();
  return query ? `/u/${username}?${query}` : `/u/${username}`;
}
