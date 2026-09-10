import { findMatchingLocation, nextLocationSlug, slugForLocation } from "@/lib/data/locations";
import { one, toCoverageRequest, toLocationSummary, toReport, type ReportJoinRow, type RequestJoinRow } from "@/lib/data/mappers";
import type { StructuredLocation } from "@/lib/location";
import { storeReportMedia } from "@/lib/media/store";
import { assembleReporterProfilePage } from "@/lib/data/reporter";
import { aggregateDiscoveryPlaces, type DiscoveryPlace } from "@/lib/data/discovery";
import { createClient } from "@/lib/supabase/server";
import {
  contentPath,
  MODERATION_REASONS,
  type ModerationContentType,
  type ModerationQueueItem,
  type ModerationReason,
  type ModerationStatus,
} from "@/lib/moderation";

export async function supabaseGetHomeFeed() {
  const supabase = await createClient();
  const [{ data: requestRows }, { data: reportRows }] = await Promise.all([
    supabase
      .from("coverage_requests")
      .select("id, title, description, created_at, status, created_by, location_id, locations(*), request_interests(id, user_id)")
      .eq("status", "open")
      .is("removed_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("reports")
      .select("id, title, description, uploaded_at, captured_at, request_id, location_id, licensing_status, locations(*), profiles(display_name, username), report_media(media_type, media_url, thumbnail_url)")
      .is("removed_at", null)
      .order("uploaded_at", { ascending: false })
      .limit(8),
  ]);

  const requests = ((requestRows ?? []) as RequestJoinRow[])
    .map((row) => toCoverageRequest(row))
    .sort((a, b) => b.supporterCount - a.supporterCount || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);

  return {
    source: "supabase" as const,
    requests,
    reports: ((reportRows ?? []) as ReportJoinRow[]).map(toReport),
    places: await supabaseDiscoveryPlaces(),
  };
}

export async function supabaseDiscoveryPlaces(): Promise<DiscoveryPlace[]> {
  const supabase = await createClient();
  const [{ data: locations }, { data: reports }, { data: openRequests }] = await Promise.all([
    supabase.from("locations").select("*"),
    supabase.from("reports").select("location_id").is("removed_at", null),
    supabase.from("coverage_requests").select("location_id").eq("status", "open").is("removed_at", null),
  ]);

  return aggregateDiscoveryPlaces({
    locations: (locations ?? []).map(toLocationSummary),
    reports: (reports ?? []).map((item) => ({ locationId: item.location_id })),
    openRequests: [],
    openRequestLocationIds: (openRequests ?? []).map((item) => item.location_id),
  });
}

export async function supabaseSearchLocations(query: string): Promise<DiscoveryPlace[]> {
  const needle = query.trim().toLowerCase();
  const places = await supabaseDiscoveryPlaces();
  if (!needle) {
    return places;
  }
  return places.filter((place) =>
    [place.label, place.place, place.city, place.country].filter(Boolean).join(" ").toLowerCase().includes(needle),
  );
}

export async function supabaseSearchCoverage(query: string, currentUserId?: string | null) {
  const feed = await supabaseGetHomeFeed();
  const places = await supabaseSearchLocations(query);
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return { ...feed, places };
  }

  const supabase = await createClient();
  const [{ data: requestRows }, { data: reportRows }] = await Promise.all([
    supabase
      .from("coverage_requests")
      .select("id, title, description, created_at, status, created_by, location_id, locations(*), request_interests(id, user_id)")
      .eq("status", "open")
      .is("removed_at", null)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("reports")
      .select("id, title, description, uploaded_at, captured_at, request_id, location_id, licensing_status, locations(*), profiles(display_name, username), report_media(media_type, media_url, thumbnail_url)")
      .is("removed_at", null)
      .order("uploaded_at", { ascending: false })
      .limit(100),
  ]);

  const requests = ((requestRows ?? []) as RequestJoinRow[])
    .map((row) => toCoverageRequest(row, currentUserId))
    .filter(
      (item) => item.title.toLowerCase().includes(needle) || item.location.toLowerCase().includes(needle),
    )
    .sort((a, b) => b.supporterCount - a.supporterCount || b.createdAt.localeCompare(a.createdAt));
  const reports = ((reportRows ?? []) as ReportJoinRow[])
    .map(toReport)
    .filter(
      (item) =>
        item.title.toLowerCase().includes(needle) ||
        item.location.toLowerCase().includes(needle) ||
        item.excerpt.toLowerCase().includes(needle),
    );

  return { source: "supabase" as const, places, requests, reports };
}

export async function supabaseGetLocationBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("locations").select("*").eq("slug", slug).maybeSingle();
  return data ? toLocationSummary(data) : null;
}

export async function supabaseGetPlacePageData(slug: string, currentUserId?: string | null) {
  const location = await supabaseGetLocationBySlug(slug);
  if (!location) {
    return null;
  }

  const supabase = await createClient();
  const [{ data: requestRows }, { data: reportRows }] = await Promise.all([
    supabase
      .from("coverage_requests")
      .select("id, title, description, created_at, status, created_by, location_id, locations(*), request_interests(id, user_id)")
      .eq("location_id", location.id)
      .is("removed_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("reports")
      .select("id, title, description, uploaded_at, captured_at, request_id, location_id, licensing_status, locations(*), profiles(display_name, username), report_media(media_type, media_url, thumbnail_url)")
      .eq("location_id", location.id)
      .is("removed_at", null)
      .order("uploaded_at", { ascending: false }),
  ]);

  const requests = ((requestRows ?? []) as RequestJoinRow[]).map((row) =>
    toCoverageRequest(row, currentUserId),
  );
  const supportByRequest = new Map(requests.map((item) => [item.id, item.supporterCount]));
  const reports = ((reportRows ?? []) as ReportJoinRow[]).map((row) => ({
    ...toReport(row),
    requestSupporterCount: row.request_id ? (supportByRequest.get(row.request_id) ?? 0) : 0,
  }));

  return {
    location,
    openRequests: requests.filter((request) => request.status === "open"),
    reports,
    reportCount: reports.length,
    openRequestCount: requests.filter((request) => request.status === "open").length,
  };
}

export async function supabaseGetCoverageRequestPage(id: string, currentUserId?: string | null) {
  const supabase = await createClient();
  const { data: requestRow } = await supabase
    .from("coverage_requests")
    .select("id, title, description, created_at, status, created_by, location_id, removed_at, locations(*), request_interests(id, user_id)")
    .eq("id", id)
    .maybeSingle();

  if (!requestRow) {
    return null;
  }

  const request = requestRow as RequestJoinRow;
  const location = one(request.locations);
  if (!location) {
    return null;
  }

  const { data: reportRows } = await supabase
    .from("reports")
    .select("id, title, description, uploaded_at, captured_at, request_id, location_id, licensing_status, locations(*), profiles(display_name, username), report_media(media_type, media_url, thumbnail_url)")
    .eq("request_id", id)
    .is("removed_at", null)
    .order("uploaded_at", { ascending: false });

  return {
    request: {
      ...toCoverageRequest(request, currentUserId),
      description: request.description,
    },
    removedAt: (request as { removed_at?: string | null }).removed_at ?? null,
    location: toLocationSummary(location),
    reports: ((reportRows ?? []) as ReportJoinRow[]).map(toReport),
    interestedUserIds: (request.request_interests ?? []).map((row) => row.user_id),
    currentUserId: currentUserId ?? null,
  };
}

export async function supabaseGetReportPage(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("*, locations(*), profiles(display_name, username), report_media(*)")
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    return null;
  }

  const location = one(data.locations);
  if (!location) {
    return null;
  }

  const request = data.request_id
    ? (
        await supabase.from("coverage_requests").select("title").eq("id", data.request_id).maybeSingle()
      ).data
    : null;
  const profile = one(data.profiles);

  const joined = data as ReportJoinRow & {
    description: string | null;
    captured_at: string;
    uploaded_at: string;
    request_id: string | null;
    licensing_status: "view_only" | "licensing_available";
    report_media: NonNullable<ReportJoinRow["report_media"]>;
  };

  return {
    report: toReport(joined),
    description: joined.description,
    capturedAt: joined.captured_at,
    uploadedAt: joined.uploaded_at,
    location: toLocationSummary(location),
    requestId: joined.request_id,
    requestTitle: request?.title ?? null,
    media: joined.report_media ?? [],
    licensingStatus: joined.licensing_status,
    reporterUsername: profile?.username ?? "reporter",
    reporterDisplayName: profile?.display_name ?? "Anonymous reporter",
    removedAt: (joined as { removed_at?: string | null }).removed_at ?? null,
  };
}

export async function supabaseGetRequestComposeContext(requestId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("coverage_requests")
    .select("id, title, location_id, removed_at, locations(place, city, country)")
    .eq("id", requestId)
    .maybeSingle();

  if (!data || data.removed_at) {
    return null;
  }

  const location = one(data.locations);
  return {
    id: data.id,
    title: data.title,
    locationId: data.location_id,
    locationLabel: location ? [location.place, location.city, location.country].filter(Boolean).join(", ") : "",
  };
}

export async function supabaseFindOrCreateLocation(location: StructuredLocation) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("locations")
    .select("*")
    .eq("city", location.city)
    .eq("country", location.country);

  const match = findMatchingLocation(existing ?? [], location);
  if (match) {
    return match.id;
  }

  const taken = new Set((existing ?? []).map((item) => item.slug));
  const { data: allSlugs } = await supabase.from("locations").select("slug");
  for (const row of allSlugs ?? []) {
    taken.add(row.slug);
  }

  const slug = nextLocationSlug(slugForLocation(location), taken);
  const { data, error } = await supabase
    .from("locations")
    .insert({
      country: location.country,
      city: location.city,
      place: location.place,
      latitude: location.latitude,
      longitude: location.longitude,
      slug,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Could not save this location.");
  }

  return data.id;
}

export async function supabaseCreateCoverageRequest(input: {
  userId: string;
  title: string;
  description: string | null;
  location: StructuredLocation;
}) {
  const locationId = await supabaseFindOrCreateLocation(input.location);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coverage_requests")
    .insert({
      created_by: input.userId,
      location_id: locationId,
      title: input.title,
      description: input.description,
      status: "open",
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Could not create the request.");
  }

  return data.id;
}

export async function supabaseExpressInterest(requestId: string, userId: string) {
  const supabase = await createClient();
  const { data: request } = await supabase
    .from("coverage_requests")
    .select("id, removed_at")
    .eq("id", requestId)
    .maybeSingle();
  if (!request || request.removed_at) {
    throw new Error("This coverage request is no longer available.");
  }

  const { error } = await supabase.from("request_interests").insert({
    request_id: requestId,
    user_id: userId,
  });

  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }
}

export async function supabaseCreateReport(input: {
  userId: string;
  title: string;
  description: string;
  capturedAt: string;
  requestId: string | null;
  locationId?: string;
  location?: StructuredLocation | null;
  files: File[];
  licensingStatus: "view_only" | "licensing_available";
}) {
  let locationId = input.locationId;
  if (!locationId) {
    if (!input.location) {
      throw new Error("location");
    }
    locationId = await supabaseFindOrCreateLocation(input.location);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .insert({
      created_by: input.userId,
      request_id: input.requestId,
      location_id: locationId,
      title: input.title,
      description: input.description,
      captured_at: input.capturedAt,
      licensing_status: input.licensingStatus,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Could not publish the report.");
  }

  const stored = await storeReportMedia(input.files, {
    userId: input.userId,
    reportId: data.id,
    licensingStatus: input.licensingStatus,
  });

  if (stored.length > 0) {
    const { error: mediaError } = await supabase.from("report_media").insert(
      stored.map((item) => ({
        report_id: data.id,
        media_type: item.mediaType,
        media_url: item.mediaUrl,
        thumbnail_url: item.thumbnailUrl,
        original_filename: item.originalFilename,
        captured_at: input.capturedAt,
        licensing_status: input.licensingStatus,
      })),
    );
    if (mediaError) {
      throw new Error(mediaError.message);
    }
  }

  const { data: location } = await supabase
    .from("locations")
    .select("slug")
    .eq("id", locationId)
    .maybeSingle();

  return { id: data.id, locationSlug: location?.slug ?? null };
}

export async function supabaseGetProfilePage(username: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
  if (!profile) {
    return null;
  }
  return supabaseAssembleProfile(profile);
}

export async function supabaseGetProfileByUserId(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return data;
}

async function supabaseAssembleProfile(profile: NonNullable<Awaited<ReturnType<typeof supabaseGetProfileByUserId>>>) {
  const supabase = await createClient();
  const { data: reportRows } = await supabase
    .from("reports")
    .select("id, title, description, uploaded_at, captured_at, request_id, location_id, licensing_status, locations(*), profiles(display_name, username), report_media(media_type, media_url, thumbnail_url)")
    .eq("created_by", profile.id)
    .is("removed_at", null)
    .order("uploaded_at", { ascending: false });

  const rows = (reportRows ?? []) as ReportJoinRow[];
  const reports = rows.map(toReport);
  const locationsById = new Map(
    rows.flatMap((row) => {
      const location = one(row.locations);
      return location ? [[location.id, location] as const] : [];
    }),
  );

  const extras = await loadReputationCounts(profile.id, reports.map((item) => item.id));
  return assembleReporterProfilePage(profile, reports, locationsById, extras);
}

async function loadReputationCounts(profileId: string, reportIds: string[]) {
  const supabase = await createClient();
  const empty = { followerCount: 0, supportCount: 0, correctionCount: 0, completedLicensingCount: 0 };

  try {
    const [{ count: followerCount }, supports, corrections, transactions] = await Promise.all([
      supabase.from("profile_follows").select("*", { count: "exact", head: true }).eq("following_id", profileId),
      reportIds.length
        ? supabase.from("report_supports").select("id", { count: "exact", head: true }).in("report_id", reportIds)
        : Promise.resolve({ count: 0 }),
      reportIds.length
        ? supabase.from("report_corrections").select("id", { count: "exact", head: true }).in("report_id", reportIds)
        : Promise.resolve({ count: 0 }),
      reportIds.length
        ? supabase
            .from("licensing_transactions")
            .select("id", { count: "exact", head: true })
            .in("report_id", reportIds)
            .eq("status", "completed")
        : Promise.resolve({ count: 0 }),
    ]);

    return {
      followerCount: followerCount ?? 0,
      supportCount: supports.count ?? 0,
      correctionCount: corrections.count ?? 0,
      completedLicensingCount: transactions.count ?? 0,
    };
  } catch {
    return empty;
  }
}

function toSupabaseQueueItem(
  item: {
    id: string;
    submitted_by: string;
    content_type: "firsthand_report" | "coverage_request";
    content_id: string;
    reason: ModerationReason;
    details: string | null;
    created_at: string;
    status: ModerationStatus;
  },
  titles: Map<string, { title: string; removed: boolean }>,
  usernames: Map<string, string>,
): ModerationQueueItem {
  const content = titles.get(`${item.content_type}:${item.content_id}`);
  return {
    id: item.id,
    submittedBy: item.submitted_by,
    submittedByUsername: usernames.get(item.submitted_by) ?? "unknown",
    contentType: item.content_type,
    contentId: item.content_id,
    contentTitle: content?.title ?? "Content no longer available",
    contentHref: contentPath(item.content_type, item.content_id),
    contentRemoved: content?.removed ?? true,
    reason: item.reason,
    details: item.details,
    createdAt: item.created_at,
    status: item.status,
  };
}

export async function supabaseSubmitModerationReport(input: {
  userId: string;
  contentType: ModerationContentType;
  contentId: string;
  reason: string;
  details: string | null;
}) {
  const reason = MODERATION_REASONS.find((item) => item.id === input.reason)?.id;
  if (!reason) {
    throw new Error("reason");
  }

  const supabase = await createClient();
  const table = input.contentType === "coverage_request" ? "coverage_requests" : "reports";
  const { data: content } = await supabase.from(table).select("id").eq("id", input.contentId).maybeSingle();
  if (!content) {
    throw new Error("content");
  }

  const { error } = await supabase.from("moderation_reports").insert({
    submitted_by: input.userId,
    content_type: input.contentType,
    content_id: input.contentId,
    reason,
    details: input.details,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function supabaseListModerationReports(): Promise<ModerationQueueItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("moderation_reports")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const reportIds = rows.filter((row) => row.content_type === "firsthand_report").map((row) => row.content_id);
  const requestIds = rows.filter((row) => row.content_type === "coverage_request").map((row) => row.content_id);
  const submitterIds = [...new Set(rows.map((row) => row.submitted_by))];

  const [{ data: reports }, { data: requests }, { data: profiles }] = await Promise.all([
    reportIds.length
      ? supabase.from("reports").select("id, title, removed_at").in("id", reportIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; removed_at: string | null }> }),
    requestIds.length
      ? supabase.from("coverage_requests").select("id, title, removed_at").in("id", requestIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; removed_at: string | null }> }),
    submitterIds.length
      ? supabase.from("profiles").select("id, username").in("id", submitterIds)
      : Promise.resolve({ data: [] as Array<{ id: string; username: string }> }),
  ]);

  const titles = new Map<string, { title: string; removed: boolean }>();
  for (const row of reports ?? []) {
    titles.set(`firsthand_report:${row.id}`, { title: row.title, removed: Boolean(row.removed_at) });
  }
  for (const row of requests ?? []) {
    titles.set(`coverage_request:${row.id}`, { title: row.title, removed: Boolean(row.removed_at) });
  }
  const usernames = new Map((profiles ?? []).map((row) => [row.id, row.username]));

  return rows.map((row) => toSupabaseQueueItem(row, titles, usernames));
}

export async function supabaseUpdateModerationStatus(id: string, status: ModerationStatus) {
  const supabase = await createClient();
  const { error } = await supabase.from("moderation_reports").update({ status }).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function supabaseRemoveReportedContent(id: string) {
  const supabase = await createClient();
  const { data: item, error } = await supabase
    .from("moderation_reports")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !item) {
    throw new Error(error?.message || "Moderation report not found.");
  }

  const now = new Date().toISOString();
  if (item.content_type === "coverage_request") {
    const { error: updateError } = await supabase
      .from("coverage_requests")
      .update({ removed_at: now })
      .eq("id", item.content_id)
      .is("removed_at", null);
    if (updateError) {
      throw new Error(updateError.message);
    }
  } else {
    const { error: updateError } = await supabase
      .from("reports")
      .update({ removed_at: now })
      .eq("id", item.content_id)
      .is("removed_at", null);
    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  const { error: statusError } = await supabase
    .from("moderation_reports")
    .update({ status: "removed" })
    .eq("content_type", item.content_type)
    .eq("content_id", item.content_id)
    .eq("status", "open");
  if (statusError) {
    throw new Error(statusError.message);
  }
}
