import { isCountryHubLocation } from "@/lib/geo";
import type { CoverageRequest, FirsthandReport, LocationSummary } from "@/lib/types";

export const REPORTER_FOLLOW_REASON = "From a reporter you follow";
export const REPORTER_FOLLOW_SCORE = 4;

export type GeoFollowKind = "country" | "city" | "place";

export type GeoFollowTarget = {
  kind: GeoFollowKind;
  label: string;
  country: string;
  city?: string;
  locationId?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type FollowGraph = {
  reporterIds: string[];
  locations: LocationSummary[];
};

export function followGraphIsEmpty(graph: FollowGraph) {
  return graph.reporterIds.length === 0 && graph.locations.length === 0;
}

export type FollowingFeedItem = {
  id: string;
  occurredAt: string;
  reason: string;
  report?: FirsthandReport;
  request?: CoverageRequest;
};

/**
 * Follow rows are the source for later notifications such as:
 * - "27 people want coverage near you."
 * - "New firsthand report from Berlin."
 * - "Maria published a new report."
 * This module does not send email, SMS, or push.
 */
export function locationFollowMatch(
  followed: LocationSummary,
  candidate: LocationSummary,
): { score: number; reason: string } | null {
  if (isCountryHubLocation(followed)) {
    if (candidate.country !== followed.country) {
      return null;
    }
    return { score: 1, reason: `From ${followed.country}, which you follow` };
  }
  if (followed.place) {
    if (candidate.id !== followed.id) {
      return null;
    }
    return { score: 3, reason: `From ${followed.place}, which you follow` };
  }
  if (candidate.city !== followed.city || candidate.country !== followed.country) {
    return null;
  }
  return { score: 2, reason: `From ${followed.city}, which you follow` };
}

export function bestFollowReason(options: Array<{ score: number; reason: string }>) {
  return [...options].sort((a, b) => b.score - a.score)[0]?.reason ?? null;
}

export function assembleFollowingFeed(input: {
  followedReporterIds: Set<string>;
  followedLocations: LocationSummary[];
  reports: Array<{
    report: FirsthandReport;
    createdBy: string;
    location: LocationSummary;
  }>;
  requests: Array<{
    request: CoverageRequest;
    location: LocationSummary;
  }>;
}): FollowingFeedItem[] {
  const items: FollowingFeedItem[] = [];

  for (const row of input.reports) {
    const reasons: Array<{ score: number; reason: string }> = [];
    if (input.followedReporterIds.has(row.createdBy)) {
      reasons.push({ score: REPORTER_FOLLOW_SCORE, reason: REPORTER_FOLLOW_REASON });
    }
    for (const followed of input.followedLocations) {
      const match = locationFollowMatch(followed, row.location);
      if (match) {
        reasons.push(match);
      }
    }
    const reason = bestFollowReason(reasons);
    if (!reason) {
      continue;
    }
    items.push({
      id: `report:${row.report.id}`,
      occurredAt: row.report.publishedAt,
      reason,
      report: row.report,
    });
  }

  for (const row of input.requests) {
    const reasons = input.followedLocations
      .map((followed) => locationFollowMatch(followed, row.location))
      .filter((item): item is { score: number; reason: string } => Boolean(item));
    const reason = bestFollowReason(reasons);
    if (!reason) {
      continue;
    }
    items.push({
      id: `request:${row.request.id}`,
      occurredAt: row.request.createdAt,
      reason,
      request: row.request,
    });
  }

  return items.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export function liveMatchesFollows(
  stream: { reporterId: string; location: LocationSummary; eventId?: string | null },
  graph: FollowGraph,
) {
  if (graph.reporterIds.includes(stream.reporterId)) {
    return true;
  }
  return graph.locations.some((followed) => Boolean(locationFollowMatch(followed, stream.location)));
}
