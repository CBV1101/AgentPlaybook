import { getFollowGraph, getFollowingFeed, listPublicLiveStreams } from "@/lib/data";
import type { DiscoveryPlace } from "@/lib/data/discovery";
import { applyFollowingShowcase } from "@/lib/discovery-showcase";
import { followGraphIsEmpty, liveMatchesFollows } from "@/lib/follows";
import { isPubliclyLive, type LiveStreamSummary } from "@/lib/live";
import type { CoverageRequest, FirsthandReport } from "@/lib/types";
import type { YourWorldItem } from "@/lib/your-world";

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
  liveStreams: LiveStreamSummary[];
  cities: FollowingCityActivity[];
  places: DiscoveryPlace[];
  feed: YourWorldItem[];
  hasMore: boolean;
};

export async function getFollowingPresentation(
  userId: string,
  before?: string | null,
): Promise<FollowingPresentation> {
  const [graph, lives] = await Promise.all([getFollowGraph(userId), listPublicLiveStreams()]);
  const hasFollows = !followGraphIsEmpty(graph);
  const followedLives = lives.filter(
    (item) => isPubliclyLive(item) && liveMatchesFollows(item, graph),
  );
  const liveReportIds = followedLives.flatMap((item) => (item.reportId ? [item.reportId] : []));
  const world = await getFollowingFeed(userId, before, liveReportIds);
  const reports = world.items.flatMap((item) =>
    item.kind === "place-group" ? item.reports : item.report ? [item.report] : [],
  );

  const real: FollowingPresentation = {
    usingShowcase: false,
    hasFollows,
    liveStreams: followedLives,
    cities: aggregateFollowingCities(followedLives, reports, []),
    places: [],
    feed: world.items,
    hasMore: world.hasMore,
  };
  real.places = citiesToPlaces(real.cities);

  const showcased = applyFollowingShowcase({
    hasFollows,
    feed: world.items,
    liveStreams: followedLives,
    reports,
    before,
  });

  if (!showcased.usingShowcase) {
    return real;
  }

  const showcaseCities = aggregateFollowingCities(showcased.liveStreams, showcased.reports, []);
  return {
    usingShowcase: true,
    hasFollows: false,
    liveStreams: showcased.liveStreams,
    cities: showcaseCities,
    places: citiesToPlaces(showcaseCities),
    feed: showcased.feed,
    hasMore: showcased.hasMore,
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
