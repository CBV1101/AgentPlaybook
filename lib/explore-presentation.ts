import { getBrowseOverview, getHomeFeed, listOpenCoverageWanted } from "@/lib/queries";
import { applyExploreShowcase, applyWantedShowcase } from "@/lib/discovery-showcase";
import {
  opportunityFromRequest,
  rankHotOpportunities,
  reportersInArea,
  type CoverageOpportunity,
  type GlobeActivityMarker,
} from "@/lib/coverage-opportunity";
import { isPubliclyLive, liveHref, reporterProfileHref } from "@/lib/live";
import { haversineKm } from "@/lib/live-for-location";

export async function getWantedPresentation(userId?: string | null) {
  const [requests, feed] = await Promise.all([listOpenCoverageWanted(userId), getHomeFeed()]);
  const showcased = applyWantedShowcase({
    requests,
    reports: feed.reports,
    liveStreams: feed.liveStreams,
    places: feed.places,
  });
  const fromRequests = showcased.requests.map((request) => {
    const reporters = reportersInArea(
      request.city ?? "",
      request.country ?? "",
      showcased.reports,
      showcased.liveStreams,
    );
    return opportunityFromRequest(request, {
      reporterCount: reporters.length,
      activeStreamCount: showcased.liveStreams.filter(
        (item) =>
          isPubliclyLive(item) &&
          item.location.city === request.city &&
          item.location.country === request.country,
      ).length,
      relatedReporterIds: reporters.map((item) => item.id),
    });
  });
  const opportunities = rankHotOpportunities([
    ...showcased.opportunities,
    ...fromRequests,
  ]);
  return {
    usingShowcase: showcased.usingShowcase,
    requests: showcased.requests,
    reports: showcased.reports,
    liveStreams: showcased.liveStreams,
    places: showcased.places,
    opportunities,
  };
}

export async function getExplorePresentation(userId?: string | null) {
  const [feed, overview, requests] = await Promise.all([
    getHomeFeed(),
    getBrowseOverview(),
    listOpenCoverageWanted(userId),
  ]);
  const showcased = applyExploreShowcase({
    liveStreams: feed.liveStreams,
    requests,
    reports: feed.reports,
    places: feed.places.length ? feed.places : overview.places.map((place) => ({ ...place, liveCount: 0, reportCount: 0, openRequestCount: 0 })),
  });
  const places = showcased.places.length
    ? showcased.places
    : overview.cities.map((city) => ({
        id: city.slug,
        slug: city.slug,
        place: null as string | null,
        city: city.name,
        country: city.country,
        latitude: city.latitude,
        longitude: city.longitude,
        label: `${city.name}, ${city.country}`,
        href: city.href,
        reportCount: city.reportCount,
        openRequestCount: city.openRequestCount,
        liveCount: city.liveCount,
      }));

  const fromRequests = showcased.requests.map((request) => opportunityFromRequest(request));
  const opportunities = rankHotOpportunities([...showcased.opportunities, ...fromRequests]);
  const markers = buildGlobeMarkers({
    liveStreams: showcased.liveStreams,
    requests: showcased.requests,
    reports: showcased.reports,
    places,
    opportunities,
  });

  return {
    usingShowcase: showcased.usingShowcase,
    liveStreams: showcased.liveStreams.filter((item) => isPubliclyLive(item)),
    endedOrRecorded: showcased.reports,
    requests: showcased.requests,
    reports: showcased.reports,
    places,
    cities: overview.cities,
    opportunities,
    markers,
  };
}

function buildGlobeMarkers(input: {
  liveStreams: import("@/lib/live").LiveStreamSummary[];
  requests: import("@/lib/types").CoverageRequest[];
  reports: import("@/lib/types").FirsthandReport[];
  places: import("@/lib/data/discovery").DiscoveryPlace[];
  opportunities: CoverageOpportunity[];
}): GlobeActivityMarker[] {
  const markers: GlobeActivityMarker[] = [];
  const liveUsed = new Set<string>();
  const liveStreams = input.liveStreams.filter(
    (stream) => isPubliclyLive(stream) && stream.location.latitude != null && stream.location.longitude != null,
  );
  for (const stream of liveStreams) {
    if (liveUsed.has(stream.id)) {
      continue;
    }
    const cluster = liveStreams.filter((candidate) => {
      if (liveUsed.has(candidate.id)) {
        return false;
      }
      return (
        haversineKm(
          { latitude: stream.location.latitude as number, longitude: stream.location.longitude as number },
          { latitude: candidate.location.latitude as number, longitude: candidate.location.longitude as number },
        ) <= 1.5
      );
    });
    for (const member of cluster) {
      liveUsed.add(member.id);
    }
    markers.push({
      id: `live-place:${stream.location.city}|${stream.location.country}|${stream.id}`,
      kind: "live",
      latitude: stream.location.latitude as number,
      longitude: stream.location.longitude as number,
      city: stream.location.city,
      country: stream.location.country,
      title: stream.title,
      href: reporterProfileHref(stream.reporterUsername) ?? liveHref(stream.id),
      subtitle: "LIVE",
      reporterName: stream.reporterName,
    });
  }
  for (const request of input.requests) {
    if (request.latitude == null || request.longitude == null) {
      continue;
    }
    markers.push({
      id: `wanted:${request.id}`,
      kind: "wanted",
      latitude: request.latitude,
      longitude: request.longitude,
      city: request.city ?? request.location,
      country: request.country ?? "",
      title: request.title,
      href: `/requests/${request.id}`,
      subtitle: "COVERAGE WANTED",
      interestedCount: request.supporterCount,
    });
  }
  for (const opportunity of input.opportunities) {
    if (opportunity.sourceType !== "event_signal") {
      continue;
    }
    if (opportunity.location.latitude == null || opportunity.location.longitude == null) {
      continue;
    }
    markers.push({
      id: `opp:${opportunity.id}`,
      kind: "wanted",
      latitude: opportunity.location.latitude,
      longitude: opportunity.location.longitude,
      city: opportunity.location.city,
      country: opportunity.location.country,
      title: opportunity.title,
      href: opportunity.location.href,
      subtitle: "COVERAGE WANTED",
      interestedCount: opportunity.interestedCount,
    });
  }
  for (const report of input.reports) {
    const place = input.places.find((item) => item.city === report.city && item.country === report.country);
    if (!place || place.latitude == null || place.longitude == null || !report.city || !report.country) {
      continue;
    }
    if (markers.some((item) => item.city === report.city && item.country === report.country && item.kind === "live")) {
      continue;
    }
    markers.push({
      id: `report:${report.id}`,
      kind: "report",
      latitude: place.latitude,
      longitude: place.longitude,
      city: report.city,
      country: report.country,
      title: report.title,
      href: report.id.startsWith("dev-showcase-") ? report.locationHref ?? "/browse" : `/reports/${report.id}`,
      subtitle: "RECENT REPORT",
      reporterName: report.reporterName,
    });
  }
  return markers;
}
