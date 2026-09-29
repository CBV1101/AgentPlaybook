import { findMatchingLocation, nextLocationSlug, slugForLocation } from "@/lib/data/locations";
import { one, toCoverageRequest, toLocationSummary, REPORT_FEED_SELECT, type ReportJoinRow, type RequestJoinRow } from "@/lib/data/mappers";
import { deliverReports, deliverStoredPhotoFields } from "@/lib/data/report-delivery";
import { canViewReportMedia } from "@/lib/media/visibility";
import type { StructuredLocation } from "@/lib/location";
import {
  createCloudflareBasicUpload,
  createCloudflareTusUpload,
  getCloudflareStreamVideo,
  isCloudflareStreamConfigured,
} from "@/lib/media/cloudflare-stream";
import { chooseRecordedMediaBackend } from "@/lib/media/local-mode";
import { logMediaStorageFailure } from "@/lib/media/log";
import { USER_UPLOAD_FAILED_MESSAGE } from "@/lib/media/limits";
import { pendingMediaUrl, preferTus } from "@/lib/media/status";
import { removeSupabaseReporterAvatar, uploadSupabaseReporterAvatar } from "@/lib/media/supabase-avatar";
import { uploadProvenanceFields } from "@/lib/media/provenance";
import { createSupabaseImageUpload, hashSupabaseImageObject } from "@/lib/media/supabase-signed";
import { reportMediaIdentityUrl } from "@/lib/media/supabase-images";
import type { CreateMediaSessionInput, MediaUploadSession } from "@/lib/media/types";
import { assembleReporterProfilePage } from "@/lib/data/reporter";
import { aggregateDiscoveryPlaces, type DiscoveryPlace } from "@/lib/data/discovery";
import {
  buildGeographyIndex,
  locationsInCity,
  locationsInCountry,
  searchGeographyHits,
  type CityPageData,
  type CountryPageData,
  type GeographySearchHit,
} from "@/lib/data/geography";
import {
  isLicensingInquiryStatus,
  normalizeInquiryStatus,
  type LicensingInboxItem,
  type LicensingInquiryStatus,
} from "@/lib/licensing";
import { homepageCoverageWanted } from "@/lib/coverage-wanted";
import { activeEventSummaries, toEventSummary } from "@/lib/data/events";
import { findGeoFollowLocation, geoFollowInsertFields, geoFollowSlugBase } from "@/lib/data/geo-follow";
import { type GeoFollowTarget } from "@/lib/follows";
import { assembleYourWorldFeed, type YourWorldItem } from "@/lib/your-world";
import { citySlug } from "@/lib/geo";
import { assertEventAttachable } from "@/lib/events";
import type { EventPageData, EventReporter, EventSummary } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { getDataSource } from "@/lib/data/mode";
import {
  supabaseListPublicLiveStreams,
  supabaseLiveLocationIds,
  supabaseTerminateLiveStream,
} from "@/lib/data/supabase/live-repository";
import type { EventRecord, Location, ReportMedia } from "@/lib/database.types";
import {
  contentPath,
  LIVE_MODERATION_REASON_IDS,
  MODERATION_REASONS,
  type ModerationContentType,
  type ModerationQueueItem,
  type ModerationReason,
  type ModerationStatus,
} from "@/lib/moderation";

export async function supabaseGetHomeFeed() {
  const supabase = await createClient();
  const [wanted, { data: reportRows }] = await Promise.all([
    supabaseListOpenCoverageWanted(),
    supabase
      .from("reports")
      .select(REPORT_FEED_SELECT)
      .is("removed_at", null)
      .eq("publish_status", "published")
      .order("uploaded_at", { ascending: false })
      .limit(8),
  ]);

  return {
    source: "supabase" as const,
    requests: homepageCoverageWanted(wanted, 8),
    reports: await deliverReports((reportRows ?? []) as ReportJoinRow[]),
    places: await supabaseDiscoveryPlaces(),
    activeEvents: await supabaseListActiveEvents(),
    liveStreams: await supabaseListPublicLiveStreams(),
  };
}

export async function supabaseListOpenCoverageWanted(currentUserId?: string | null) {
  const supabase = await createClient();
  const [{ data: requestRows }, { data: reportRows }] = await Promise.all([
    supabase
      .from("coverage_requests")
      .select("id, title, description, created_at, status, created_by, location_id, locations(*), request_interests(id, user_id)")
      .eq("status", "open")
      .is("removed_at", null)
      .order("created_at", { ascending: false })
      .limit(400),
    supabase.from("reports").select("request_id").is("removed_at", null).eq("publish_status", "published").not("request_id", "is", null),
  ]);

  const responseCounts = new Map<string, number>();
  for (const row of reportRows ?? []) {
    if (!row.request_id) {
      continue;
    }
    responseCounts.set(row.request_id, (responseCounts.get(row.request_id) ?? 0) + 1);
  }

  return ((requestRows ?? []) as RequestJoinRow[]).map((row) =>
    toCoverageRequest(row, currentUserId, responseCounts.get(row.id) ?? 0),
  );
}

export async function supabaseDiscoveryPlaces(): Promise<DiscoveryPlace[]> {
  const supabase = await createClient();
  const [{ data: locations }, { data: reports }, { data: openRequests }] = await Promise.all([
    supabase.from("locations").select("*"),
    supabase.from("reports").select("location_id").is("removed_at", null).eq("publish_status", "published"),
    supabase.from("coverage_requests").select("location_id").eq("status", "open").is("removed_at", null),
  ]);

  return aggregateDiscoveryPlaces({
    locations: (locations ?? []).map(toLocationSummary),
    reports: (reports ?? []).map((item) => ({ locationId: item.location_id })),
    openRequests: [],
    openRequestLocationIds: (openRequests ?? []).map((item) => item.location_id),
    liveLocationIds: await supabaseLiveLocationIds(),
  });
}

async function supabaseGeographyIndex() {
  const supabase = await createClient();
  const [{ data: locations }, { data: reports }, { data: openRequests }] = await Promise.all([
    supabase.from("locations").select("*"),
    supabase.from("reports").select("location_id").is("removed_at", null).eq("publish_status", "published"),
    supabase.from("coverage_requests").select("location_id").eq("status", "open").is("removed_at", null),
  ]);

  return {
    locations: (locations ?? []).map(toLocationSummary),
    index: buildGeographyIndex({
      locations: (locations ?? []).map(toLocationSummary),
      reports: (reports ?? []).map((item) => ({ locationId: item.location_id })),
      openRequestLocationIds: (openRequests ?? []).map((item) => item.location_id),
      liveLocationIds: await supabaseLiveLocationIds(),
    }),
  };
}

export async function supabaseSearchGeography(query: string): Promise<GeographySearchHit[]> {
  const { index } = await supabaseGeographyIndex();
  return searchGeographyHits(index, query);
}

export async function supabaseGetBrowseOverview() {
  const { index } = await supabaseGeographyIndex();
  return {
    countries: index.countries,
    cities: index.cities,
    places: index.places.filter((place) => place.place).slice(0, 12),
  };
}

export async function supabaseGetCountryPage(
  slug: string,
  currentUserId?: string | null,
): Promise<CountryPageData | null> {
  const { locations, index } = await supabaseGeographyIndex();
  const country = index.countries.find((item) => item.slug === slug);
  const matched = locationsInCountry(locations, slug);
  if (!country || matched.length === 0) {
    return null;
  }
  const locationIds = matched.map((item) => item.id);
  const [latestReports, mostRequested] = await Promise.all([
    supabaseReportsForLocations(locationIds, 8),
    supabaseRequestsForLocations(locationIds, currentUserId),
  ]);
  return {
    country,
    cities: index.cities.filter((city) => city.countrySlug === slug),
    latestReports,
    mostRequested: mostRequested.slice(0, 8),
    activeEvents: await supabaseListActiveEvents(locationIds),
    liveStreams: await supabaseListPublicLiveStreams({ locationIds }),
  };
}

export async function supabaseGetCityPage(
  slug: string,
  currentUserId?: string | null,
): Promise<CityPageData | null> {
  const { locations, index } = await supabaseGeographyIndex();
  const city = index.cities.find((item) => item.slug === slug);
  const matched = locationsInCity(locations, slug);
  if (!city || matched.length === 0) {
    return null;
  }
  const locationIds = matched.map((item) => item.id);
  const [latestReports, openRequests] = await Promise.all([
    supabaseReportsForLocations(locationIds, 8),
    supabaseRequestsForLocations(locationIds, currentUserId),
  ]);
  const mapPlaces = index.places.filter((place) => citySlug(place.city, place.country) === slug);
  return {
    city,
    places: mapPlaces.filter((place) => place.place),
    mapPlaces,
    latestReports,
    mostRequested: openRequests.slice(0, 8),
    openRequests,
    activeEvents: await supabaseListActiveEvents(locationIds),
    liveStreams: await supabaseListPublicLiveStreams({ locationIds }),
  };
}

async function supabaseReportsForLocations(locationIds: string[], limit: number) {
  if (locationIds.length === 0) {
    return [];
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select(REPORT_FEED_SELECT)
    .in("location_id", locationIds)
    .is("removed_at", null)
    .eq("publish_status", "published")
    .order("uploaded_at", { ascending: false })
    .limit(limit);
  return deliverReports((data ?? []) as ReportJoinRow[]);
}

async function supabaseRequestsForLocations(locationIds: string[], currentUserId?: string | null) {
  if (locationIds.length === 0) {
    return [];
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("coverage_requests")
    .select("id, title, description, created_at, status, created_by, location_id, locations(*), request_interests(id, user_id)")
    .in("location_id", locationIds)
    .eq("status", "open")
    .is("removed_at", null)
    .order("created_at", { ascending: false });
  return ((data ?? []) as RequestJoinRow[])
    .map((row) => toCoverageRequest(row, currentUserId))
    .sort((a, b) => b.supporterCount - a.supporterCount || b.createdAt.localeCompare(a.createdAt));
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
      .select(REPORT_FEED_SELECT)
      .is("removed_at", null)
      .eq("publish_status", "published")
      .order("uploaded_at", { ascending: false })
      .limit(100),
  ]);

  const requests = ((requestRows ?? []) as RequestJoinRow[])
    .map((row) => toCoverageRequest(row, currentUserId))
    .filter(
      (item) => item.title.toLowerCase().includes(needle) || item.location.toLowerCase().includes(needle),
    )
    .sort((a, b) => b.supporterCount - a.supporterCount || b.createdAt.localeCompare(a.createdAt));
  const reports = (await deliverReports((reportRows ?? []) as ReportJoinRow[])).filter(
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

export async function supabaseGetLocationById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("locations").select("*").eq("id", id).maybeSingle();
  return data ? toLocationSummary(data) : null;
}

export async function supabaseGetPlacePageData(slug: string, currentUserId?: string | null) {
  const location = await supabaseGetLocationBySlug(slug);
  if (!location?.place) {
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
      .select(REPORT_FEED_SELECT)
      .eq("location_id", location.id)
      .is("removed_at", null)
      .eq("publish_status", "published")
      .order("uploaded_at", { ascending: false }),
  ]);

  const requests = ((requestRows ?? []) as RequestJoinRow[]).map((row) =>
    toCoverageRequest(row, currentUserId),
  );
  const supportByRequest = new Map(requests.map((item) => [item.id, item.supporterCount]));
  const reportRowsTyped = (reportRows ?? []) as ReportJoinRow[];
  const reports = (await deliverReports(reportRowsTyped)).map((report, index) => ({
    ...report,
    requestSupporterCount: reportRowsTyped[index]?.request_id
      ? (supportByRequest.get(reportRowsTyped[index].request_id ?? "") ?? 0)
      : 0,
  }));

  return {
    location,
    openRequests: requests.filter((request) => request.status === "open"),
    reports,
    reportCount: reports.length,
    openRequestCount: requests.filter((request) => request.status === "open").length,
    activeEvents: await supabaseListActiveEvents([location.id]),
    liveStreams: await supabaseListPublicLiveStreams({ locationIds: [location.id] }),
  };
}

export async function supabaseGetCoverageRequestPage(id: string, currentUserId?: string | null) {
  const supabase = await createClient();
  const { data: requestRow } = await supabase
    .from("coverage_requests")
    .select("id, title, description, created_at, status, created_by, location_id, removed_at, event_id, locations(*), request_interests(id, user_id)")
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
    .select(REPORT_FEED_SELECT)
    .eq("request_id", id)
    .is("removed_at", null)
    .eq("publish_status", "published")
    .order("uploaded_at", { ascending: false });

  return {
    request: {
      ...toCoverageRequest(request, currentUserId),
      description: request.description,
    },
    removedAt: (request as { removed_at?: string | null }).removed_at ?? null,
    location: toLocationSummary(location),
    reports: await deliverReports((reportRows ?? []) as ReportJoinRow[]),
    interestedUserIds: (request.request_interests ?? []).map((row) => row.user_id),
    currentUserId: currentUserId ?? null,
    event: await supabaseLinkedEvent(request.event_id),
    liveStreams: await supabaseListPublicLiveStreams({ requestId: id }),
  };
}

export async function supabaseGetReportPage(id: string, currentUserId?: string | null) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("*, locations(*), profiles(display_name, username, avatar_url), report_media(*), coverage_requests(title, request_interests(id))")
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    return null;
  }
  if (data.publish_status === "draft" && data.created_by !== currentUserId) {
    return null;
  }

  let isAdmin = false;
  if (currentUserId) {
    const { data: roleRow } = await supabase.from("profiles").select("role").eq("id", currentUserId).maybeSingle();
    isAdmin = roleRow?.role === "admin";
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

  const viewer = { id: currentUserId, isAdmin };
  const [mapped] = await deliverReports([joined], viewer);
  const mediaAllowed = canViewReportMedia({
    publishStatus: data.publish_status,
    removedAt: data.removed_at,
    ownerId: data.created_by,
    viewerId: currentUserId,
    isAdmin,
  });
  const readyMedia = ((data.report_media ?? []) as ReportMedia[]).filter((item) => {
    return !item.upload_status || item.upload_status === "ready";
  });
  const media = await deliverStoredPhotoFields(readyMedia, mediaAllowed, {
    ownerId: data.created_by,
    reportId: data.id,
  });
  const [{ data: supports }, { count: supportCount }, { data: live }, followingReporter] = await Promise.all([
    currentUserId
      ? supabase.from("report_supports").select("id").eq("report_id", id).eq("user_id", currentUserId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("report_supports").select("*", { count: "exact", head: true }).eq("report_id", id),
    supabase.from("live_streams").select("started_at, ended_at").eq("report_id", id).maybeSingle(),
    currentUserId && currentUserId !== data.created_by
      ? supabaseIsFollowingReporter(currentUserId, data.created_by)
      : Promise.resolve(false),
  ]);

  return {
    report: mapped,
    description: joined.description,
    capturedAt: joined.captured_at,
    uploadedAt: joined.uploaded_at,
    location: toLocationSummary(location),
    requestId: joined.request_id,
    requestTitle: request?.title ?? one(joined.coverage_requests)?.title ?? null,
    media,
    licensingStatus: joined.licensing_status,
    reporterUsername: profile?.username ?? "reporter",
    reporterDisplayName: profile?.display_name ?? "Anonymous reporter",
    reporterAvatarUrl: profile?.avatar_url ?? null,
    reporterId: data.created_by,
    supportCount: supportCount ?? 0,
    currentUserSupported: Boolean(supports),
    followingReporter,
    recordedLive: Boolean(live) || Boolean(mapped.recordedLive),
    liveStartedAt: live?.started_at ?? null,
    liveEndedAt: live?.ended_at ?? null,
    removedAt: (joined as { removed_at?: string | null }).removed_at ?? null,
    publishStatus: data.publish_status,
    event: await supabaseLinkedEvent((data as { event_id?: string | null }).event_id),
    sensitiveContent: Boolean((data as { sensitive_content?: boolean }).sensitive_content),
  };
}

export async function supabaseGetRequestComposeContext(requestId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("coverage_requests")
    .select("id, title, location_id, event_id, removed_at, locations(place, city, country)")
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
    eventId: data.event_id,
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
  eventId?: string | null;
}) {
  const locationId = await supabaseFindOrCreateLocation(input.location);
  const eventId = await supabaseResolveEventId(input.eventId, locationId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coverage_requests")
    .insert({
      created_by: input.userId,
      location_id: locationId,
      event_id: eventId,
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
  if (!error) {
    try {
      const { supabaseDispatchHighInterestRequest } = await import("@/lib/data/supabase/notification-repository");
      await supabaseDispatchHighInterestRequest(requestId);
    } catch {
      // Demand notifications must not block supporting a request.
    }
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
  licensingStatus: "view_only" | "licensing_available";
  eventId?: string | null;
}) {
  let locationId = input.locationId;
  if (!locationId) {
    if (!input.location) {
      throw new Error("location");
    }
    locationId = await supabaseFindOrCreateLocation(input.location);
  }
  const eventId = await supabaseResolveEventId(input.eventId, locationId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .insert({
      created_by: input.userId,
      request_id: input.requestId,
      location_id: locationId,
      event_id: eventId,
      title: input.title,
      description: input.description,
      captured_at: input.capturedAt,
      licensing_status: input.licensingStatus,
      publish_status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Could not create the report draft.");
  }

  const { data: location } = await supabase
    .from("locations")
    .select("slug")
    .eq("id", locationId)
    .maybeSingle();

  return { id: data.id, locationSlug: location?.slug ?? null };
}

async function supabaseOwnedReport(reportId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("id, created_by, removed_at, licensing_status, captured_at, publish_status")
    .eq("id", reportId)
    .maybeSingle();
  if (!data || data.removed_at) {
    throw new Error("That report was not found.");
  }
  if (data.created_by !== userId) {
    throw new Error("You can only add media to your own report.");
  }
  return data;
}

async function supabaseOwnedMedia(mediaId: string, userId: string) {
  const supabase = await createClient();
  const { data: media } = await supabase.from("report_media").select("*").eq("id", mediaId).maybeSingle();
  if (!media) {
    throw new Error("That media was not found.");
  }
  await supabaseOwnedReport(media.report_id, userId);
  return media;
}

export async function supabaseCreateMediaSession(input: CreateMediaSessionInput): Promise<MediaUploadSession> {
  const report = await supabaseOwnedReport(input.reportId, input.userId);
  const supabase = await createClient();
  const provenance = uploadProvenanceFields(input.originalSha256);
  const backend = chooseRecordedMediaBackend({
    mediaType: input.mediaType,
    dataSource: getDataSource(),
    cloudflareStreamConfigured: isCloudflareStreamConfigured(),
  });
  if ("error" in backend) {
    logMediaStorageFailure(
      {
        operation: "chooseRecordedMediaBackend",
        reportId: input.reportId,
        mediaType: input.mediaType,
      },
      new Error(backend.error),
    );
    throw new Error(USER_UPLOAD_FAILED_MESSAGE);
  }
  if (backend.backend === "local") {
    logMediaStorageFailure(
      {
        operation: "supabaseCreateMediaSession",
        reportId: input.reportId,
        mediaType: input.mediaType,
      },
      new Error("local protocol is not allowed in supabase mode"),
    );
    throw new Error(USER_UPLOAD_FAILED_MESSAGE);
  }

  if (input.mediaType === "video" && backend.backend === "cloudflare-stream") {
    const created = preferTus(input.fileSize)
      ? await createCloudflareTusUpload({
          filename: input.filename,
          fileSize: input.fileSize,
          contentType: input.contentType,
          creatorId: input.userId,
          reportId: input.reportId,
        })
      : await createCloudflareBasicUpload({
          filename: input.filename,
          creatorId: input.userId,
          reportId: input.reportId,
        });
    const { data, error } = await supabase
      .from("report_media")
      .insert({
        report_id: report.id,
        media_type: "video",
        media_url: pendingMediaUrl("video", created.uid),
        thumbnail_url: null,
        original_filename: input.filename,
        captured_at: input.capturedAt || report.captured_at,
        licensing_status: input.licensingStatus,
        provider: "cloudflare-stream",
        provider_asset_id: created.uid,
        upload_status: "pending",
        ...provenance,
      })
      .select("id")
      .single();
    if (error || !data) {
      throw new Error(error?.message || USER_UPLOAD_FAILED_MESSAGE);
    }
    return {
      mediaId: data.id,
      protocol: preferTus(input.fileSize) ? "tus" : "basic",
      uploadUrl: created.uploadUrl,
      provider: "cloudflare-stream",
      providerAssetId: created.uid,
      contentType: input.contentType,
    };
  }

  let signed;
  try {
    signed = await createSupabaseImageUpload({
      userId: input.userId,
      reportId: input.reportId,
      filename: input.filename,
      contentType: input.contentType,
    });
  } catch (error) {
    logMediaStorageFailure(
      {
        operation: "createSupabaseImageUpload",
        reportId: input.reportId,
        mediaType: "photo",
      },
      error,
    );
    throw new Error(USER_UPLOAD_FAILED_MESSAGE);
  }

  const { data, error } = await supabase
    .from("report_media")
    .insert({
      report_id: report.id,
      media_type: "photo",
      media_url: signed.publicUrl,
      thumbnail_url: signed.publicUrl,
      original_filename: input.filename,
      captured_at: input.capturedAt || report.captured_at,
      licensing_status: input.licensingStatus,
      provider: "supabase-storage",
      provider_asset_id: signed.path,
      upload_status: "pending",
      ...provenance,
    })
    .select("id")
    .single();
  if (error || !data) {
    logMediaStorageFailure(
      {
        operation: "report_media.insert",
        reportId: input.reportId,
        mediaType: "photo",
      },
      error ?? new Error("empty insert"),
    );
    throw new Error(USER_UPLOAD_FAILED_MESSAGE);
  }
  return {
    mediaId: data.id,
    protocol: "supabase" as const,
    uploadUrl: signed.signedUrl,
    token: signed.token,
    path: signed.path,
    publicUrl: signed.publicUrl,
    provider: "supabase-storage" as const,
    providerAssetId: signed.path,
    contentType: signed.contentType,
  };
}

export async function supabaseCompleteLocalMedia(): Promise<{ reportId: string; mediaId: string }> {
  throw new Error("Local media storage is not available.");
}

export async function supabaseRefreshVideoStatus(userId: string, mediaId: string) {
  const media = await supabaseOwnedMedia(mediaId, userId);
  if (media.provider !== "cloudflare-stream" || !media.provider_asset_id) {
    return { uploadStatus: media.upload_status, mediaUrl: media.media_url, thumbnailUrl: media.thumbnail_url };
  }
  const status = await getCloudflareStreamVideo(media.provider_asset_id);
  const uploadStatus = status.failed ? "failed" : status.ready ? "ready" : "processing";
  const supabase = await createClient();
  const { error } = await supabase
    .from("report_media")
    .update({
      upload_status: uploadStatus,
      media_url: status.mediaUrl,
      thumbnail_url: status.thumbnailUrl,
    })
    .eq("id", mediaId);
  if (error) {
    throw new Error(error.message);
  }
  return { uploadStatus, mediaUrl: status.mediaUrl, thumbnailUrl: status.thumbnailUrl };
}

export async function supabaseMarkMediaStatus(
  userId: string,
  mediaId: string,
  status: "uploading" | "processing" | "failed",
) {
  await supabaseOwnedMedia(mediaId, userId);
  const supabase = await createClient();
  const { error } = await supabase.from("report_media").update({ upload_status: status }).eq("id", mediaId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function supabaseCompleteImageMedia(userId: string, mediaId: string) {
  const media = await supabaseOwnedMedia(mediaId, userId);
  if (media.provider !== "supabase-storage" || !media.provider_asset_id) {
    throw new Error(USER_UPLOAD_FAILED_MESSAGE);
  }
  const identity = reportMediaIdentityUrl(media.provider_asset_id);
  const storedHash = await hashSupabaseImageObject(media.provider_asset_id);
  if (!storedHash) {
    logMediaStorageFailure(
      {
        operation: "download",
        mediaId,
        reportId: media.report_id,
        mediaType: "photo",
      },
      new Error("storage object missing after upload"),
    );
    const supabase = await createClient();
    await supabase.from("report_media").update({ upload_status: "failed" }).eq("id", mediaId);
    throw new Error(USER_UPLOAD_FAILED_MESSAGE);
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("report_media")
    .update({
      media_url: identity,
      thumbnail_url: identity,
      upload_status: "ready",
      uploaded_at: new Date().toISOString(),
      original_sha256: storedHash,
    })
    .eq("id", mediaId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function supabasePublishReport(userId: string, reportId: string) {
  const report = await supabaseOwnedReport(reportId, userId);
  const supabase = await createClient();
  const { data: media, error } = await supabase.from("report_media").select("upload_status").eq("report_id", report.id);
  if (error) {
    throw new Error(error.message);
  }
  if (!media?.length || media.some((item) => item.upload_status !== "ready")) {
    throw new Error("Wait until every photo and video is ready before publishing.");
  }
  const { error: updateError } = await supabase
    .from("reports")
    .update({ publish_status: "published", uploaded_at: new Date().toISOString() })
    .eq("id", report.id);
  if (updateError) {
    throw new Error(updateError.message);
  }
  try {
    const { supabaseDispatchPublishedReport } = await import("@/lib/data/supabase/notification-repository");
    await supabaseDispatchPublishedReport(report.id);
  } catch {
    // Publishing still succeeds if the inbox write fails.
  }
  return report.id;
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
    .select(REPORT_FEED_SELECT)
    .eq("created_by", profile.id)
    .is("removed_at", null)
    .eq("publish_status", "published")
    .order("uploaded_at", { ascending: false });

  const rows = (reportRows ?? []) as ReportJoinRow[];
  const reports = await deliverReports(rows);
  const locationsById = new Map(
    rows.flatMap((row) => {
      const location = one(row.locations);
      return location ? [[location.id, location] as const] : [];
    }),
  );

  const extras = await loadReputationCounts(profile.id, reports.map((item) => item.id));
  const streams = await supabaseListPublicLiveStreams({ reporterId: profile.id, includeEnded: true });
  const { supabaseListPublicInvestigationsForReporter } = await import("@/lib/data/supabase/investigation-repository");
  const investigations = await supabaseListPublicInvestigationsForReporter(profile.id);
  return assembleReporterProfilePage(profile, reports, locationsById, {
    ...extras,
    liveNow: streams.filter((item) => item.status === "live"),
    pastLive: streams.filter((item) => item.status === "ended"),
    investigations,
  });
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
    content_type: ModerationContentType;
    content_id: string;
    reason: ModerationReason;
    details: string | null;
    created_at: string;
    status: ModerationStatus;
  },
  titles: Map<string, { title: string; removed: boolean }>,
  usernames: Map<string, string>,
  liveById: Map<
    string,
    {
      reporterId: string;
      reporterName: string;
      reporterUsername: string;
      reporterCanLiveStream: boolean;
      locationLabel: string;
      eventTitle: string | null;
      streamStatus: string;
    }
  >,
  reportCounts: Map<string, number>,
): ModerationQueueItem {
  const content = titles.get(`${item.content_type}:${item.content_id}`);
  const live = item.content_type === "live_stream" ? liveById.get(item.content_id) : undefined;
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
    liveStream: live
      ? {
          ...live,
          reportCount: reportCounts.get(`${item.content_type}:${item.content_id}`) ?? 0,
        }
      : undefined,
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
  if (
    input.contentType === "live_stream" &&
    !(LIVE_MODERATION_REASON_IDS as readonly string[]).includes(reason)
  ) {
    throw new Error("reason");
  }

  const supabase = await createClient();
  if (input.contentType === "live_stream") {
    const { data: content } = await supabase.from("live_streams").select("id").eq("id", input.contentId).maybeSingle();
    if (!content) {
      throw new Error("content");
    }
  } else {
    const table = input.contentType === "coverage_request" ? "coverage_requests" : "reports";
    const { data: content } = await supabase.from(table).select("id").eq("id", input.contentId).maybeSingle();
    if (!content) {
      throw new Error("content");
    }
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
  const liveIds = rows.filter((row) => row.content_type === "live_stream").map((row) => row.content_id);
  const submitterIds = [...new Set(rows.map((row) => row.submitted_by))];

  const [{ data: reports }, { data: requests }, { data: lives }, { data: profiles }] = await Promise.all([
    reportIds.length
      ? supabase.from("reports").select("id, title, removed_at").in("id", reportIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; removed_at: string | null }> }),
    requestIds.length
      ? supabase.from("coverage_requests").select("id, title, removed_at").in("id", requestIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; removed_at: string | null }> }),
    liveIds.length
      ? supabase
          .from("live_streams")
          .select("id, title, status, reporter_id, location_id, event_id")
          .in("id", liveIds)
      : Promise.resolve({
          data: [] as Array<{
            id: string;
            title: string;
            status: string;
            reporter_id: string;
            location_id: string;
            event_id: string | null;
          }>,
        }),
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
  for (const row of lives ?? []) {
    titles.set(`live_stream:${row.id}`, {
      title: row.title,
      removed: row.status === "terminated" || row.status === "failed",
    });
  }
  const usernames = new Map((profiles ?? []).map((row) => [row.id, row.username]));
  const liveRows = lives ?? [];
  const liveReporterIds = [...new Set(liveRows.map((row) => row.reporter_id))];
  const liveLocationIds = [...new Set(liveRows.map((row) => row.location_id))];
  const liveEventIds = [...new Set(liveRows.flatMap((row) => (row.event_id ? [row.event_id] : [])))];
  const [{ data: liveReporters }, { data: liveLocations }, { data: liveEvents }] = await Promise.all([
    liveReporterIds.length
      ? supabase.from("profiles").select("id, display_name, username, can_live_stream").in("id", liveReporterIds)
      : Promise.resolve({ data: [] as Array<{ id: string; display_name: string; username: string; can_live_stream: boolean }> }),
    liveLocationIds.length
      ? supabase.from("locations").select("*").in("id", liveLocationIds)
      : Promise.resolve({ data: [] as Location[] }),
    liveEventIds.length
      ? supabase.from("events").select("id, title").in("id", liveEventIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
  ]);
  const liveReporterById = new Map((liveReporters ?? []).map((item) => [item.id, item]));
  const liveLocationById = new Map((liveLocations ?? []).map((item) => [item.id, item]));
  const liveEventById = new Map((liveEvents ?? []).map((item) => [item.id, item.title]));
  const liveById = new Map<
    string,
    {
      reporterId: string;
      reporterName: string;
      reporterUsername: string;
      reporterCanLiveStream: boolean;
      locationLabel: string;
      eventTitle: string | null;
      streamStatus: string;
    }
  >();
  for (const row of liveRows) {
    const reporter = liveReporterById.get(row.reporter_id);
    const location = liveLocationById.get(row.location_id);
    if (!reporter || !location) {
      continue;
    }
    liveById.set(row.id, {
      reporterId: reporter.id,
      reporterName: reporter.display_name,
      reporterUsername: reporter.username,
      reporterCanLiveStream: reporter.can_live_stream !== false,
      locationLabel: toLocationSummary(location).label,
      eventTitle: row.event_id ? liveEventById.get(row.event_id) ?? null : null,
      streamStatus: row.status,
    });
  }
  const reportCounts = new Map<string, number>();
  for (const row of rows) {
    const key = `${row.content_type}:${row.content_id}`;
    reportCounts.set(key, (reportCounts.get(key) ?? 0) + 1);
  }

  return rows.map((row) => toSupabaseQueueItem(row, titles, usernames, liveById, reportCounts));
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
  } else if (item.content_type === "live_stream") {
    await supabaseTerminateLiveStream(item.content_id);
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

function isUniqueViolation(error: { code?: string } | null) {
  return error?.code === "23505";
}

export async function supabaseIsFollowingReporter(followerId: string, reporterId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_follows")
    .select("id")
    .eq("follower_id", followerId)
    .eq("following_id", reporterId)
    .maybeSingle();
  return Boolean(data);
}

export async function supabaseFollowReporter(followerId: string, reporterId: string) {
  if (followerId === reporterId) {
    throw new Error("You cannot follow yourself.");
  }
  const supabase = await createClient();
  const { error } = await supabase.from("profile_follows").insert({
    follower_id: followerId,
    following_id: reporterId,
  });
  if (error && !isUniqueViolation(error)) {
    throw new Error(error.message);
  }
}

export async function supabaseUnfollowReporter(followerId: string, reporterId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profile_follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", reporterId);
  if (error) {
    throw new Error(error.message);
  }
}

async function supabaseResolveGeoFollowLocationId(target: GeoFollowTarget, createIfMissing: boolean) {
  const supabase = await createClient();
  if (target.kind === "place") {
    return target.locationId ?? null;
  }

  const { data: existing } = await supabase.from("locations").select("*").eq("country", target.country);
  const match = findGeoFollowLocation(existing ?? [], target);
  if (match) {
    return match.id;
  }
  if (!createIfMissing) {
    return null;
  }

  const { data: allSlugs } = await supabase.from("locations").select("slug");
  const taken = new Set((allSlugs ?? []).map((row) => row.slug));
  const slug = nextLocationSlug(geoFollowSlugBase(target), taken);
  const fields = geoFollowInsertFields(target, slug);
  const { data, error } = await supabase.from("locations").insert(fields).select("id").single();
  if (error || !data) {
    throw new Error(error?.message || "Could not save this location.");
  }
  return data.id;
}

export async function supabaseIsFollowingLocation(userId: string, target: GeoFollowTarget) {
  const locationId = await supabaseResolveGeoFollowLocationId(target, false);
  if (!locationId) {
    return false;
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("location_follows")
    .select("id")
    .eq("user_id", userId)
    .eq("location_id", locationId)
    .maybeSingle();
  return Boolean(data);
}

export async function supabaseFollowLocation(userId: string, target: GeoFollowTarget) {
  const locationId = await supabaseResolveGeoFollowLocationId(target, true);
  if (!locationId) {
    throw new Error("That location was not found.");
  }
  const supabase = await createClient();
  const { error } = await supabase.from("location_follows").insert({
    user_id: userId,
    location_id: locationId,
  });
  if (error && !isUniqueViolation(error)) {
    throw new Error(error.message);
  }
}

export async function supabaseUnfollowLocation(userId: string, target: GeoFollowTarget) {
  const locationId = await supabaseResolveGeoFollowLocationId(target, false);
  if (!locationId) {
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("location_follows")
    .delete()
    .eq("user_id", userId)
    .eq("location_id", locationId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function supabaseIsFollowingInvestigation(userId: string, investigationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("investigation_follows")
    .select("id")
    .eq("user_id", userId)
    .eq("investigation_id", investigationId)
    .maybeSingle();
  return Boolean(data);
}

export async function supabaseFollowInvestigation(userId: string, investigationId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("investigation_follows").insert({
    user_id: userId,
    investigation_id: investigationId,
  });
  if (error && !isUniqueViolation(error)) {
    throw new Error(error.message);
  }
}

export async function supabaseUnfollowInvestigation(userId: string, investigationId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("investigation_follows")
    .delete()
    .eq("user_id", userId)
    .eq("investigation_id", investigationId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function supabaseGetFollowingFeed(
  userId: string,
  before?: string | null,
  excludeReportIds?: Iterable<string>,
): Promise<{ items: YourWorldItem[]; hasMore: boolean }> {
  const supabase = await createClient();
  const graph = await supabaseGetFollowGraph(userId);
  const { data: reportRows } = await supabase
    .from("reports")
    .select(`${REPORT_FEED_SELECT}, created_by`)
    .is("removed_at", null)
    .eq("publish_status", "published")
    .order("uploaded_at", { ascending: false })
    .limit(200);

  const reportIds = ((reportRows ?? []) as Array<ReportJoinRow & { created_by: string }>).map((row) => row.id);
  const { data: itemRows } = reportIds.length
    ? await supabase
        .from("investigation_items")
        .select("investigation_id, report_id, position, investigations(id, title, slug, status, removed_at, reporter_id, profiles(username))")
        .in("report_id", reportIds)
    : { data: [] };

  const investigationByReport = new Map<
    string,
    { investigationId: string; title: string; href: string; position: number }
  >();
  for (const row of itemRows ?? []) {
    const investigation = Array.isArray(row.investigations) ? row.investigations[0] : row.investigations;
    if (!investigation || investigation.removed_at || investigation.status !== "published" || !row.report_id) {
      continue;
    }
    const profile = Array.isArray(investigation.profiles) ? investigation.profiles[0] : investigation.profiles;
    investigationByReport.set(row.report_id, {
      investigationId: investigation.id,
      title: investigation.title,
      href: `/u/${profile?.username ?? "reporter"}/investigations/${investigation.slug}`,
      position: row.position,
    });
  }

  const joinRows = (reportRows ?? []) as Array<ReportJoinRow & { created_by: string }>;
  const delivered = await deliverReports(joinRows);
  const rows = joinRows.flatMap((row, index) => {
    const location = one(row.locations);
    if (!location) {
      return [];
    }
    return [
      {
        report: delivered[index]!,
        createdBy: row.created_by,
        location: toLocationSummary(location),
        investigation: investigationByReport.get(row.id) ?? null,
      },
    ];
  });

  return assembleYourWorldFeed({
    followedReporterIds: new Set(graph.reporterIds),
    followedLocations: graph.locations,
    followedInvestigationIds: new Set(graph.investigationIds),
    rows,
    before,
    excludeReportIds: excludeReportIds ? new Set(excludeReportIds) : undefined,
  });
}

export async function supabaseGetFollowGraph(userId: string) {
  const supabase = await createClient();
  const [{ data: reporterFollows }, { data: locationFollowRows }, { data: investigationFollowRows }] = await Promise.all([
    supabase.from("profile_follows").select("following_id").eq("follower_id", userId),
    supabase.from("location_follows").select("location_id").eq("user_id", userId),
    supabase.from("investigation_follows").select("investigation_id").eq("user_id", userId),
  ]);
  const followLocationIds = [...new Set((locationFollowRows ?? []).map((item) => item.location_id))];
  const investigationIds = (investigationFollowRows ?? []).map((item) => item.investigation_id);
  const [{ data: followedLocationRows }, { data: investigationItems }] = await Promise.all([
    followLocationIds.length
      ? supabase.from("locations").select("*").in("id", followLocationIds)
      : Promise.resolve({ data: [] }),
    investigationIds.length
      ? supabase.from("investigation_items").select("live_stream_id, report_id").in("investigation_id", investigationIds)
      : Promise.resolve({ data: [] }),
  ]);
  return {
    reporterIds: (reporterFollows ?? []).map((item) => item.following_id),
    locations: (followedLocationRows ?? []).map(toLocationSummary),
    investigationIds,
    investigationLiveStreamIds: (investigationItems ?? []).flatMap((item) =>
      item.live_stream_id ? [item.live_stream_id] : [],
    ),
    investigationReportIds: (investigationItems ?? []).flatMap((item) => (item.report_id ? [item.report_id] : [])),
  };
}

export async function supabaseSupportReport(reportId: string, userId: string) {
  const supabase = await createClient();
  const { data: report } = await supabase
    .from("reports")
    .select("id, created_by, removed_at, publish_status")
    .eq("id", reportId)
    .maybeSingle();
  if (!report || report.removed_at || report.publish_status !== "published") {
    throw new Error("That report was not found.");
  }
  if (report.created_by === userId) {
    throw new Error("You cannot support your own reporting.");
  }
  const { error } = await supabase.from("report_supports").insert({
    report_id: reportId,
    user_id: userId,
  });
  if (error && !isUniqueViolation(error)) {
    throw new Error(error.message);
  }
}

export async function supabaseRemoveReportSupport(reportId: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("report_supports").delete().eq("report_id", reportId).eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function supabaseCreateLicensingInquiry(input: {
  userId: string;
  reportId: string;
  mediaId: string | null;
  organizationName: string;
  contactEmail: string;
  intendedUse: string;
  message: string;
}) {
  const supabase = await createClient();
  const { data: report } = await supabase
    .from("reports")
    .select("id, created_by, licensing_status, removed_at, publish_status")
    .eq("id", input.reportId)
    .maybeSingle();
  if (
    !report ||
    report.removed_at ||
    report.publish_status !== "published" ||
    report.licensing_status !== "licensing_available"
  ) {
    throw new Error("This report is not available for licensing.");
  }
  if (report.created_by === input.userId) {
    throw new Error("You cannot inquire about licensing your own media.");
  }
  if (input.mediaId) {
    const { data: media } = await supabase
      .from("report_media")
      .select("id")
      .eq("id", input.mediaId)
      .eq("report_id", report.id)
      .maybeSingle();
    if (!media) {
      throw new Error("That media is not part of this report.");
    }
  }
  const { data, error } = await supabase
    .from("licensing_transactions")
    .insert({
      report_id: input.reportId,
      report_media_id: input.mediaId,
      licensee_profile_id: input.userId,
      reporter_id: report.created_by,
      organization_name: input.organizationName,
      contact_email: input.contactEmail,
      intended_use: input.intendedUse,
      message: input.message,
      status: "inquiry",
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(error?.message || "Could not submit this licensing inquiry.");
  }
  try {
    const { supabaseDispatchLicensingInquiry } = await import("@/lib/data/supabase/notification-repository");
    await supabaseDispatchLicensingInquiry({
      actorId: input.userId,
      reporterId: report.created_by,
      reportId: input.reportId,
      organizationName: input.organizationName,
    });
  } catch {
    // Inquiry is stored even if the inbox write fails.
  }
  return data.id;
}

export async function supabaseListLicensingInbox(userId: string): Promise<LicensingInboxItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("licensing_transactions")
    .select("*")
    .eq("reporter_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  const rows = data ?? [];
  const reportIds = [...new Set(rows.map((row) => row.report_id))];
  const mediaIds = [...new Set(rows.map((row) => row.report_media_id).filter((id): id is string => Boolean(id)))];
  const licenseeIds = [...new Set(rows.map((row) => row.licensee_profile_id).filter((id): id is string => Boolean(id)))];

  const [{ data: reports }, { data: media }, { data: profiles }] = await Promise.all([
    reportIds.length ? supabase.from("reports").select("id, title").in("id", reportIds) : Promise.resolve({ data: [] }),
    mediaIds.length
      ? supabase.from("report_media").select("id, media_type, original_filename").in("id", mediaIds)
      : Promise.resolve({ data: [] }),
    licenseeIds.length
      ? supabase.from("profiles").select("id, display_name").in("id", licenseeIds)
      : Promise.resolve({ data: [] }),
  ]);

  const reportTitles = new Map((reports ?? []).map((row) => [row.id, row.title]));
  const mediaById = new Map((media ?? []).map((row) => [row.id, row]));
  const names = new Map((profiles ?? []).map((row) => [row.id, row.display_name]));

  return rows.map((item) => {
    const mediaRow = item.report_media_id ? mediaById.get(item.report_media_id) : undefined;
    return {
      id: item.id,
      createdAt: item.created_at,
      status: normalizeInquiryStatus(item.status),
      organizationName: item.organization_name ?? names.get(item.licensee_profile_id ?? "") ?? "Unknown requester",
      contactEmail: item.contact_email ?? "",
      intendedUse: item.intended_use ?? "",
      message: item.message ?? "",
      reportId: item.report_id,
      reportTitle: reportTitles.get(item.report_id) ?? "Unknown report",
      mediaId: item.report_media_id,
      mediaLabel: mediaRow?.original_filename || (mediaRow?.media_type === "video" ? "Video" : mediaRow ? "Photo" : "Whole report"),
      requesterName: names.get(item.licensee_profile_id ?? "") ?? item.organization_name ?? "Requester",
    };
  });
}

export async function supabaseUpdateLicensingInquiryStatus(
  userId: string,
  inquiryId: string,
  status: LicensingInquiryStatus,
) {
  if (!isLicensingInquiryStatus(status)) {
    throw new Error("That status is not available.");
  }
  const supabase = await createClient();
  const { data: inquiry } = await supabase
    .from("licensing_transactions")
    .select("id, reporter_id")
    .eq("id", inquiryId)
    .maybeSingle();
  if (!inquiry || inquiry.reporter_id !== userId) {
    throw new Error("Only the creator can update this inquiry.");
  }
  const { error } = await supabase.from("licensing_transactions").update({ status }).eq("id", inquiryId);
  if (error) {
    throw new Error(error.message);
  }
  try {
    const { supabaseDispatchLicensingStatusChange } = await import("@/lib/data/supabase/notification-repository");
    await supabaseDispatchLicensingStatusChange({ actorId: userId, inquiryId, status });
  } catch {
    // Status is stored even if the inbox write fails.
  }
}

async function supabaseLinkedEvent(eventId: string | null | undefined) {
  if (!eventId) {
    return null;
  }
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("id, title").eq("id", eventId).maybeSingle();
  return data ? { id: data.id, title: data.title } : null;
}

async function supabaseResolveEventId(eventId: string | null | undefined, locationId: string) {
  if (!eventId) {
    return null;
  }
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
  assertEventAttachable((data as EventRecord | null) ?? null, locationId);
  return eventId;
}

export async function supabaseListActiveEvents(locationIds?: string[]): Promise<EventSummary[]> {
  const supabase = await createClient();
  let query = supabase.from("events").select("*, locations(*)").eq("status", "active").order("started_at", { ascending: false });
  if (locationIds && locationIds.length > 0) {
    query = query.in("location_id", locationIds);
  } else if (locationIds && locationIds.length === 0) {
    return [];
  }
  const { data: eventRows } = await query;
  const events = (eventRows ?? []) as Array<EventRecord & { locations: Location | Location[] | null }>;
  if (events.length === 0) {
    return [];
  }
  const eventIds = events.map((item) => item.id);
  const [{ data: reports }, { data: requests }] = await Promise.all([
    supabase.from("reports").select("id, event_id, created_by, removed_at").in("event_id", eventIds).is("removed_at", null).eq("publish_status", "published"),
    supabase.from("coverage_requests").select("id, event_id, status, removed_at").in("event_id", eventIds).is("removed_at", null),
  ]);
  const locations = events.flatMap((item) => {
    const location = one(item.locations);
    return location ? [location as Location] : [];
  });
  return activeEventSummaries(events, locations, reports ?? [], requests ?? []);
}

export async function supabaseListActiveEventsAtLocation(location: StructuredLocation): Promise<EventSummary[]> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("locations")
    .select("*")
    .eq("city", location.city)
    .eq("country", location.country);
  const match = findMatchingLocation(existing ?? [], location);
  if (!match) {
    return [];
  }
  return supabaseListActiveEvents([match.id]);
}

export async function supabaseGetEventPage(id: string, currentUserId?: string | null): Promise<EventPageData | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("*, locations(*)").eq("id", id).maybeSingle();
  if (!data) {
    return null;
  }
  const event = data as EventRecord & { locations: Location | Location[] | null };
  const location = one(event.locations) as Location | null;
  if (!location) {
    return null;
  }

  const [{ data: reportRows }, { data: requestRows }] = await Promise.all([
    supabase
      .from("reports")
      .select(`${REPORT_FEED_SELECT}, created_by, event_id`)
      .eq("event_id", id)
      .is("removed_at", null)
      .eq("publish_status", "published")
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("coverage_requests")
      .select("id, title, description, created_at, status, created_by, location_id, event_id, locations(*), request_interests(id, user_id)")
      .eq("event_id", id)
      .is("removed_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const reports = await deliverReports((reportRows ?? []) as ReportJoinRow[]);
  const requests = ((requestRows ?? []) as RequestJoinRow[]).map((row) => toCoverageRequest(row, currentUserId));
  const reporterMap = new Map<string, EventReporter>();
  for (const row of reportRows ?? []) {
    const profile = one((row as { profiles?: { username: string; display_name: string; avatar_url: string | null } | { username: string; display_name: string; avatar_url: string | null }[] | null }).profiles);
    const createdBy = (row as { created_by?: string }).created_by;
    if (!profile || !createdBy || reporterMap.has(createdBy)) {
      continue;
    }
    reporterMap.set(createdBy, {
      id: createdBy,
      username: profile.username,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
    });
  }

  const timeline = [
    ...reports.map((report) => ({ kind: "report" as const, at: report.capturedAt || report.publishedAt, report })),
    ...requests.map((request) => ({ kind: "request" as const, at: request.createdAt, request })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return {
    event: toEventSummary(event, location, (reportRows ?? []) as { event_id?: string | null; created_by: string; removed_at?: string | null }[], requestRows ?? []),
    reports,
    requests: requests.filter((item) => item.status === "open"),
    reporters: [...reporterMap.values()],
    timeline,
    liveStreams: await supabaseListPublicLiveStreams({ eventId: id }),
  };
}

export async function supabaseCreateEvent(input: {
  userId: string;
  title: string;
  description: string | null;
  startedAt: string;
  location: StructuredLocation;
}) {
  const locationId = await supabaseFindOrCreateLocation(input.location);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .insert({
      created_by: input.userId,
      location_id: locationId,
      title: input.title,
      description: input.description,
      status: "active",
      started_at: input.startedAt,
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(error?.message || "Could not create the event.");
  }
  return data.id;
}

export async function supabaseIsUsernameAvailable(username: string, excludeUserId?: string) {
  const supabase = await createClient();
  let query = supabase.from("profiles").select("id").eq("username", username);
  if (excludeUserId) {
    query = query.neq("id", excludeUserId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return !data;
}

export async function supabaseUpdateReporterProfile(
  userId: string,
  patch: import("@/lib/profile").ReporterProfilePatch,
) {
  const taken = !(await supabaseIsUsernameAvailable(patch.username, userId));
  if (taken) {
    throw new Error("username-taken");
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      username: patch.username,
      display_name: patch.displayName,
      bio: patch.bio,
      home_city: patch.homeCity,
      home_country: patch.homeCountry,
      topics: patch.topics,
    })
    .eq("id", userId)
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new Error("username-taken");
    }
    throw new Error(error.message);
  }
  return data;
}

export async function supabaseSetReporterAvatar(
  userId: string,
  file: { bytes: Uint8Array; filename: string; contentType: string; size: number } | null,
) {
  const current = await supabaseGetProfileByUserId(userId);
  if (!current) {
    throw new Error("profile");
  }
  if (!file) {
    await removeSupabaseReporterAvatar(userId, current.avatar_url);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", userId)
      .select("*")
      .single();
    if (error || !data) {
      throw new Error(error?.message || "Could not remove the profile photo.");
    }
    return data;
  }
  const publicUrl = await uploadSupabaseReporterAvatar({
    userId,
    bytes: file.bytes,
    filename: file.filename,
    contentType: file.contentType,
    previousUrl: current.avatar_url,
  });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", userId)
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(error?.message || "Could not save the profile photo.");
  }
  return data;
}
