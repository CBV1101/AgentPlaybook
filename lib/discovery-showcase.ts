/**
 * Development-only presentation for Following, Coverage wanted, and Explore.
 * Same isolation rules as the homepage showcase: never in repositories, never
 * written to Supabase, dead in production via NODE_ENV.
 */

import type { DiscoveryPlace } from "@/lib/data/discovery";
import {
  getHomepageShowcaseContent,
  HOMEPAGE_SHOWCASE_ID_PREFIX,
  isHomepageShowcaseAllowed,
  type HomepagePresentation,
} from "@/lib/homepage-showcase";
import type { CoverageOpportunity } from "@/lib/coverage-opportunity";
import { cityHref, citySlug } from "@/lib/geo";
import type { CoverageRequest, FirsthandReport, LocationSummary } from "@/lib/types";
import type { LiveStreamSummary } from "@/lib/live";
import type { FollowingFeedItem } from "@/lib/follows";

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

export function applyWantedShowcase(input: {
  requests: CoverageRequest[];
  reports: FirsthandReport[];
  liveStreams: LiveStreamSummary[];
  places: DiscoveryPlace[];
}) {
  if (!isHomepageShowcaseAllowed()) {
    return { ...input, opportunities: [] as CoverageOpportunity[], usingShowcase: false };
  }
  const hasReal = input.requests.length > 0 || input.liveStreams.some((item) => item.status === "live");
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

export function applyExploreShowcase(input: {
  liveStreams: LiveStreamSummary[];
  requests: CoverageRequest[];
  reports: FirsthandReport[];
  places: DiscoveryPlace[];
}) {
  if (!isHomepageShowcaseAllowed()) {
    return { ...input, opportunities: [] as CoverageOpportunity[], usingShowcase: false };
  }
  const hasReal =
    input.liveStreams.some((item) => item.status === "live") ||
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

export function applyFollowingShowcase(input: {
  hasFollows: boolean;
  feed: FollowingFeedItem[];
  liveStreams: LiveStreamSummary[];
  reports: FirsthandReport[];
  requests: CoverageRequest[];
  places: DiscoveryPlace[];
}) {
  if (!isHomepageShowcaseAllowed() || input.hasFollows) {
    return { ...input, usingShowcase: false };
  }
  if (input.feed.length > 0 || input.liveStreams.length > 0) {
    return { ...input, usingShowcase: false };
  }
  const showcase = discoveryShowcaseContent();
  const feed: FollowingFeedItem[] = [
    ...showcase.reports.map((report) => ({
      id: `report:${report.id}`,
      occurredAt: report.publishedAt,
      reason: "Development showcase — not a follow you created",
      report,
    })),
    ...showcase.requests.slice(0, 4).map((request) => ({
      id: `request:${request.id}`,
      occurredAt: request.createdAt,
      reason: "Development showcase — not a follow you created",
      request,
    })),
  ].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  return {
    hasFollows: false,
    feed,
    liveStreams: showcase.liveStreams,
    reports: showcase.reports,
    requests: showcase.requests,
    places: showcase.places,
    usingShowcase: true,
  };
}
