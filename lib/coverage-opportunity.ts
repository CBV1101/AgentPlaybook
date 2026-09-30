import type { CoverageRequest, FirsthandReport, LocationSummary } from "@/lib/types";
import { isPubliclyLive, type LiveStreamSummary } from "@/lib/live";

/**
 * A coverage opportunity is a recommendation to look at a place.
 * It is not a firsthand report. An event signal (external or internal)
 * can point at a location; only a published report is a firsthand account.
 */
export type CoverageOpportunitySourceType = "firsthand_demand" | "event_signal";
export type CoverageOpportunityUrgency = "high" | "elevated" | "watch";

export type CoverageOpportunity = {
  id: string;
  title: string;
  summary: string;
  location: LocationSummary;
  eventType: string | null;
  urgency: CoverageOpportunityUrgency;
  sourceType: CoverageOpportunitySourceType;
  occurredAt: string;
  requestCount: number;
  interestedCount: number;
  reporterCount: number;
  activeStreamCount: number;
  relatedReporterIds: string[];
  relatedRequestIds: string[];
  externalReference: string | null;
};

export type AreaReporter = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  live: boolean;
  recentTitle: string | null;
  placeLabel: string;
};

export function eventSignalDisclaimer() {
  return "This is a coverage signal, not a Firsthand report. Firsthand has not verified that the event is occurring.";
}

export function firsthandDemandDisclaimer() {
  return "People on Firsthand asked for reporting here. That demand is not a confirmation of what is happening.";
}

export function opportunityDisclaimer(item: CoverageOpportunity) {
  return item.sourceType === "event_signal" ? eventSignalDisclaimer() : firsthandDemandDisclaimer();
}

export function opportunityFromRequest(
  request: CoverageRequest,
  extras?: { reporterCount?: number; activeStreamCount?: number; relatedReporterIds?: string[] },
): CoverageOpportunity {
  const location: LocationSummary = {
    id: request.locationSlug ?? request.id,
    slug: request.locationSlug ?? request.id,
    place: null,
    city: request.city ?? request.location,
    country: request.country ?? "",
    latitude: request.latitude ?? null,
    longitude: request.longitude ?? null,
    label: request.location,
    href: request.locationHref ?? "/browse",
  };
  const unanswered = (request.responseCount ?? 0) === 0;
  const urgency: CoverageOpportunityUrgency =
    request.supporterCount >= 80 && unanswered
      ? "high"
      : request.supporterCount >= 25
        ? "elevated"
        : "watch";
  return {
    id: request.id,
    title: request.title,
    summary: unanswered
      ? "People are asking for a firsthand view from this place. No published report has answered yet."
      : "People asked for coverage here, and firsthand reports already exist.",
    location,
    eventType: null,
    urgency,
    sourceType: "firsthand_demand",
    occurredAt: request.createdAt,
    requestCount: 1,
    interestedCount: request.supporterCount,
    reporterCount: extras?.reporterCount ?? 0,
    activeStreamCount: extras?.activeStreamCount ?? 0,
    relatedReporterIds: extras?.relatedReporterIds ?? [],
    relatedRequestIds: [request.id],
    externalReference: null,
  };
}

export function rankHotOpportunities(items: CoverageOpportunity[]) {
  return [...items].sort((a, b) => {
    const urgencyRank = { high: 0, elevated: 1, watch: 2 };
    const u = urgencyRank[a.urgency] - urgencyRank[b.urgency];
    if (u !== 0) {
      return u;
    }
    const unanswered = Number(b.requestCount > 0 && b.reporterCount === 0) - Number(a.requestCount > 0 && a.reporterCount === 0);
    if (unanswered !== 0) {
      return unanswered;
    }
    if (b.interestedCount !== a.interestedCount) {
      return b.interestedCount - a.interestedCount;
    }
    if (b.activeStreamCount !== a.activeStreamCount) {
      return b.activeStreamCount - a.activeStreamCount;
    }
    return b.occurredAt.localeCompare(a.occurredAt);
  });
}

export function reportersInArea(
  city: string,
  country: string,
  reports: FirsthandReport[],
  lives: LiveStreamSummary[],
): AreaReporter[] {
  const liveHere = lives.filter(
    (item) => isPubliclyLive(item) && item.location.city === city && item.location.country === country,
  );
  const byId = new Map<string, AreaReporter>();
  for (const stream of liveHere) {
    byId.set(stream.reporterId, {
      id: stream.reporterId,
      username: stream.reporterUsername,
      displayName: stream.reporterName,
      avatarUrl: null,
      live: true,
      recentTitle: stream.title,
      placeLabel: `${stream.location.city}, ${stream.location.country}`,
    });
  }
  for (const report of reports) {
    if (report.city !== city || report.country !== country || !report.reporterUsername) {
      continue;
    }
    const id = report.reporterUsername;
    const existing = byId.get(id);
    if (existing) {
      continue;
    }
    byId.set(id, {
      id,
      username: report.reporterUsername,
      displayName: report.reporterName,
      avatarUrl: report.reporterAvatarUrl ?? null,
      live: false,
      recentTitle: report.title,
      placeLabel: report.location,
    });
  }
  return [...byId.values()].sort((a, b) => Number(b.live) - Number(a.live));
}

export type GlobeActivityKind = "live" | "wanted" | "report";

export type GlobeActivityMarker = {
  id: string;
  kind: GlobeActivityKind;
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  title: string;
  href: string;
  subtitle?: string;
  reporterName?: string;
  interestedCount?: number;
};
