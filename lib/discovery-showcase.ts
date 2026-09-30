/**
 * Development-only presentation for Following, Coverage wanted, and Explore.
 * Same isolation rules as the homepage showcase: never in repositories, never
 * written to Supabase, dead in production via NODE_ENV.
 */

import type { DiscoveryPlace } from "@/lib/data/discovery";
import type { DataSourceEnv } from "@/lib/data/mode";
import {
  getHomepageShowcaseContent,
  HOMEPAGE_SHOWCASE_ID_PREFIX,
  isHomepageShowcaseAllowed,
  type HomepagePresentation,
} from "@/lib/homepage-showcase";
import type { CoverageOpportunity } from "@/lib/coverage-opportunity";
import { cityHref, citySlug } from "@/lib/geo";
import type { CoverageRequest, FirsthandReport, LocationSummary } from "@/lib/types";
import { isPubliclyLive, type LiveStreamSummary } from "@/lib/live";
import { assembleYourWorldFeed, type YourWorldItem } from "@/lib/your-world";
import { showcaseInvestigationPage } from "@/lib/investigation-showcase";
import { liveMatchesFollows, type FollowGraph } from "@/lib/follows";

export { HOMEPAGE_SHOWCASE_ID_PREFIX, isHomepageShowcaseAllowed as isDiscoveryShowcaseAllowed };

export function isDiscoveryShowcaseId(id: string) {
  return id.startsWith(HOMEPAGE_SHOWCASE_ID_PREFIX);
}

export function discoveryShowcaseContent(): HomepagePresentation {
  return { ...getHomepageShowcaseContent(), usingShowcase: true };
}

export function showcaseCoverageOpportunities(): CoverageOpportunity[] {
  const now = Date.now();
  return [
    signal(
      "ceuta",
      "Ceuta",
      "Spain",
      35.8894,
      -5.3213,
      "Migration activity near the border",
      "Large movement has been described near the border. That is an external signal — not a Firsthand report.",
      "migration",
      "high",
      42,
      3,
      now,
      20,
    ),
    signal(
      "sendai",
      "Sendai",
      "Japan",
      38.2682,
      140.8694,
      "Tsunami warning — coastline views requested",
      "People are asking for firsthand views from the coastline. A warning is not a Firsthand verification.",
      "tsunami_warning",
      "high",
      118,
      0,
      now,
      8,
    ),
    signal(
      "valencia",
      "Valencia",
      "Spain",
      39.4699,
      -0.3763,
      "Flooding reports — coverage needed",
      "External sources describe flooding. Firsthand will have a report only when someone publishes from there.",
      "flooding",
      "elevated",
      64,
      1,
      now,
      35,
    ),
    signal(
      "portland",
      "Portland",
      "United States",
      45.5152,
      -122.6784,
      "Protest activity downtown",
      "A public gathering has been described downtown. Demand here is a request to look, not a conclusion.",
      "protest",
      "elevated",
      29,
      2,
      now,
      50,
    ),
  ];
}

function signal(
  key: string,
  city: string,
  country: string,
  latitude: number,
  longitude: number,
  title: string,
  summary: string,
  eventType: string,
  urgency: CoverageOpportunity["urgency"],
  interestedCount: number,
  reporterCount: number,
  now: number,
  minutesAgo: number,
): CoverageOpportunity {
  const slug = citySlug(city, country);
  const location: LocationSummary = {
    id: `${HOMEPAGE_SHOWCASE_ID_PREFIX}opp-loc-${key}`,
    slug,
    place: null,
    city,
    country,
    latitude,
    longitude,
    label: `${city}, ${country}`,
    href: cityHref(city, country),
  };
  return {
    id: `${HOMEPAGE_SHOWCASE_ID_PREFIX}opp-${key}`,
    title,
    summary,
    location,
    eventType,
    urgency,
    sourceType: "event_signal",
    occurredAt: new Date(now - minutesAgo * 60_000).toISOString(),
    requestCount: 1,
    interestedCount,
    reporterCount,
    activeStreamCount: 0,
    relatedReporterIds: [],
    relatedRequestIds: [],
    externalReference: `signal:${key}`,
  };
}

export function applyWantedShowcase(
  input: {
    requests: CoverageRequest[];
    reports: FirsthandReport[];
    liveStreams: LiveStreamSummary[];
    places: DiscoveryPlace[];
  },
  env: DataSourceEnv = process.env,
) {
  if (!isHomepageShowcaseAllowed(env)) {
    return { ...input, opportunities: [] as CoverageOpportunity[], usingShowcase: false };
  }
  const hasReal = input.requests.length > 0 || input.liveStreams.some((item) => isPubliclyLive(item));
  if (hasReal) {
    return { ...input, opportunities: [] as CoverageOpportunity[], usingShowcase: false };
  }
  const showcase = discoveryShowcaseContent();
  return {
    requests: showcase.requests,
    reports: showcase.reports,
    liveStreams: showcase.liveStreams,
    places: showcase.places,
    opportunities: showcaseCoverageOpportunities(),
    usingShowcase: true,
  };
}

export function applyExploreShowcase(
  input: {
    liveStreams: LiveStreamSummary[];
    requests: CoverageRequest[];
    reports: FirsthandReport[];
    places: DiscoveryPlace[];
  },
  env: DataSourceEnv = process.env,
) {
  if (!isHomepageShowcaseAllowed(env)) {
    return { ...input, opportunities: [] as CoverageOpportunity[], usingShowcase: false };
  }
  const hasReal =
    input.liveStreams.some((item) => isPubliclyLive(item)) ||
    input.requests.length > 0 ||
    input.reports.length > 0;
  if (hasReal) {
    return { ...input, opportunities: [] as CoverageOpportunity[], usingShowcase: false };
  }
  const showcase = discoveryShowcaseContent();
  return {
    liveStreams: showcase.liveStreams,
    requests: showcase.requests,
    reports: showcase.reports,
    places: showcase.places,
    opportunities: showcaseCoverageOpportunities(),
    usingShowcase: true,
  };
}

export function applyFollowingShowcase(
  input: {
    hasFollows: boolean;
    feed: YourWorldItem[];
    liveStreams: LiveStreamSummary[];
    reports: FirsthandReport[];
    before?: string | null;
  },
  env: DataSourceEnv = process.env,
) {
  if (!isHomepageShowcaseAllowed(env) || input.hasFollows) {
    return { ...input, hasMore: false, usingShowcase: false };
  }
  if (input.feed.length > 0 || input.liveStreams.length > 0) {
    return { ...input, hasMore: false, usingShowcase: false };
  }
  const showcase = discoveryShowcaseContent();
  const berlin = showcase.places.find((item) => item.city === "Berlin");
  const berlinLocation: LocationSummary = berlin
    ? { ...berlin, place: berlin.place ?? null }
    : {
        id: `${HOMEPAGE_SHOWCASE_ID_PREFIX}loc-berlin`,
        slug: "berlin-germany",
        place: null,
        city: "Berlin",
        country: "Germany",
        latitude: 52.52,
        longitude: 13.405,
        label: "Berlin, Germany",
        href: cityHref("Berlin", "Germany"),
      };
  const now = Date.now();
  const berlinReports: FirsthandReport[] = [
    showcase.reports.find((item) => item.city === "Berlin") ??
      showcase.reports[0]!,
    {
      ...(showcase.reports.find((item) => item.city === "Berlin") ?? showcase.reports[0]!),
      id: `${HOMEPAGE_SHOWCASE_ID_PREFIX}report-berlin-2`,
      title: "Evening crowd at Alexanderplatz",
      publishedAt: new Date(now - 28 * 60_000).toISOString(),
      capturedAt: new Date(now - 30 * 60_000).toISOString(),
      thumbnailUrl: "https://picsum.photos/seed/berlin-2/1200/800",
      mediaUrl: showcase.reports[0]?.mediaUrl ?? null,
      mediaKind: "video",
    },
    {
      ...(showcase.reports.find((item) => item.city === "Berlin") ?? showcase.reports[0]!),
      id: `${HOMEPAGE_SHOWCASE_ID_PREFIX}report-berlin-3`,
      title: "Bike lane after the demonstration",
      publishedAt: new Date(now - 46 * 60_000).toISOString(),
      capturedAt: new Date(now - 50 * 60_000).toISOString(),
      thumbnailUrl: "https://picsum.photos/seed/berlin-3/1200/800",
      mediaUrl: showcase.reports[0]?.mediaUrl ?? null,
      mediaKind: "video",
    },
  ];
  const investigation = showcaseInvestigationPage();
  const reporterId = investigation.investigation.reporterId;
  const partSix = investigation.parts.find((part) => part.position === 6)?.report;
  const partSeven = investigation.parts.find((part) => part.position === 7)?.report;
  const partEight = investigation.parts.find((part) => part.position === 8)?.report;
  const followGraph: FollowGraph = {
    reporterIds: [reporterId],
    locations: [berlinLocation],
    investigationIds: [investigation.investigation.id],
    investigationLiveStreamIds: investigation.parts.flatMap((part) =>
      part.liveStream ? [part.liveStream.id] : [],
    ),
    investigationReportIds: investigation.parts.flatMap((part) => (part.report ? [part.report.id] : [])),
  };
  const liveStreams = [...showcase.liveStreams, ...investigation.parts.flatMap((part) => (part.liveStream ? [part.liveStream] : []))]
    .filter((item, index, all) => all.findIndex((row) => row.id === item.id) === index)
    .filter((item) => isPubliclyLive(item) && liveMatchesFollows(item, followGraph));
  const liveReportIds = new Set(liveStreams.flatMap((item) => (item.reportId ? [item.reportId] : [])));
  const reporterReport: FirsthandReport = {
    ...(showcase.reports.find((item) => item.city === "New York") ?? showcase.reports[0]!),
    id: `${HOMEPAGE_SHOWCASE_ID_PREFIX}report-amorgan-midtown`,
    title: "Reporting from Midtown Manhattan",
    excerpt: "Crossing at a Midtown intersection in late afternoon light.",
    city: "New York",
    country: "United States",
    location: "New York, United States",
    reporterName: investigation.investigation.reporterName,
    reporterUsername: "amorgan",
    publishedAt: new Date(now - 52 * 60_000).toISOString(),
    capturedAt: new Date(now - 52 * 60_000).toISOString(),
    mediaKind: "video",
    mediaUrl: showcase.reports[0]?.mediaUrl ?? null,
    thumbnailUrl: "https://picsum.photos/seed/midtown-follow/1200/800",
    locationHref: cityHref("New York", "United States"),
  };
  const rows = [
    ...berlinReports.map((report) => ({
      report,
      createdBy: `${HOMEPAGE_SHOWCASE_ID_PREFIX}user-jonas-w`,
      location: berlinLocation,
      investigation: null,
    })),
    {
      report: reporterReport,
      createdBy: reporterId,
      location: {
        id: `${HOMEPAGE_SHOWCASE_ID_PREFIX}loc-new-york`,
        slug: "new-york-united-states",
        place: null,
        city: "New York",
        country: "United States",
        latitude: 40.7128,
        longitude: -74.006,
        label: "New York, United States",
        href: cityHref("New York", "United States"),
      },
      investigation: null,
    },
    ...(partSeven
      ? [
          {
            report: {
              ...partSeven,
              publishedAt: new Date(now - 18 * 60_000).toISOString(),
              capturedAt: new Date(now - 18 * 60_000).toISOString(),
              excerpt: "Visited another location connected to the public records trail.",
              mediaUrl: partSeven.mediaUrl ?? partSeven.thumbnailUrl ?? null,
            },
            createdBy: reporterId,
            location: {
              id: `${HOMEPAGE_SHOWCASE_ID_PREFIX}loc-mankato`,
              slug: "mankato-united-states",
              place: null,
              city: "Mankato",
              country: "United States",
              latitude: 44.1636,
              longitude: -93.9994,
              label: "Mankato, United States",
              href: cityHref("Mankato", "United States"),
            },
            investigation: {
              investigationId: investigation.investigation.id,
              title: investigation.investigation.title,
              href: investigation.investigation.href,
              position: 7,
            },
          },
        ]
      : []),
    ...(partEight
      ? [
          {
            report: {
              ...partEight,
              id: `${HOMEPAGE_SHOWCASE_ID_PREFIX}report-part8-berlin`,
              city: "Berlin",
              country: "Germany",
              location: "Berlin, Germany",
              publishedAt: new Date(now - 8 * 60 * 60_000).toISOString(),
              capturedAt: new Date(now - 8 * 60 * 60_000).toISOString(),
              excerpt: "Neighborhood follow-up from Berlin, filed as the next investigation part.",
              locationHref: cityHref("Berlin", "Germany"),
            },
            createdBy: reporterId,
            location: berlinLocation,
            investigation: {
              investigationId: investigation.investigation.id,
              title: investigation.investigation.title,
              href: investigation.investigation.href,
              position: 8,
            },
          },
        ]
      : []),
    ...(partSix
      ? [
          {
            report: {
              ...partSix,
              publishedAt: new Date(now - 20 * 60 * 60_000).toISOString(),
              capturedAt: new Date(now - 20 * 60 * 60_000).toISOString(),
            },
            createdBy: reporterId,
            location: {
              id: `${HOMEPAGE_SHOWCASE_ID_PREFIX}loc-mankato-older`,
              slug: "mankato-united-states",
              place: null,
              city: "Mankato",
              country: "United States",
              latitude: 44.1636,
              longitude: -93.9994,
              label: "Mankato, United States",
              href: cityHref("Mankato", "United States"),
            },
            investigation: {
              investigationId: investigation.investigation.id,
              title: investigation.investigation.title,
              href: investigation.investigation.href,
              position: 6,
            },
          },
        ]
      : []),
  ];
  const world = assembleYourWorldFeed({
    followedReporterIds: new Set([reporterId]),
    followedLocations: [berlinLocation],
    followedInvestigationIds: new Set([investigation.investigation.id]),
    rows,
    before: input.before,
    excludeReportIds: liveReportIds,
  });
  return {
    hasFollows: false,
    feed: world.items,
    liveStreams,
    reports: [
      ...berlinReports,
      reporterReport,
      ...(partSeven ? [partSeven] : []),
      ...(partEight ? [partEight] : []),
      ...(partSix ? [partSix] : []),
    ],
    hasMore: world.hasMore,
    usingShowcase: true,
  };
}
