import type { FirsthandReport, LocationSummary } from "@/lib/types";
import { locationFollowMatch } from "@/lib/follows";

export const YOUR_WORLD_PAGE_SIZE = 12;
const PLACE_GROUP_MIN = 3;
const PLACE_GROUP_WINDOW_MS = 6 * 60 * 60 * 1000;

export type InvestigationFeedContext = {
  investigationId: string;
  title: string;
  href: string;
  position: number;
};

export type YourWorldReportRow = {
  report: FirsthandReport;
  createdBy: string;
  location: LocationSummary;
  investigation: InvestigationFeedContext | null;
};

export type YourWorldItem =
  | {
      kind: "report";
      id: string;
      occurredAt: string;
      reason: string;
      report: FirsthandReport;
    }
  | {
      kind: "investigation";
      id: string;
      occurredAt: string;
      reason: string;
      report: FirsthandReport;
      investigationTitle: string;
      investigationHref: string;
      position: number;
    }
  | {
      kind: "place-group";
      id: string;
      occurredAt: string;
      reason: string;
      city: string;
      country: string;
      locationHref: string;
      reports: FirsthandReport[];
    };

function createdByFor(rows: YourWorldReportRow[], reportId: string) {
  return rows.find((row) => row.report.id === reportId)?.createdBy ?? "";
}

function bestReason(reasons: Array<{ score: number; reason: string }>) {
  return [...reasons].sort((a, b) => b.score - a.score)[0]?.reason ?? "Reporter you follow";
}

export function assembleYourWorldFeed(input: {
  followedReporterIds: Set<string>;
  followedLocations: LocationSummary[];
  followedInvestigationIds: Set<string>;
  rows: YourWorldReportRow[];
  before?: string | null;
  limit?: number;
  excludeReportIds?: Set<string>;
}): { items: YourWorldItem[]; hasMore: boolean } {
  const excluded = input.excludeReportIds ?? new Set<string>();
  const eligible: Array<{
    report: FirsthandReport;
    location: LocationSummary;
    investigation: InvestigationFeedContext | null;
    reasons: Array<{ score: number; reason: string }>;
  }> = [];

  for (const row of input.rows) {
    if (excluded.has(row.report.id)) {
      continue;
    }
    const reasons: Array<{ score: number; reason: string }> = [];
    if (input.followedReporterIds.has(row.createdBy)) {
      reasons.push({ score: 4, reason: "Reporter you follow" });
    }
    if (row.investigation && input.followedInvestigationIds.has(row.investigation.investigationId)) {
      reasons.push({ score: 5, reason: "Investigation you follow" });
    }
    for (const followed of input.followedLocations) {
      const match = locationFollowMatch(followed, row.location);
      if (match) {
        reasons.push(match);
      }
    }
    if (reasons.length === 0) {
      continue;
    }
    eligible.push({
      report: row.report,
      location: row.location,
      investigation: row.investigation,
      reasons,
    });
  }

  eligible.sort(
    (a, b) => b.report.publishedAt.localeCompare(a.report.publishedAt) || a.report.id.localeCompare(b.report.id),
  );

  const consumed = new Set<string>();
  const items: YourWorldItem[] = [];

  function placeFollowed(location: LocationSummary) {
    return input.followedLocations.some((followed) => Boolean(locationFollowMatch(followed, location)));
  }

  function asInvestigation(row: (typeof eligible)[number]) {
    if (!row.investigation) {
      return false;
    }
    const followedInvestigation = input.followedInvestigationIds.has(row.investigation.investigationId);
    const followedReporter = input.followedReporterIds.has(createdByFor(input.rows, row.report.id));
    return followedInvestigation || followedReporter;
  }

  for (let index = 0; index < eligible.length; index += 1) {
    const current = eligible[index]!;
    if (consumed.has(current.report.id)) {
      continue;
    }

    if (asInvestigation(current) && current.investigation) {
      consumed.add(current.report.id);
      items.push({
        kind: "investigation",
        id: `investigation:${current.report.id}`,
        occurredAt: current.report.publishedAt,
        reason: input.followedInvestigationIds.has(current.investigation.investigationId)
          ? "Investigation you follow"
          : "Reporter you follow",
        report: current.report,
        investigationTitle: current.investigation.title,
        investigationHref: current.investigation.href,
        position: current.investigation.position,
      });
      continue;
    }

    if (placeFollowed(current.location)) {
      const cluster = [current];
      for (let next = index + 1; next < eligible.length; next += 1) {
        const candidate = eligible[next]!;
        if (consumed.has(candidate.report.id) || asInvestigation(candidate)) {
          continue;
        }
        if (
          candidate.location.city !== current.location.city ||
          candidate.location.country !== current.location.country
        ) {
          continue;
        }
        if (!placeFollowed(candidate.location)) {
          continue;
        }
        const newest = new Date(cluster[0]!.report.publishedAt).getTime();
        const then = new Date(candidate.report.publishedAt).getTime();
        if (newest - then > PLACE_GROUP_WINDOW_MS) {
          break;
        }
        cluster.push(candidate);
      }
      if (cluster.length >= PLACE_GROUP_MIN) {
        for (const member of cluster) {
          consumed.add(member.report.id);
        }
        items.push({
          kind: "place-group",
          id: `place:${current.location.city}|${current.location.country}|${cluster[0]!.report.id}`,
          occurredAt: cluster[0]!.report.publishedAt,
          reason: "Place you follow",
          city: current.location.city,
          country: current.location.country,
          locationHref: current.location.href,
          reports: cluster.map((member) => member.report),
        });
        continue;
      }
    }

    consumed.add(current.report.id);
    items.push({
      kind: "report",
      id: `report:${current.report.id}`,
      occurredAt: current.report.publishedAt,
      reason: bestReason(current.reasons),
      report: current.report,
    });
  }

  const before = input.before?.trim() || null;
  const chronological = before ? items.filter((item) => item.occurredAt < before) : items;
  const limit = input.limit ?? YOUR_WORLD_PAGE_SIZE;
  const page = chronological.slice(0, limit);
  return { items: page, hasMore: chronological.length > page.length };
}
