import { toLocationSummary } from "@/lib/data/mappers";
import type { EventRecord, Location } from "@/lib/database.types";
import type { EventSummary, EventStatus } from "@/lib/types";

type CountableReport = {
  event_id?: string | null;
  created_by: string;
  removed_at?: string | null;
};

type CountableRequest = {
  event_id?: string | null;
  status?: string;
  removed_at?: string | null;
};

export function toEventSummary(
  event: EventRecord,
  location: Location,
  reports: CountableReport[],
  requests: CountableRequest[],
): EventSummary {
  const eventReports = reports.filter((item) => item.event_id === event.id && !item.removed_at);
  const eventRequests = requests.filter((item) => item.event_id === event.id && !item.removed_at);
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    status: event.status as EventStatus,
    startedAt: event.started_at,
    endedAt: event.ended_at,
    location: toLocationSummary(location),
    reportCount: eventReports.length,
    openRequestCount: eventRequests.filter((item) => item.status === "open").length,
    reporterCount: new Set(eventReports.map((item) => item.created_by)).size,
  };
}

export function summarizeEvents(
  events: EventRecord[],
  locations: Location[],
  reports: CountableReport[],
  requests: CountableRequest[],
): EventSummary[] {
  const locationsById = new Map(locations.map((item) => [item.id, item]));
  return events
    .flatMap((event) => {
      const location = locationsById.get(event.location_id);
      if (!location) {
        return [];
      }
      return [toEventSummary(event, location, reports, requests)];
    })
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function activeEventSummaries(
  events: EventRecord[],
  locations: Location[],
  reports: CountableReport[],
  requests: CountableRequest[],
  locationIds?: Set<string>,
) {
  return summarizeEvents(
    events.filter(
      (event) => event.status === "active" && (!locationIds || locationIds.has(event.location_id)),
    ),
    locations,
    reports,
    requests,
  );
}
