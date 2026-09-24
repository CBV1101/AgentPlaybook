import { randomUUID } from "node:crypto";
import type { AppUser } from "@/lib/auth-user";
import { findMatchingLocation, nextLocationSlug, slugForLocation } from "@/lib/data/locations";
import { toCoverageRequest, toLocationSummary, toReport } from "@/lib/data/mappers";
import {
  mockListPublicLiveStreams,
  mockLiveLocationIds,
  applyLiveTermination,
} from "@/lib/data/mock/live-repository";
import { getMockUser } from "@/lib/data/mock/session";
import {
  applyReporterAvatarFile,
  applyReporterAvatarRemoval,
  applyReporterProfileUpdate,
  mockUsernameTaken,
} from "@/lib/data/mock/profile";
import { readMockDatabase, updateMockDatabase, writeMockDatabase } from "@/lib/data/mock/store";
import { writeLocalMediaFile } from "@/lib/media/local";
import { pendingMediaUrl } from "@/lib/media/status";
import { sha256Hex } from "@/lib/media/hash";
import { uploadProvenanceFields } from "@/lib/media/provenance";
import type { CreateMediaSessionInput, MediaUploadSession } from "@/lib/media/types";
import type { StructuredLocation } from "@/lib/location";
import type { ReporterProfilePatch } from "@/lib/profile";
import { assembleReporterProfilePage } from "@/lib/data/reporter";
import { type DiscoveryPlace } from "@/lib/data/discovery";
import {
  buildGeographyIndex,
  locationsInCity,
  locationsInCountry,
  searchGeographyHits,
  type CityPageData,
  type CountryPageData,
  type GeographySearchHit,
} from "@/lib/data/geography";
import { findGeoFollowLocation, geoFollowInsertFields, geoFollowSlugBase } from "@/lib/data/geo-follow";
import { assembleFollowingFeed, type FollowingFeedItem, type GeoFollowTarget } from "@/lib/follows";
import {
  isLicensingInquiryStatus,
  normalizeInquiryStatus,
  type LicensingInboxItem,
  type LicensingInquiryStatus,
} from "@/lib/licensing";
import { hashPassword } from "@/lib/data/mock/seed";
import { homepageCoverageWanted } from "@/lib/coverage-wanted";
import { activeEventSummaries, toEventSummary } from "@/lib/data/events";
import { citySlug } from "@/lib/geo";
import { assertEventAttachable } from "@/lib/events";
import type { EventPageData, EventReporter, EventSummary, LocationSummary } from "@/lib/types";
import {
  contentPath,
  LIVE_MODERATION_REASON_IDS,
  MODERATION_REASONS,
  type ModerationContentType,
  type ModerationQueueItem,
  type ModerationStatus,
} from "@/lib/moderation";

function isVisible(row: { removed_at?: string | null }) {
  return !row.removed_at;
}

function isPublicReport(row: { removed_at?: string | null; publish_status?: string | null }) {
  return !row.removed_at && row.publish_status !== "draft";
}

function mockListActiveEventSummaries(locationIds?: Set<string>): EventSummary[] {
  const database = readMockDatabase();
  return activeEventSummaries(
    database.events ?? [],
    database.locations,
    database.reports,
    database.coverage_requests,
    locationIds,
  );
}

function mockLinkedEvent(eventId: string | null | undefined) {
  if (!eventId) {
    return null;
  }
  const database = readMockDatabase();
  const event = (database.events ?? []).find((item) => item.id === eventId);
  return event ? { id: event.id, title: event.title } : null;
}

function mockResolveEventId(eventId: string | null | undefined, locationId: string) {
  if (!eventId) {
    return null;
  }
  const event = (readMockDatabase().events ?? []).find((item) => item.id === eventId) ?? null;
  assertEventAttachable(event, locationId);
  return eventId;
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

export async function mockGetHomeFeed(currentUserId?: string | null) {
  const database = readMockDatabase();
  const wanted = mockOpenCoverageWanted(currentUserId);
  const reports = [...database.reports]
    .filter(isPublicReport)
    .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))
    .slice(0, 8)
    .map((item) => toReport(joinReport(database, item.id)!));

  return {
    source: "mock" as const,
    requests: homepageCoverageWanted(wanted, 8),
    reports,
    places: mockDiscoveryPlaces(),
    activeEvents: mockListActiveEventSummaries(),
    liveStreams: mockListPublicLiveStreams().filter((item) => item.status === "live"),
  };
}

export async function mockListOpenCoverageWanted(currentUserId?: string | null) {
  return mockOpenCoverageWanted(currentUserId);
}

function mockOpenCoverageWanted(currentUserId?: string | null) {
  const database = readMockDatabase();
  const responseCounts = new Map<string, number>();
  for (const report of database.reports) {
    if (!isPublicReport(report) || !report.request_id) {
      continue;
    }
    responseCounts.set(report.request_id, (responseCounts.get(report.request_id) ?? 0) + 1);
  }
  return database.coverage_requests
    .filter((item) => item.status === "open" && isVisible(item))
    .map((item) =>
      toCoverageRequest(joinRequest(database, item.id)!, currentUserId, responseCounts.get(item.id) ?? 0),
    );
}

export function mockDiscoveryPlaces(): DiscoveryPlace[] {
  return mockGeographyIndex().places;
}

function mockGeographyIndex() {
  const database = readMockDatabase();
  return buildGeographyIndex({
    locations: database.locations.map(toLocationSummary),
    reports: database.reports.filter(isPublicReport).map((item) => ({ locationId: item.location_id })),
    openRequestLocationIds: database.coverage_requests
      .filter((item) => item.status === "open" && isVisible(item))
      .map((item) => item.location_id),
    liveLocationIds: mockLiveLocationIds(),
  });
}

export async function mockSearchLocations(query: string): Promise<DiscoveryPlace[]> {
  const needle = query.trim().toLowerCase();
  const places = mockDiscoveryPlaces();
  if (!needle) {
    return places;
  }
  return places.filter((place) =>
    [place.label, place.place, place.city, place.country].filter(Boolean).join(" ").toLowerCase().includes(needle),
  );
}

export async function mockSearchGeography(query: string): Promise<GeographySearchHit[]> {
  return searchGeographyHits(mockGeographyIndex(), query);
}

export async function mockGetBrowseOverview() {
  const index = mockGeographyIndex();
  return {
    countries: index.countries,
    cities: index.cities,
    places: index.places.filter((place) => place.place).slice(0, 12),
  };
}

export async function mockGetCountryPage(slug: string, currentUserId?: string | null): Promise<CountryPageData | null> {
  const database = readMockDatabase();
  const locations = locationsInCountry(database.locations.map(toLocationSummary), slug);
  if (locations.length === 0) {
    return null;
  }
  const index = mockGeographyIndex();
  const country = index.countries.find((item) => item.slug === slug);
  if (!country) {
    return null;
  }
  const locationIds = new Set(locations.map((item) => item.id));
  return {
    country,
    cities: index.cities.filter((city) => city.countrySlug === slug),
    latestReports: reportsForLocations(database, locationIds).slice(0, 8),
    mostRequested: requestsForLocations(database, locationIds, currentUserId).slice(0, 8),
    activeEvents: mockListActiveEventSummaries(locationIds),
    liveStreams: mockListPublicLiveStreams({ locationIds: [...locationIds] }).filter((item) => item.status === "live"),
  };
}

export async function mockGetCityPage(slug: string, currentUserId?: string | null): Promise<CityPageData | null> {
  const database = readMockDatabase();
  const locations = locationsInCity(database.locations.map(toLocationSummary), slug);
  if (locations.length === 0) {
    return null;
  }
  const index = mockGeographyIndex();
  const city = index.cities.find((item) => item.slug === slug);
  if (!city) {
    return null;
  }
  const locationIds = new Set(locations.map((item) => item.id));
  const openRequests = requestsForLocations(database, locationIds, currentUserId);
  const mapPlaces = index.places.filter((place) => citySlug(place.city, place.country) === slug);
  return {
    city,
    places: mapPlaces.filter((place) => place.place),
    mapPlaces,
    latestReports: reportsForLocations(database, locationIds).slice(0, 8),
    mostRequested: openRequests.slice(0, 8),
    openRequests,
    activeEvents: mockListActiveEventSummaries(locationIds),
    liveStreams: mockListPublicLiveStreams({ locationIds: [...locationIds] }).filter((item) => item.status === "live"),
  };
}

function reportsForLocations(
  database: ReturnType<typeof readMockDatabase>,
  locationIds: Set<string>,
) {
  return [...database.reports]
    .filter((item) => isPublicReport(item) && locationIds.has(item.location_id))
    .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))
    .map((item) => toReport(joinReport(database, item.id)!));
}

function requestsForLocations(
  database: ReturnType<typeof readMockDatabase>,
  locationIds: Set<string>,
  currentUserId?: string | null,
) {
  return database.coverage_requests
    .filter((item) => item.status === "open" && isVisible(item) && locationIds.has(item.location_id))
    .map((item) => toCoverageRequest(joinRequest(database, item.id)!, currentUserId))
    .sort((a, b) => b.supporterCount - a.supporterCount || b.createdAt.localeCompare(a.createdAt));
}

export async function mockSearchCoverage(query: string, currentUserId?: string | null) {
  const database = readMockDatabase();
  const needle = query.trim().toLowerCase();
  const requests = database.coverage_requests
    .filter((item) => item.status === "open" && isVisible(item))
    .map((item) => toCoverageRequest(joinRequest(database, item.id)!, currentUserId))
    .filter((item) =>
      !needle
        ? true
        : item.title.toLowerCase().includes(needle) || item.location.toLowerCase().includes(needle),
    )
    .sort((a, b) => b.supporterCount - a.supporterCount || b.createdAt.localeCompare(a.createdAt));
  const reports = database.reports
    .filter(isPublicReport)
    .map((item) => toReport(joinReport(database, item.id)!))
    .filter((item) =>
      !needle
        ? true
        : item.title.toLowerCase().includes(needle) ||
          item.location.toLowerCase().includes(needle) ||
          item.excerpt.toLowerCase().includes(needle),
    )
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  return {
    source: "mock" as const,
    requests: needle ? requests : requests.slice(0, 12),
    reports: needle ? reports : reports.slice(0, 12),
    places: await mockSearchLocations(query),
  };
}

export async function mockGetLocationBySlug(slug: string): Promise<LocationSummary | null> {
  const location = readMockDatabase().locations.find((item) => item.slug === slug);
  return location ? toLocationSummary(location) : null;
}

export async function mockGetLocationById(id: string): Promise<LocationSummary | null> {
  const location = readMockDatabase().locations.find((item) => item.id === id);
  return location ? toLocationSummary(location) : null;
}

export async function mockGetPlacePageData(slug: string, currentUserId?: string | null) {
  const database = readMockDatabase();
  const location = database.locations.find((item) => item.slug === slug);
  if (!location || !location.place) {
    return null;
  }

  const requests = database.coverage_requests
    .filter((item) => item.location_id === location.id && isVisible(item))
    .map((item) => toCoverageRequest(joinRequest(database, item.id)!, currentUserId));
  const supportByRequest = new Map(requests.map((item) => [item.id, item.supporterCount]));
  const reports = database.reports
    .filter((item) => item.location_id === location.id && isPublicReport(item))
    .map((item) => {
      const report = toReport(joinReport(database, item.id)!);
      return {
        ...report,
        requestSupporterCount: item.request_id ? (supportByRequest.get(item.request_id) ?? 0) : 0,
      };
    });

  return {
    location: toLocationSummary(location),
    openRequests: requests.filter((item) => item.status === "open"),
    reports,
    reportCount: reports.length,
    openRequestCount: requests.filter((item) => item.status === "open").length,
    activeEvents: mockListActiveEventSummaries(new Set([location.id])),
    liveStreams: mockListPublicLiveStreams({ locationIds: [location.id] }).filter((item) => item.status === "live"),
  };
}

export async function mockGetCoverageRequestPage(id: string, currentUserId?: string | null) {
  const database = readMockDatabase();
  const joined = joinRequest(database, id);
  if (!joined?.locations) {
    return null;
  }

  const reports = database.reports
    .filter((item) => item.request_id === id && isPublicReport(item))
    .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))
    .map((item) => toReport(joinReport(database, item.id)!));

  return {
    request: {
      ...toCoverageRequest(joined, currentUserId),
      description: joined.description,
    },
    removedAt: joined.removed_at,
    location: toLocationSummary(joined.locations),
    reports,
    interestedUserIds: joined.request_interests.map((item) => item.user_id),
    currentUserId: currentUserId ?? null,
    event: mockLinkedEvent(joined.event_id),
    liveStreams: mockListPublicLiveStreams({ requestId: id }).filter((item) => item.status === "live"),
  };
}

export async function mockGetReportPage(id: string, currentUserId?: string | null) {
  const database = readMockDatabase();
  const joined = joinReport(database, id);
  if (!joined?.locations) {
    return null;
  }
  const isAdmin = database.profiles.find((item) => item.id === currentUserId)?.role === "admin";
  if (!isPublicReport(joined) && joined.created_by !== currentUserId && !isAdmin) {
    return null;
  }

  const request = joined.request_id
    ? database.coverage_requests.find((item) => item.id === joined.request_id)
    : null;
  const profile = database.profiles.find((item) => item.id === joined.created_by);
  const mapped = toReport(joined);
  const live = (database.live_streams ?? []).find((item) => item.report_id === id);
  const followingReporter = Boolean(
    currentUserId && currentUserId !== joined.created_by
      ? await mockIsFollowingReporter(currentUserId, joined.created_by)
      : false,
  );

  return {
    report: mapped,
    description: joined.description,
    capturedAt: joined.captured_at,
    uploadedAt: joined.uploaded_at,
    location: toLocationSummary(joined.locations),
    requestId: joined.request_id,
    requestTitle: request?.title ?? null,
    media: joined.report_media.filter((item) => item.upload_status === "ready"),
    licensingStatus: joined.licensing_status,
    reporterUsername: profile?.username ?? joined.profiles?.username ?? "reporter",
    reporterDisplayName:
      profile?.display_name ?? joined.profiles?.display_name ?? "Anonymous reporter",
    reporterAvatarUrl: profile?.avatar_url ?? joined.profiles?.avatar_url ?? null,
    reporterId: joined.created_by,
    supportCount: database.report_supports.filter((item) => item.report_id === id).length,
    currentUserSupported: Boolean(
      currentUserId &&
        database.report_supports.some((item) => item.report_id === id && item.user_id === currentUserId),
    ),
    followingReporter,
    recordedLive: Boolean(live) || Boolean(mapped.recordedLive),
    liveStartedAt: live?.started_at ?? null,
    liveEndedAt: live?.ended_at ?? null,
    removedAt: joined.removed_at,
    publishStatus: joined.publish_status ?? "published",
    event: mockLinkedEvent(joined.event_id),
    sensitiveContent: Boolean(joined.sensitive_content),
  };
}

export async function mockGetRequestComposeContext(requestId: string) {
  const joined = joinRequest(readMockDatabase(), requestId);
  if (!joined?.locations || !isVisible(joined)) {
    return null;
  }
  return {
    id: joined.id,
    title: joined.title,
    locationId: joined.location_id,
    locationLabel: toLocationSummary(joined.locations).label,
    eventId: joined.event_id,
  };
}

export async function mockFindOrCreateLocation(location: StructuredLocation) {
  const database = readMockDatabase();
  const match = findMatchingLocation(database.locations, location);
  if (match) {
    return match.id;
  }

  const id = randomUUID();
  const slug = nextLocationSlug(
    slugForLocation(location),
    new Set(database.locations.map((item) => item.slug)),
  );
  const now = new Date().toISOString();

  updateMockDatabase((current) => {
    current.locations.push({
      id,
      country: location.country,
      city: location.city,
      place: location.place,
      latitude: location.latitude,
      longitude: location.longitude,
      slug,
      created_at: now,
    });
  });

  return id;
}

export async function mockCreateCoverageRequest(input: {
  userId: string;
  title: string;
  description: string | null;
  location: StructuredLocation;
  eventId?: string | null;
}) {
  const locationId = await mockFindOrCreateLocation(input.location);
  const eventId = mockResolveEventId(input.eventId, locationId);
  const id = randomUUID();
  const now = new Date().toISOString();

  updateMockDatabase((current) => {
    current.coverage_requests.push({
      id,
      created_by: input.userId,
      location_id: locationId,
      event_id: eventId,
      title: input.title,
      description: input.description,
      created_at: now,
      status: "open",
      removed_at: null,
    });
  });

  return id;
}

export async function mockExpressInterest(requestId: string, userId: string) {
  updateMockDatabase((current) => {
    const request = current.coverage_requests.find((item) => item.id === requestId);
    if (!request || !isVisible(request)) {
      return;
    }
    const exists = current.request_interests.some(
      (item) => item.request_id === requestId && item.user_id === userId,
    );
    if (exists) {
      return;
    }
    current.request_interests.push({
      id: randomUUID(),
      request_id: requestId,
      user_id: userId,
      created_at: new Date().toISOString(),
    });
  });
  const { mockDispatchHighInterestRequest } = await import("@/lib/data/mock/notification-repository");
  mockDispatchHighInterestRequest(requestId);
}

export async function mockCreateReport(input: {
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
    locationId = await mockFindOrCreateLocation(input.location);
  }
  const eventId = mockResolveEventId(input.eventId, locationId);

  const reportId = randomUUID();
  const now = new Date().toISOString();

  updateMockDatabase((current) => {
    current.reports.push({
      id: reportId,
      created_by: input.userId,
      request_id: input.requestId,
      location_id: locationId,
      event_id: eventId,
      title: input.title,
      description: input.description,
      captured_at: input.capturedAt,
      uploaded_at: now,
      created_at: now,
      licensing_status: input.licensingStatus,
      removed_at: null,
      publish_status: "draft",
      sensitive_content: false,
    });
  });

  const database = readMockDatabase();
  const location = database.locations.find((item) => item.id === locationId);
  return { id: reportId, locationSlug: location?.slug ?? null };
}

export async function mockGetProfilePage(username: string) {
  const database = readMockDatabase();
  const profile = database.profiles.find((item) => item.username === username);
  if (!profile) {
    return null;
  }
  return buildMockReporterPage(database, profile);
}

export async function mockGetProfileByUserId(userId: string) {
  return readMockDatabase().profiles.find((item) => item.id === userId) ?? null;
}

function buildMockReporterPage(
  database: ReturnType<typeof readMockDatabase>,
  profile: NonNullable<ReturnType<typeof readMockDatabase>["profiles"][number]>,
) {
  const reportRows = database.reports.filter((item) => item.created_by === profile.id && isPublicReport(item));
  const reports = reportRows
    .map((item) => toReport(joinReport(database, item.id)!))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const locationsById = new Map(
    database.locations
      .filter((location) => reportRows.some((report) => report.location_id === location.id))
      .map((location) => [location.id, location]),
  );
  const followerCount = (database.profile_follows ?? []).filter((item) => item.following_id === profile.id).length;
  const reportIds = new Set(reportRows.map((item) => item.id));
  const supportCount = (database.report_supports ?? []).filter((item) => reportIds.has(item.report_id)).length;
  const correctionCount = (database.report_corrections ?? []).filter((item) => reportIds.has(item.report_id)).length;
  const completedLicensingCount = (database.licensing_transactions ?? []).filter(
    (item) => reportIds.has(item.report_id) && item.status === "completed",
  ).length;

  const streams = mockListPublicLiveStreams({ reporterId: profile.id });
  return assembleReporterProfilePage(profile, reports, locationsById, {
    followerCount,
    supportCount,
    correctionCount,
    completedLicensingCount,
    liveNow: streams.filter((item) => item.status === "live"),
    pastLive: streams.filter((item) => item.status === "ended"),
  });
}

export async function mockSignUp(email: string, password: string): Promise<AppUser> {
  const normalized = email.toLowerCase();
  const existing = readMockDatabase().accounts.find((item) => item.email === normalized);
  if (existing) {
    throw new Error("An account with that email already exists.");
  }

  const id = randomUUID();
  const usernameBase = normalized.split("@")[0]?.replace(/[^a-z0-9_]/g, "_").slice(0, 24) || "user";
  updateMockDatabase((current) => {
    let username = usernameBase.length >= 3 ? usernameBase : `user_${id.replace(/-/g, "").slice(0, 8)}`;
    let suffix = 0;
    while (current.profiles.some((item) => item.username === username)) {
      suffix += 1;
      username = `${usernameBase.slice(0, 24)}${suffix}`;
    }
    current.accounts.push({
      id,
      email: normalized,
      password_hash: hashPassword(password),
    });
    current.profiles.push({
      id,
      username,
      display_name: usernameBase,
      bio: null,
      avatar_url: null,
      home_city: null,
      home_country: null,
      created_at: new Date().toISOString(),
      role: "member",
      can_live_stream: true,
      topics: [],
    });
  });

  return { id, email: normalized };
}

export async function mockSignIn(email: string, password: string): Promise<AppUser> {
  const account = readMockDatabase().accounts.find((item) => item.email === email.toLowerCase());
  if (!account || account.password_hash !== hashPassword(password)) {
    throw new Error("Invalid email or password.");
  }
  return { id: account.id, email: account.email };
}

export async function mockIsUsernameAvailable(username: string, excludeUserId?: string) {
  return !mockUsernameTaken(readMockDatabase(), username, excludeUserId);
}

export async function mockUpdateReporterProfile(userId: string, patch: ReporterProfilePatch) {
  const database = readMockDatabase();
  applyReporterProfileUpdate(database, userId, patch);
  writeMockDatabase(database);
  return database.profiles.find((item) => item.id === userId)!;
}

export async function mockSetReporterAvatar(
  userId: string,
  file: { bytes: Uint8Array; filename: string; contentType: string; size: number } | null,
) {
  const database = readMockDatabase();
  if (file) {
    await applyReporterAvatarFile(database, userId, file);
  } else {
    await applyReporterAvatarRemoval(database, userId);
  }
  writeMockDatabase(database);
  return database.profiles.find((item) => item.id === userId)!;
}

function mockContentExists(contentType: ModerationContentType, contentId: string) {
  const database = readMockDatabase();
  if (contentType === "coverage_request") {
    return database.coverage_requests.some((item) => item.id === contentId);
  }
  if (contentType === "live_stream") {
    return (database.live_streams ?? []).some((item) => item.id === contentId);
  }
  return database.reports.some((item) => item.id === contentId);
}

function toMockQueueItem(
  item: ReturnType<typeof readMockDatabase>["moderation_reports"][number],
): ModerationQueueItem {
  const database = readMockDatabase();
  const submitter = database.profiles.find((profile) => profile.id === item.submitted_by);
  const content =
    item.content_type === "coverage_request"
      ? database.coverage_requests.find((row) => row.id === item.content_id)
      : item.content_type === "live_stream"
        ? database.live_streams.find((row) => row.id === item.content_id)
        : database.reports.find((row) => row.id === item.content_id);

  const live =
    item.content_type === "live_stream"
      ? database.live_streams.find((row) => row.id === item.content_id)
      : undefined;
  const reporter = live ? database.profiles.find((profile) => profile.id === live.reporter_id) : undefined;
  const location = live ? database.locations.find((row) => row.id === live.location_id) : undefined;
  const event = live?.event_id ? database.events.find((row) => row.id === live.event_id) : undefined;
  const reportCount = database.moderation_reports.filter(
    (row) => row.content_type === item.content_type && row.content_id === item.content_id,
  ).length;

  return {
    id: item.id,
    submittedBy: item.submitted_by,
    submittedByUsername: submitter?.username ?? "unknown",
    contentType: item.content_type,
    contentId: item.content_id,
    contentTitle: content?.title ?? "Content no longer available",
    contentHref: contentPath(item.content_type, item.content_id),
    contentRemoved:
      item.content_type === "live_stream"
        ? Boolean(content && "status" in content && (content.status === "terminated" || content.status === "failed"))
        : Boolean(content && "removed_at" in content && content.removed_at) || !content,
    reason: item.reason,
    details: item.details,
    createdAt: item.created_at,
    status: item.status,
    liveStream: live && reporter && location
      ? {
          reporterId: reporter.id,
          reporterName: reporter.display_name,
          reporterUsername: reporter.username,
          reporterCanLiveStream: reporter.can_live_stream !== false,
          locationLabel: toLocationSummary(location).label,
          eventTitle: event?.title ?? null,
          streamStatus: live.status,
          reportCount,
        }
      : undefined,
  };
}

export async function mockSubmitModerationReport(input: {
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
  if (!mockContentExists(input.contentType, input.contentId)) {
    throw new Error("content");
  }

  updateMockDatabase((current) => {
    current.moderation_reports ??= [];
    current.moderation_reports.push({
      id: randomUUID(),
      submitted_by: input.userId,
      content_type: input.contentType,
      content_id: input.contentId,
      reason,
      details: input.details,
      created_at: new Date().toISOString(),
      status: "open",
    });
  });
}

export async function mockListModerationReports(): Promise<ModerationQueueItem[]> {
  return [...(readMockDatabase().moderation_reports ?? [])]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(toMockQueueItem);
}

export async function mockUpdateModerationStatus(id: string, status: ModerationStatus) {
  updateMockDatabase((current) => {
    const item = (current.moderation_reports ?? []).find((row) => row.id === id);
    if (item) {
      item.status = status;
    }
  });
}

export async function mockRemoveReportedContent(id: string) {
  const now = new Date().toISOString();
  updateMockDatabase((current) => {
    const item = (current.moderation_reports ?? []).find((row) => row.id === id);
    if (!item) {
      return;
    }
    if (item.content_type === "coverage_request") {
      const request = current.coverage_requests.find((row) => row.id === item.content_id);
      if (request && !request.removed_at) {
        request.removed_at = now;
      }
    } else if (item.content_type === "live_stream") {
      applyLiveTermination(current, item.content_id, now);
    } else {
      const report = current.reports.find((row) => row.id === item.content_id);
      if (report && !report.removed_at) {
        report.removed_at = now;
      }
    }
    for (const row of current.moderation_reports ?? []) {
      if (row.content_type === item.content_type && row.content_id === item.content_id && row.status === "open") {
        row.status = "removed";
      }
    }
    item.status = "removed";
  });
}

export async function mockIsFollowingReporter(followerId: string, reporterId: string) {
  return readMockDatabase().profile_follows.some(
    (item) => item.follower_id === followerId && item.following_id === reporterId,
  );
}

export async function mockFollowReporter(followerId: string, reporterId: string) {
  if (followerId === reporterId) {
    throw new Error("You cannot follow yourself.");
  }
  const database = readMockDatabase();
  if (!database.profiles.some((item) => item.id === reporterId)) {
    throw new Error("That reporter was not found.");
  }
  if (database.profile_follows.some((item) => item.follower_id === followerId && item.following_id === reporterId)) {
    return;
  }
  updateMockDatabase((current) => {
    current.profile_follows.push({
      id: randomUUID(),
      follower_id: followerId,
      following_id: reporterId,
      created_at: new Date().toISOString(),
    });
  });
}

export async function mockUnfollowReporter(followerId: string, reporterId: string) {
  updateMockDatabase((current) => {
    current.profile_follows = current.profile_follows.filter(
      (item) => !(item.follower_id === followerId && item.following_id === reporterId),
    );
  });
}

function resolveGeoFollowLocationId(target: GeoFollowTarget, createIfMissing: boolean) {
  const database = readMockDatabase();
  const existing = findGeoFollowLocation(database.locations, target);
  if (existing) {
    return existing.id;
  }
  if (!createIfMissing || target.kind === "place") {
    return null;
  }

  const id = randomUUID();
  const slug = nextLocationSlug(
    geoFollowSlugBase(target),
    new Set(database.locations.map((item) => item.slug)),
  );
  const now = new Date().toISOString();
  const fields = geoFollowInsertFields(target, slug);

  updateMockDatabase((current) => {
    current.locations.push({
      id,
      country: fields.country,
      city: fields.city,
      place: fields.place,
      latitude: fields.latitude,
      longitude: fields.longitude,
      slug: fields.slug,
      created_at: now,
    });
  });

  return id;
}

export async function mockIsFollowingLocation(userId: string, target: GeoFollowTarget) {
  const locationId = resolveGeoFollowLocationId(target, false);
  if (!locationId) {
    return false;
  }
  return readMockDatabase().location_follows.some(
    (item) => item.user_id === userId && item.location_id === locationId,
  );
}

export async function mockFollowLocation(userId: string, target: GeoFollowTarget) {
  const locationId = resolveGeoFollowLocationId(target, true);
  if (!locationId) {
    throw new Error("That location was not found.");
  }
  const database = readMockDatabase();
  if (database.location_follows.some((item) => item.user_id === userId && item.location_id === locationId)) {
    return;
  }
  updateMockDatabase((current) => {
    current.location_follows.push({
      id: randomUUID(),
      user_id: userId,
      location_id: locationId,
      created_at: new Date().toISOString(),
    });
  });
}

export async function mockUnfollowLocation(userId: string, target: GeoFollowTarget) {
  const locationId = resolveGeoFollowLocationId(target, false);
  if (!locationId) {
    return;
  }
  updateMockDatabase((current) => {
    current.location_follows = current.location_follows.filter(
      (item) => !(item.user_id === userId && item.location_id === locationId),
    );
  });
}

export async function mockGetFollowingFeed(userId: string): Promise<FollowingFeedItem[]> {
  const database = readMockDatabase();
  const followedReporterIds = new Set(
    database.profile_follows.filter((item) => item.follower_id === userId).map((item) => item.following_id),
  );
  const followedLocations = database.location_follows
    .filter((item) => item.user_id === userId)
    .flatMap((item) => {
      const location = database.locations.find((row) => row.id === item.location_id);
      return location ? [toLocationSummary(location)] : [];
    });

  const reports = database.reports.filter(isPublicReport).flatMap((item) => {
    const joined = joinReport(database, item.id);
    if (!joined?.locations) {
      return [];
    }
    return [
      {
        report: toReport(joined),
        createdBy: item.created_by,
        location: toLocationSummary(joined.locations),
      },
    ];
  });

  const requests = database.coverage_requests.filter(isVisible).flatMap((item) => {
    const joined = joinRequest(database, item.id);
    if (!joined?.locations) {
      return [];
    }
    return [
      {
        request: toCoverageRequest(joined, userId),
        location: toLocationSummary(joined.locations),
      },
    ];
  });

  return assembleFollowingFeed({
    followedReporterIds,
    followedLocations,
    reports,
    requests,
  });
}

export async function mockGetFollowGraph(userId: string) {
  const database = readMockDatabase();
  const reporterIds = database.profile_follows
    .filter((item) => item.follower_id === userId)
    .map((item) => item.following_id);
  const locations = database.location_follows
    .filter((item) => item.user_id === userId)
    .flatMap((item) => {
      const location = database.locations.find((row) => row.id === item.location_id);
      return location ? [toLocationSummary(location)] : [];
    });
  return { reporterIds, locations };
}

export async function mockSupportReport(reportId: string, userId: string) {
  const database = readMockDatabase();
  const report = database.reports.find((item) => item.id === reportId && isPublicReport(item));
  if (!report) {
    throw new Error("That report was not found.");
  }
  if (report.created_by === userId) {
    throw new Error("You cannot support your own reporting.");
  }
  if (database.report_supports.some((item) => item.report_id === reportId && item.user_id === userId)) {
    return;
  }
  updateMockDatabase((current) => {
    current.report_supports.push({
      id: randomUUID(),
      report_id: reportId,
      user_id: userId,
      created_at: new Date().toISOString(),
    });
  });
}

export async function mockRemoveReportSupport(reportId: string, userId: string) {
  updateMockDatabase((current) => {
    current.report_supports = current.report_supports.filter(
      (item) => !(item.report_id === reportId && item.user_id === userId),
    );
  });
}

export async function mockCreateLicensingInquiry(input: {
  userId: string;
  reportId: string;
  mediaId: string | null;
  organizationName: string;
  contactEmail: string;
  intendedUse: string;
  message: string;
}) {
  const database = readMockDatabase();
  const report = database.reports.find((item) => item.id === input.reportId && isPublicReport(item));
  if (!report || report.licensing_status !== "licensing_available") {
    throw new Error("This report is not available for licensing.");
  }
  if (report.created_by === input.userId) {
    throw new Error("You cannot inquire about licensing your own media.");
  }
  if (input.mediaId && !database.report_media.some((item) => item.id === input.mediaId && item.report_id === report.id)) {
    throw new Error("That media is not part of this report.");
  }
  const id = randomUUID();
  updateMockDatabase((current) => {
    current.licensing_transactions.push({
      id,
      report_id: input.reportId,
      report_media_id: input.mediaId,
      licensee_profile_id: input.userId,
      reporter_id: report.created_by,
      organization_name: input.organizationName,
      contact_email: input.contactEmail,
      intended_use: input.intendedUse,
      message: input.message,
      status: "inquiry",
      created_at: new Date().toISOString(),
    });
  });
  const { mockDispatchLicensingInquiry } = await import("@/lib/data/mock/notification-repository");
  mockDispatchLicensingInquiry({
    actorId: input.userId,
    reporterId: report.created_by,
    reportId: input.reportId,
    organizationName: input.organizationName,
  });
  return id;
}

export async function mockListLicensingInbox(userId: string): Promise<LicensingInboxItem[]> {
  const database = readMockDatabase();
  return database.licensing_transactions
    .filter((item) => item.reporter_id === userId || (!item.reporter_id &&
      database.reports.some((report) => report.id === item.report_id && report.created_by === userId)))
    .map((item) => {
      const report = database.reports.find((row) => row.id === item.report_id);
      const media = item.report_media_id
        ? database.report_media.find((row) => row.id === item.report_media_id)
        : null;
      const licensee = item.licensee_profile_id
        ? database.profiles.find((row) => row.id === item.licensee_profile_id)
        : null;
      return {
        id: item.id,
        createdAt: item.created_at,
        status: normalizeInquiryStatus(item.status),
        organizationName: item.organization_name ?? licensee?.display_name ?? "Unknown requester",
        contactEmail: item.contact_email ?? "",
        intendedUse: item.intended_use ?? "",
        message: item.message ?? "",
        reportId: item.report_id,
        reportTitle: report?.title ?? "Unknown report",
        mediaId: item.report_media_id,
        mediaLabel: media?.original_filename || (media?.media_type === "video" ? "Video" : media ? "Photo" : "Whole report"),
        requesterName: licensee?.display_name ?? item.organization_name ?? "Requester",
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function mockUpdateLicensingInquiryStatus(userId: string, inquiryId: string, status: LicensingInquiryStatus) {
  if (!isLicensingInquiryStatus(status)) {
    throw new Error("That status is not available.");
  }
  const database = readMockDatabase();
  const inquiry = database.licensing_transactions.find((item) => item.id === inquiryId);
  if (!inquiry) {
    throw new Error("That inquiry was not found.");
  }
  const report = database.reports.find((item) => item.id === inquiry.report_id);
  const reporterId = inquiry.reporter_id ?? report?.created_by;
  if (reporterId !== userId) {
    throw new Error("Only the creator can update this inquiry.");
  }
  updateMockDatabase((current) => {
    const row = current.licensing_transactions.find((item) => item.id === inquiryId);
    if (row) {
      row.status = status;
    }
  });
  const { mockDispatchLicensingStatusChange } = await import("@/lib/data/mock/notification-repository");
  mockDispatchLicensingStatusChange({ actorId: userId, inquiryId, status });
}

export async function mockListActiveEvents(locationId?: string | null): Promise<EventSummary[]> {
  if (locationId) {
    return mockListActiveEventSummaries(new Set([locationId]));
  }
  return mockListActiveEventSummaries();
}

export async function mockListActiveEventsAtLocation(location: StructuredLocation): Promise<EventSummary[]> {
  const match = findMatchingLocation(readMockDatabase().locations, location);
  if (!match) {
    return [];
  }
  return mockListActiveEventSummaries(new Set([match.id]));
}

export async function mockGetEventPage(id: string, currentUserId?: string | null): Promise<EventPageData | null> {
  const database = readMockDatabase();
  const event = (database.events ?? []).find((item) => item.id === id);
  if (!event) {
    return null;
  }
  const location = database.locations.find((item) => item.id === event.location_id);
  if (!location) {
    return null;
  }

  const reports = database.reports
    .filter((item) => item.event_id === id && isPublicReport(item))
    .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))
    .map((item) => toReport(joinReport(database, item.id)!));
  const requests = database.coverage_requests
    .filter((item) => item.event_id === id && isVisible(item))
    .map((item) => toCoverageRequest(joinRequest(database, item.id)!, currentUserId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const reporterIds = [...new Set(
    database.reports.filter((item) => item.event_id === id && isPublicReport(item)).map((item) => item.created_by),
  )];
  const reporters: EventReporter[] = reporterIds.flatMap((reporterId) => {
    const profile = database.profiles.find((item) => item.id === reporterId);
    if (!profile) {
      return [];
    }
    return [
      {
        id: profile.id,
        username: profile.username,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
      },
    ];
  });

  const timeline = [
    ...reports.map((report) => ({ kind: "report" as const, at: report.capturedAt || report.publishedAt, report })),
    ...requests.map((request) => ({ kind: "request" as const, at: request.createdAt, request })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return {
    event: toEventSummary(event, location, database.reports, database.coverage_requests),
    reports,
    requests: requests.filter((item) => item.status === "open"),
    reporters,
    timeline,
    liveStreams: mockListPublicLiveStreams({ eventId: id }).filter((item) => item.status === "live"),
  };
}

export async function mockCreateEvent(input: {
  userId: string;
  title: string;
  description: string | null;
  startedAt: string;
  location: StructuredLocation;
}) {
  const locationId = await mockFindOrCreateLocation(input.location);
  const id = randomUUID();
  const now = new Date().toISOString();
  updateMockDatabase((current) => {
    current.events ??= [];
    current.events.push({
      id,
      created_by: input.userId,
      location_id: locationId,
      title: input.title,
      description: input.description,
      status: "active",
      started_at: input.startedAt,
      ended_at: null,
      created_at: now,
      updated_at: now,
    });
  });
  return id;
}

function mockOwnedDraftReport(reportId: string, userId: string) {
  const report = readMockDatabase().reports.find((item) => item.id === reportId);
  if (!report || report.removed_at) {
    throw new Error("That report was not found.");
  }
  if (report.created_by !== userId) {
    throw new Error("You can only add media to your own report.");
  }
  return report;
}

export async function mockCreateMediaSession(input: CreateMediaSessionInput): Promise<MediaUploadSession> {
  const report = mockOwnedDraftReport(input.reportId, input.userId);
  const mediaId = randomUUID();
  const assetId = mediaId;
  const now = new Date().toISOString();
  updateMockDatabase((current) => {
    current.report_media.push({
      id: mediaId,
      report_id: report.id,
      media_type: input.mediaType,
      media_url: pendingMediaUrl(input.mediaType, assetId),
      thumbnail_url: null,
      original_filename: input.filename,
      captured_at: input.capturedAt,
      uploaded_at: now,
      licensing_status: input.licensingStatus,
      created_at: now,
      provider: "local",
      provider_asset_id: assetId,
      upload_status: "pending",
      ...uploadProvenanceFields(input.originalSha256),
    });
  });
  return {
    mediaId,
    protocol: "local",
    uploadUrl: "/api/media/local-upload",
    provider: "local",
    providerAssetId: assetId,
    contentType: input.contentType,
  };
}

export async function mockCompleteLocalMedia(input: {
  userId: string;
  mediaId: string;
  filename: string;
  bytes: Uint8Array;
}) {
  const database = readMockDatabase();
  const media = database.report_media.find((item) => item.id === input.mediaId);
  if (!media) {
    throw new Error("That media was not found.");
  }
  const report = mockOwnedDraftReport(media.report_id, input.userId);
  const stored = await writeLocalMediaFile({
    bytes: input.bytes,
    filename: input.filename,
    mediaType: media.media_type,
  });
  const now = new Date().toISOString();
  updateMockDatabase((current) => {
    const row = current.report_media.find((item) => item.id === input.mediaId);
    if (!row) {
      return;
    }
    row.media_url = stored.mediaUrl;
    row.thumbnail_url = stored.thumbnailUrl;
    row.upload_status = "ready";
    row.uploaded_at = now;
    row.original_filename = input.filename;
    row.original_sha256 = sha256Hex(input.bytes);
  });
  return { reportId: report.id, mediaId: input.mediaId };
}

export async function mockRefreshVideoStatus(userId: string, mediaId: string) {
  const database = readMockDatabase();
  const media = database.report_media.find((item) => item.id === mediaId);
  if (!media) {
    throw new Error("That media was not found.");
  }
  mockOwnedDraftReport(media.report_id, userId);
  return { uploadStatus: media.upload_status, mediaUrl: media.media_url, thumbnailUrl: media.thumbnail_url };
}

export async function mockMarkMediaStatus(userId: string, mediaId: string, status: "uploading" | "processing" | "failed") {
  const media = readMockDatabase().report_media.find((item) => item.id === mediaId);
  if (!media) {
    throw new Error("That media was not found.");
  }
  mockOwnedDraftReport(media.report_id, userId);
  updateMockDatabase((current) => {
    const row = current.report_media.find((item) => item.id === mediaId);
    if (row) {
      row.upload_status = status;
    }
  });
}

export async function mockCompleteImageMedia(userId: string, mediaId: string, publicUrl: string) {
  const media = readMockDatabase().report_media.find((item) => item.id === mediaId);
  if (!media) {
    throw new Error("That media was not found.");
  }
  mockOwnedDraftReport(media.report_id, userId);
  updateMockDatabase((current) => {
    const row = current.report_media.find((item) => item.id === mediaId);
    if (!row) {
      return;
    }
    row.media_url = publicUrl;
    row.thumbnail_url = publicUrl;
    row.upload_status = "ready";
    row.uploaded_at = new Date().toISOString();
  });
}

export async function mockPublishReport(userId: string, reportId: string) {
  const database = readMockDatabase();
  const report = database.reports.find((item) => item.id === reportId);
  if (!report || report.created_by !== userId || report.removed_at) {
    throw new Error("That report was not found.");
  }
  const media = database.report_media.filter((item) => item.report_id === reportId);
  if (media.length === 0 || media.some((item) => item.upload_status !== "ready")) {
    throw new Error("Wait until every photo and video is ready before publishing.");
  }
  const now = new Date().toISOString();
  updateMockDatabase((current) => {
    const row = current.reports.find((item) => item.id === reportId);
    if (row) {
      row.publish_status = "published";
      row.uploaded_at = now;
    }
  });
  const { mockDispatchPublishedReport } = await import("@/lib/data/mock/notification-repository");
  mockDispatchPublishedReport(reportId);
  return reportId;
}

export {
  mockCreateLiveStream,
  mockEndLiveStream,
  mockGetLiveStreamPage,
  mockHeartbeatLiveStream,
  mockListPublicLiveStreams,
  mockLiveBroadcastSession,
  mockLiveLocationIds,
  mockMarkLiveStream,
  mockSetReporterLivePrivilege,
  mockSetSensitiveContent,
  mockTerminateLiveStream,
} from "@/lib/data/mock/live-repository";

export { getMockUser };
