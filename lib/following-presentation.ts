import { getFollowGraph, getFollowingFeed, listPublicLiveStreams } from "@/lib/data";
import type { DiscoveryPlace } from "@/lib/data/discovery";
import { applyFollowingShowcase } from "@/lib/discovery-showcase";
import { followGraphIsEmpty, liveMatchesFollows, type FollowingFeedItem } from "@/lib/follows";
import { isActiveLiveStatus, type LiveStreamSummary } from "@/lib/live";
import type { CoverageRequest, FirsthandReport } from "@/lib/types";

export type FollowingCityActivity = {
  city: string;
  country: string;
  href: string;
  liveCount: number;
  reportCount: number;
  requestCount: number;
  latitude: number | null;
  longitude: number | null;
};

export type FollowingPresentation = {
  usingShowcase: boolean;
  hasFollows: boolean;
  featuredLive: LiveStreamSummary | null;
  otherLives: LiveStreamSummary[];
  liveStreams: LiveStreamSummary[];
  latestReport: FirsthandReport | null;
  latestReports: FirsthandReport[];
  cities: FollowingCityActivity[];
  places: DiscoveryPlace[];
  feed: FollowingFeedItem[];
};

export async function getFollowingPresentation(userId: string): Promise<FollowingPresentation> {
  const [feed, graph, lives] = await Promise.all([
    getFollowingFeed(userId),
    getFollowGraph(userId),
    listPublicLiveStreams(),
  ]);
  const hasFollows = !followGraphIsEmpty(graph);
  const followedLives = lives.filter(
    (item) => isActiveLiveStatus(item.status) && liveMatchesFollows(item, graph),
  );
  const reports = feed.flatMap((item) => (item.report ? [item.report] : []));
  const requests = feed.flatMap((item) => (item.request ? [item.request] : []));
  const cities = aggregateFollowingCities(followedLives, reports, requests);
  const real: FollowingPresentation = {
    usingShowcase: false,
    hasFollows,
    featuredLive: followedLives[0] ?? null,
    otherLives: followedLives.slice(1, 6),
    liveStreams: followedLives,
    latestReport: reports[0] ?? null,
    latestReports: recentFollowedReports(reports),
    cities,
    places: citiesToPlaces(cities),
    feed,
  };

  const showcased = applyFollowingShowcase({
    hasFollows,
    feed,
    liveStreams: followedLives,
    reports,
    requests,
    places: real.places,
  });

  if (!showcased.usingShowcase) {
    return real;
  }

  const showcaseCities = aggregateFollowingCities(showcased.liveStreams, showcased.reports, showcased.requests);
  return {
    usingShowcase: true,
    hasFollows: false,
    featuredLive: showcased.liveStreams[0] ?? null,
    otherLives: showcased.liveStreams.slice(1, 6),
    liveStreams: showcased.liveStreams,
    latestReport: showcased.reports[0] ?? null,
    latestReports: recentFollowedReports(showcased.reports),
    cities: showcaseCities,
    places: citiesToPlaces(showcaseCities),
    feed: showcased.feed,
  };
}

function aggregateFollowingCities(
  lives: LiveStreamSummary[],
  reports: FirsthandReport[],
  requests: CoverageRequest[],
): FollowingCityActivity[] {
  const map = new Map<string, FollowingCityActivity>();
  function slot(city: string, country: string, href: string, lat: number | null, lng: number | null) {
    const key = `${city}|${country}`;
    const existing = map.get(key);
    if (existing) {
      return existing;
    }
    const created: FollowingCityActivity = {
      city,
      country,
      href,
      liveCount: 0,
      reportCount: 0,
      requestCount: 0,
      latitude: lat,
      longitude: lng,
    };
    map.set(key, created);
    return created;
  }
  for (const stream of lives) {
    const row = slot(
      stream.location.city,
      stream.location.country,
      stream.location.href,
      stream.location.latitude,
      stream.location.longitude,
    );
    row.liveCount += 1;
  }
  for (const report of reports) {
    if (!report.city || !report.country) {
      continue;
    }
    const row = slot(report.city, report.country, report.locationHref ?? "/browse", null, null);
    row.reportCount += 1;
  }
  for (const request of requests) {
    if (!request.city || !request.country) {
      continue;
    }
    const row = slot(request.city, request.country, request.locationHref ?? "/browse", request.latitude ?? null, request.longitude ?? null);
    row.requestCount += 1;
  }
  return [...map.values()].sort(
    (a, b) => b.liveCount - a.liveCount || b.reportCount - a.reportCount || b.requestCount - a.requestCount,
  );
}

function citiesToPlaces(cities: FollowingCityActivity[]): DiscoveryPlace[] {
  return cities
    .filter((city) => city.latitude != null && city.longitude != null)
    .map((city) => ({
      id: `${city.city}-${city.country}`,
      slug: city.href.replace("/city/", "") || city.city,
      place: null,
      city: city.city,
      country: city.country,
      latitude: city.latitude,
      longitude: city.longitude,
      label: `${city.city}, ${city.country}`,
      href: city.href,
      reportCount: city.reportCount,
      openRequestCount: city.requestCount,
      liveCount: city.liveCount,
    }));
}

function recentFollowedReports(reports: FirsthandReport[]) {
  const videos = reports.filter((item) => item.mediaKind === "video");
  const rest = reports.filter((item) => item.mediaKind !== "video");
  return [...videos, ...rest].slice(0, 6);
}
