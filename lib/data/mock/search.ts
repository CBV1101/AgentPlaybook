import { toCoverageRequest, toLocationSummary, toReport } from "@/lib/data/mappers";
import { summarizeEvents } from "@/lib/data/events";
import { buildGeographyIndex, searchGeographyHits } from "@/lib/data/geography";
import { foldSearchText } from "@/lib/geo";
import { mockLiveLocationIds } from "@/lib/data/mock/live-repository";
import { readMockDatabase } from "@/lib/data/mock/store";
import {
  emptySearchResults,
  lexicalMatchScore,
  limitSearchResults,
  rankEvents,
  rankPlaces,
  rankReporters,
  rankReports,
  rankRequests,
  searchSince,
  type SearchQuery,
  type SearchReporterHit,
  type SearchResults,
} from "@/lib/search";
import type { FirsthandReport } from "@/lib/types";

function isVisible(row: { removed_at?: string | null }) {
  return !row.removed_at;
}

function isPublicReport(row: { removed_at?: string | null; publish_status?: string | null }) {
  return isVisible(row) && (row.publish_status ?? "published") === "published";
}

function textHits(needle: string, parts: Array<string | null | undefined>) {
  return lexicalMatchScore(parts.filter(Boolean).join(" "), needle) > 0;
}

function withinSince(iso: string, since: string | null) {
  return !since || iso >= since;
}

export async function mockSearchFirsthand(
  query: SearchQuery,
  currentUserId?: string | null,
): Promise<SearchResults> {
  const needle = foldSearchText(query.q);
  if (!needle) {
    return emptySearchResults(query);
  }

  const database = readMockDatabase();
  const since = searchSince(query.timeRange);
  const want = (kind: SearchQuery["kind"]) => query.kind === "all" || query.kind === kind;

  const matchingLocationIds = new Set(
    database.locations
      .filter((location) =>
        textHits(needle, [location.place, location.city, location.country, location.slug]),
      )
      .map((location) => location.id),
  );

  const places = want("places") ? rankPlaces(mockGeographyHits(query.q), needle) : [];

  const events = want("events")
    ? rankEvents(
        summarizeEvents(
          (database.events ?? []).filter(
            (event) =>
              event.status !== "archived" &&
              withinSince(event.started_at, since) &&
              (textHits(needle, [event.title, event.description]) ||
                matchingLocationIds.has(event.location_id)),
          ),
          database.locations,
          database.reports,
          database.coverage_requests,
        ),
        needle,
      )
    : [];

  const reports = want("reports")
    ? rankReports(
        database.reports
          .filter(
            (item) =>
              isPublicReport(item) &&
              withinSince(item.captured_at, since) &&
              (textHits(needle, [item.title, item.description]) || matchingLocationIds.has(item.location_id)),
          )
          .map((item) => toReport(joinReport(database, item.id)!)),
        needle,
      )
    : [];

  const requests = want("requests")
    ? rankRequests(
        database.coverage_requests
          .filter(
            (item) =>
              item.status === "open" &&
              isVisible(item) &&
              (textHits(needle, [item.title, item.description]) || matchingLocationIds.has(item.location_id)),
          )
          .map((item) => toCoverageRequest(joinRequest(database, item.id)!, currentUserId)),
        needle,
      )
    : [];

  const reporters = want("reporters") ? rankReporters(mockSearchReporters(database, needle, matchingLocationIds, reports), needle) : [];

  return limitSearchResults({
    query,
    places,
    events,
    reports,
    requests,
    reporters,
  });
}

function mockSearchReporters(
  database: ReturnType<typeof readMockDatabase>,
  needle: string,
  matchingLocationIds: Set<string>,
  alreadyRankedReports: FirsthandReport[],
): SearchReporterHit[] {
  const publicReports = database.reports.filter(isPublicReport);
  const reportsByReporter = new Map<string, typeof publicReports>();
  for (const report of publicReports) {
    const list = reportsByReporter.get(report.created_by) ?? [];
    list.push(report);
    reportsByReporter.set(report.created_by, list);
  }

  const locationLabels = new Map(database.locations.map((item) => [item.id, toLocationSummary(item)]));
  const candidateIds = new Set<string>();

  for (const profile of database.profiles) {
    if (
      textHits(needle, [
        profile.display_name,
        profile.username,
        profile.bio,
        profile.home_city,
        profile.home_country,
      ])
    ) {
      candidateIds.add(profile.id);
    }
  }
  for (const report of publicReports) {
    if (matchingLocationIds.has(report.location_id)) {
      candidateIds.add(report.created_by);
    }
  }

  return [...candidateIds].flatMap((id) => {
    const profile = database.profiles.find((item) => item.id === id);
    if (!profile) {
      return [];
    }
    const reporterReports = reportsByReporter.get(id) ?? [];
    const placeIds = new Set(reporterReports.map((item) => item.location_id));
    const matchingPlaces = [...placeIds]
      .filter((locationId) => matchingLocationIds.has(locationId))
      .map((locationId) => locationLabels.get(locationId)?.city)
      .filter(Boolean);
    const uniqueCities = [...new Set(matchingPlaces)];
    const homeHits = textHits(needle, [profile.home_city, profile.home_country]);
    const context = uniqueCities.length
      ? `Reports from ${uniqueCities.slice(0, 2).join(", ")}`
      : homeHits && profile.home_city
        ? `Based in ${profile.home_city}`
        : reporterReports.length
          ? `${reporterReports.length} firsthand ${reporterReports.length === 1 ? "report" : "reports"}`
          : alreadyRankedReports.some((item) => item.reporterUsername === profile.username)
            ? "Reports matching this search"
            : "Reporter";
    return [
      {
        id: profile.id,
        username: profile.username,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        context,
        reportCount: reporterReports.length,
        placeCount: placeIds.size,
      },
    ];
  });
}

function mockGeographyHits(query: string) {
  const database = readMockDatabase();
  return searchGeographyHits(
    buildGeographyIndex({
      locations: database.locations.map(toLocationSummary),
      reports: database.reports.filter(isPublicReport).map((item) => ({ locationId: item.location_id })),
      openRequestLocationIds: database.coverage_requests
        .filter((item) => item.status === "open" && isVisible(item))
        .map((item) => item.location_id),
      liveLocationIds: mockLiveLocationIds(),
    }),
    query,
  );
}

function joinReport(database: ReturnType<typeof readMockDatabase>, reportId: string) {
  const report = database.reports.find((item) => item.id === reportId);
  if (!report) {
    return null;
  }
  const location = database.locations.find((item) => item.id === report.location_id) ?? null;
  const profile = database.profiles.find((item) => item.id === report.created_by) ?? null;
  const request = report.request_id
    ? database.coverage_requests.find((item) => item.id === report.request_id)
    : null;
  return {
    ...report,
    locations: location,
    profiles: profile
      ? { display_name: profile.display_name, username: profile.username, avatar_url: profile.avatar_url }
      : null,
    report_media: database.report_media.filter((item) => item.report_id === report.id),
    coverage_requests: request
      ? {
          title: request.title,
          request_interests: database.request_interests.filter((item) => item.request_id === request.id),
        }
      : null,
  };
}

function joinRequest(database: ReturnType<typeof readMockDatabase>, requestId: string) {
  const request = database.coverage_requests.find((item) => item.id === requestId);
  if (!request) {
    return null;
  }
  const location = database.locations.find((item) => item.id === request.location_id) ?? null;
  return {
    ...request,
    locations: location,
    request_interests: database.request_interests.filter((item) => item.request_id === request.id),
  };
}
