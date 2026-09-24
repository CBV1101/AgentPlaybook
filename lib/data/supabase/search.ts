import { createClient } from "@/lib/supabase/server";
import { one, toCoverageRequest, toLocationSummary, toReport, REPORT_FEED_SELECT, type ReportJoinRow, type RequestJoinRow } from "@/lib/data/mappers";
import { buildGeographyIndex, searchGeographyHits } from "@/lib/data/geography";
import { summarizeEvents } from "@/lib/data/events";
import type { EventRecord, Location, Profile } from "@/lib/database.types";
import {
  emptySearchResults,
  limitSearchResults,
  rankEvents,
  rankPlaces,
  rankReporters,
  rankReports,
  rankRequests,
  sanitizeSearchTerm,
  searchSince,
  type SearchQuery,
  type SearchReporterHit,
  type SearchResults,
} from "@/lib/search";

const LOCATION_SELECT = "id, slug, place, city, country, latitude, longitude";
const REQUEST_SELECT =
  "id, title, description, created_at, status, created_by, location_id, locations(*), request_interests(id, user_id)";

export async function supabaseSearchFirsthand(
  query: SearchQuery,
  currentUserId?: string | null,
): Promise<SearchResults> {
  const term = sanitizeSearchTerm(query.q);
  if (!term) {
    return emptySearchResults(query);
  }

  const since = searchSince(query.timeRange);
  const want = (kind: SearchQuery["kind"]) => query.kind === "all" || query.kind === kind;
  const locations = await searchLocationRows(term);
  const locationIds = locations.map((item) => item.id);

  const [places, events, reports, requests, reporters] = await Promise.all([
    want("places") ? searchPlaces(term, locations) : Promise.resolve([]),
    want("events") ? searchEvents(term, locationIds, since) : Promise.resolve([]),
    want("reports") ? searchReports(term, locationIds, since) : Promise.resolve([]),
    want("requests") ? searchRequests(term, locationIds, currentUserId) : Promise.resolve([]),
    want("reporters") ? searchReporters(term, locationIds) : Promise.resolve([]),
  ]);

  return limitSearchResults({
    query,
    places: rankPlaces(places, term),
    events: rankEvents(events, term),
    reports: rankReports(reports, term),
    requests: rankRequests(requests, term),
    reporters: rankReporters(reporters, term),
  });
}

async function searchLocationRows(term: string) {
  const supabase = await createClient();
  const ilike = await supabase
    .from("locations")
    .select(LOCATION_SELECT)
    .or(orIlike(["place", "city", "country"], term))
    .limit(60);
  const fts = await supabase.from("locations").select(LOCATION_SELECT).textSearch("search_vector", term, {
    type: "plain",
    config: "simple",
  }).limit(60);
  return uniqueById([...(ilike.data ?? []), ...((fts.error ? [] : fts.data) ?? [])]);
}

async function searchPlaces(term: string, locations: Array<{ id: string }>) {
  if (locations.length === 0) {
    return [];
  }
  const supabase = await createClient();
  const ids = locations.map((item) => item.id);
  const [{ data: locationRows }, { data: reports }, { data: requests }] = await Promise.all([
    supabase.from("locations").select("*").in("id", ids),
    supabase
      .from("reports")
      .select("location_id")
      .in("location_id", ids)
      .is("removed_at", null)
      .eq("publish_status", "published"),
    supabase
      .from("coverage_requests")
      .select("location_id")
      .in("location_id", ids)
      .eq("status", "open")
      .is("removed_at", null),
  ]);
  const summaries = (locationRows ?? []).map(toLocationSummary);
  return searchGeographyHits(
    buildGeographyIndex({
      locations: summaries,
      reports: (reports ?? []).map((item) => ({ locationId: item.location_id })),
      openRequestLocationIds: (requests ?? []).map((item) => item.location_id),
    }),
    term,
  );
}

async function searchReports(term: string, locationIds: string[], since: string | null) {
  const supabase = await createClient();
  const textQuery = supabase
    .from("reports")
    .select("id")
    .is("removed_at", null)
    .eq("publish_status", "published")
    .or(orIlike(["title", "description"], term))
    .limit(40);
  const timedText = since ? textQuery.gte("captured_at", since) : textQuery;
  const ftsQuery = supabase
    .from("reports")
    .select("id")
    .is("removed_at", null)
    .eq("publish_status", "published")
    .textSearch("search_vector", term, { type: "plain", config: "simple" })
    .limit(40);
  const timedFts = since ? ftsQuery.gte("captured_at", since) : ftsQuery;

  const queries: Array<PromiseLike<{ data: { id: string }[] | null; error: unknown }>> = [timedText, timedFts];
  if (locationIds.length > 0) {
    let locationQuery = supabase
      .from("reports")
      .select("id")
      .is("removed_at", null)
      .eq("publish_status", "published")
      .in("location_id", locationIds)
      .order("uploaded_at", { ascending: false })
      .limit(40);
    if (since) {
      locationQuery = locationQuery.gte("captured_at", since);
    }
    queries.push(locationQuery);
  }

  const chunks = await Promise.all(queries);
  const ids = uniqueIds(chunks.flatMap((chunk) => (chunk.error ? [] : chunk.data ?? [])));
  if (ids.length === 0) {
    return [];
  }
  const { data } = await supabase.from("reports").select(REPORT_FEED_SELECT).in("id", ids);
  return ((data ?? []) as ReportJoinRow[]).map(toReport);
}

async function searchRequests(term: string, locationIds: string[], currentUserId?: string | null) {
  const supabase = await createClient();
  const textQuery = supabase
    .from("coverage_requests")
    .select("id")
    .eq("status", "open")
    .is("removed_at", null)
    .or(orIlike(["title", "description"], term))
    .limit(40);
  const ftsQuery = supabase
    .from("coverage_requests")
    .select("id")
    .eq("status", "open")
    .is("removed_at", null)
    .textSearch("search_vector", term, { type: "plain", config: "simple" })
    .limit(40);
  const queries: Array<PromiseLike<{ data: { id: string }[] | null; error: unknown }>> = [textQuery, ftsQuery];
  if (locationIds.length > 0) {
    queries.push(
      supabase
        .from("coverage_requests")
        .select("id")
        .eq("status", "open")
        .is("removed_at", null)
        .in("location_id", locationIds)
        .limit(40),
    );
  }
  const chunks = await Promise.all(queries);
  const ids = uniqueIds(chunks.flatMap((chunk) => (chunk.error ? [] : chunk.data ?? [])));
  if (ids.length === 0) {
    return [];
  }
  const { data } = await supabase.from("coverage_requests").select(REQUEST_SELECT).in("id", ids);
  return ((data ?? []) as RequestJoinRow[]).map((row) => toCoverageRequest(row, currentUserId));
}

async function searchEvents(term: string, locationIds: string[], since: string | null) {
  const supabase = await createClient();
  const textQuery = supabase
    .from("events")
    .select("id")
    .neq("status", "archived")
    .or(orIlike(["title", "description"], term))
    .limit(40);
  const timedText = since ? textQuery.gte("started_at", since) : textQuery;
  const ftsQuery = supabase
    .from("events")
    .select("id")
    .neq("status", "archived")
    .textSearch("search_vector", term, { type: "plain", config: "simple" })
    .limit(40);
  const timedFts = since ? ftsQuery.gte("started_at", since) : ftsQuery;
  const queries: Array<PromiseLike<{ data: { id: string }[] | null; error: unknown }>> = [timedText, timedFts];
  if (locationIds.length > 0) {
    let locationQuery = supabase
      .from("events")
      .select("id")
      .neq("status", "archived")
      .in("location_id", locationIds)
      .limit(40);
    if (since) {
      locationQuery = locationQuery.gte("started_at", since);
    }
    queries.push(locationQuery);
  }
  const chunks = await Promise.all(queries);
  const ids = uniqueIds(chunks.flatMap((chunk) => (chunk.error ? [] : chunk.data ?? [])));
  if (ids.length === 0) {
    return [];
  }
  const { data: eventRows } = await supabase.from("events").select("*, locations(*)").in("id", ids);
  const events = (eventRows ?? []) as Array<EventRecord & { locations: Location | Location[] | null }>;
  if (events.length === 0) {
    return [];
  }
  const eventIds = events.map((item) => item.id);
  const [{ data: reports }, { data: requests }] = await Promise.all([
    supabase
      .from("reports")
      .select("id, event_id, created_by, removed_at")
      .in("event_id", eventIds)
      .is("removed_at", null)
      .eq("publish_status", "published"),
    supabase
      .from("coverage_requests")
      .select("id, event_id, status, removed_at")
      .in("event_id", eventIds)
      .is("removed_at", null),
  ]);
  const locationRows = events.flatMap((item) => {
    const location = one(item.locations);
    return location ? [location as Location] : [];
  });
  return summarizeEvents(events, locationRows, reports ?? [], requests ?? []).filter(
    (event) => event.status !== "archived",
  );
}

async function searchReporters(term: string, locationIds: string[]): Promise<SearchReporterHit[]> {
  const supabase = await createClient();
  const textQuery = supabase
    .from("profiles")
    .select("id")
    .or(orIlike(["display_name", "username", "bio", "home_city", "home_country"], term))
    .limit(40);
  const ftsQuery = supabase
    .from("profiles")
    .select("id")
    .textSearch("search_vector", term, { type: "plain", config: "simple" })
    .limit(40);
  const [textHits, ftsHits, locationHits] = await Promise.all([
    textQuery,
    ftsQuery,
    locationIds.length > 0
      ? supabase
          .from("reports")
          .select("created_by")
          .in("location_id", locationIds)
          .is("removed_at", null)
          .eq("publish_status", "published")
          .limit(80)
      : Promise.resolve({ data: [] as Array<{ created_by: string }>, error: null }),
  ]);
  const ids = [
    ...uniqueIds([...(textHits.error ? [] : textHits.data ?? []), ...(ftsHits.error ? [] : ftsHits.data ?? [])]),
    ...new Set((locationHits.error ? [] : locationHits.data ?? []).map((row) => row.created_by)),
  ];
  const uniqueReporterIds = [...new Set(ids)];
  if (uniqueReporterIds.length === 0) {
    return [];
  }
  const [{ data: profiles }, { data: reportRows }] = await Promise.all([
    supabase.from("profiles").select("id, username, display_name, avatar_url, home_city, home_country").in("id", uniqueReporterIds),
    supabase
      .from("reports")
      .select("created_by, location_id, locations(city, country)")
      .in("created_by", uniqueReporterIds)
      .is("removed_at", null)
      .eq("publish_status", "published"),
  ]);

  const reportsByReporter = new Map<string, Array<{ locationId: string; city: string | null }>>();
  for (const row of reportRows ?? []) {
    const location = one((row as { locations: { city: string; country: string } | { city: string; country: string }[] | null }).locations);
    const list = reportsByReporter.get(row.created_by) ?? [];
    list.push({ locationId: row.location_id, city: location?.city ?? null });
    reportsByReporter.set(row.created_by, list);
  }

  return ((profiles ?? []) as Pick<Profile, "id" | "username" | "display_name" | "avatar_url" | "home_city" | "home_country">[]).map(
    (profile) => {
      const reporterReports = reportsByReporter.get(profile.id) ?? [];
      const placeIds = new Set(reporterReports.map((item) => item.locationId));
      const matchingCities = [
        ...new Set(
          reporterReports
            .filter((item) => locationIds.includes(item.locationId))
            .map((item) => item.city)
            .filter((city): city is string => Boolean(city)),
        ),
      ];
      const homeHits = [profile.home_city, profile.home_country].some(
        (value) => value && value.toLowerCase().includes(term),
      );
      const context = matchingCities.length
        ? `Reports from ${matchingCities.slice(0, 2).join(", ")}`
        : homeHits && profile.home_city
          ? `Based in ${profile.home_city}`
          : `${reporterReports.length} firsthand ${reporterReports.length === 1 ? "report" : "reports"}`;
      return {
        id: profile.id,
        username: profile.username,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        context,
        reportCount: reporterReports.length,
        placeCount: placeIds.size,
      };
    },
  );
}

function orIlike(columns: string[], term: string) {
  return columns.map((column) => `${column}.ilike.%${term}%`).join(",");
}

function uniqueById<T extends { id: string }>(rows: T[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.id)) {
      return false;
    }
    seen.add(row.id);
    return true;
  });
}

function uniqueIds(rows: Array<{ id: string }>) {
  return [...new Set(rows.map((row) => row.id).filter(Boolean))];
}
