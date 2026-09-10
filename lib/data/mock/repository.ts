import { randomUUID } from "node:crypto";
import type { AppUser } from "@/lib/auth-user";
import { findMatchingLocation, nextLocationSlug, slugForLocation } from "@/lib/data/locations";
import { toCoverageRequest, toLocationSummary, toReport } from "@/lib/data/mappers";
import { hashPassword } from "@/lib/data/mock/seed";
import { getMockUser } from "@/lib/data/mock/session";
import { readMockDatabase, updateMockDatabase } from "@/lib/data/mock/store";
import { storeReportMedia } from "@/lib/media/store";
import type { StructuredLocation } from "@/lib/location";
import { assembleReporterProfilePage } from "@/lib/data/reporter";
import { aggregateDiscoveryPlaces, type DiscoveryPlace } from "@/lib/data/discovery";
import type { LocationSummary } from "@/lib/types";
import {
  contentPath,
  MODERATION_REASONS,
  type ModerationContentType,
  type ModerationQueueItem,
  type ModerationStatus,
} from "@/lib/moderation";

function isVisible(row: { removed_at?: string | null }) {
  return !row.removed_at;
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
  return {
    ...report,
    locations: location,
    profiles: profile ? { display_name: profile.display_name, username: profile.username } : null,
    report_media: database.report_media.filter((item) => item.report_id === report.id),
  };
}

export async function mockGetHomeFeed(currentUserId?: string | null) {
  const database = readMockDatabase();
  const requests = database.coverage_requests
    .filter((item) => item.status === "open" && isVisible(item))
    .map((item) => toCoverageRequest(joinRequest(database, item.id)!, currentUserId))
    .sort((a, b) => b.supporterCount - a.supporterCount || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);
  const reports = [...database.reports]
    .filter(isVisible)
    .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))
    .slice(0, 8)
    .map((item) => toReport(joinReport(database, item.id)!));

  return { source: "mock" as const, requests, reports, places: mockDiscoveryPlaces() };
}

export function mockDiscoveryPlaces(): DiscoveryPlace[] {
  const database = readMockDatabase();
  return aggregateDiscoveryPlaces({
    locations: database.locations.map(toLocationSummary),
    reports: database.reports.filter(isVisible).map((item) => ({ locationId: item.location_id })),
    openRequests: [],
    openRequestLocationIds: database.coverage_requests
      .filter((item) => item.status === "open" && isVisible(item))
      .map((item) => item.location_id),
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
    .filter(isVisible)
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

export async function mockGetPlacePageData(slug: string, currentUserId?: string | null) {
  const database = readMockDatabase();
  const location = database.locations.find((item) => item.slug === slug);
  if (!location) {
    return null;
  }

  const requests = database.coverage_requests
    .filter((item) => item.location_id === location.id && isVisible(item))
    .map((item) => toCoverageRequest(joinRequest(database, item.id)!, currentUserId));
  const supportByRequest = new Map(requests.map((item) => [item.id, item.supporterCount]));
  const reports = database.reports
    .filter((item) => item.location_id === location.id && isVisible(item))
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
  };
}

export async function mockGetCoverageRequestPage(id: string, currentUserId?: string | null) {
  const database = readMockDatabase();
  const joined = joinRequest(database, id);
  if (!joined?.locations) {
    return null;
  }

  const reports = database.reports
    .filter((item) => item.request_id === id && isVisible(item))
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
  };
}

export async function mockGetReportPage(id: string) {
  const database = readMockDatabase();
  const joined = joinReport(database, id);
  if (!joined?.locations) {
    return null;
  }

  const request = joined.request_id
    ? database.coverage_requests.find((item) => item.id === joined.request_id)
    : null;
  const profile = database.profiles.find((item) => item.id === joined.created_by);

  return {
    report: toReport(joined),
    description: joined.description,
    capturedAt: joined.captured_at,
    uploadedAt: joined.uploaded_at,
    location: toLocationSummary(joined.locations),
    requestId: joined.request_id,
    requestTitle: request?.title ?? null,
    media: joined.report_media,
    licensingStatus: joined.licensing_status,
    reporterUsername: profile?.username ?? joined.profiles?.username ?? "reporter",
    reporterDisplayName:
      profile?.display_name ?? joined.profiles?.display_name ?? "Anonymous reporter",
    removedAt: joined.removed_at,
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
}) {
  const locationId = await mockFindOrCreateLocation(input.location);
  const id = randomUUID();
  const now = new Date().toISOString();

  updateMockDatabase((current) => {
    current.coverage_requests.push({
      id,
      created_by: input.userId,
      location_id: locationId,
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
}

export async function mockCreateReport(input: {
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
    locationId = await mockFindOrCreateLocation(input.location);
  }

  const reportId = randomUUID();
  const now = new Date().toISOString();

  updateMockDatabase((current) => {
    current.reports.push({
      id: reportId,
      created_by: input.userId,
      request_id: input.requestId,
      location_id: locationId,
      title: input.title,
      description: input.description,
      captured_at: input.capturedAt,
      uploaded_at: now,
      created_at: now,
      licensing_status: input.licensingStatus,
      removed_at: null,
    });
  });

  const stored = await storeReportMedia(input.files, {
    userId: input.userId,
    reportId,
    licensingStatus: input.licensingStatus,
  });

  updateMockDatabase((current) => {
    for (const item of stored) {
      current.report_media.push({
        id: randomUUID(),
        report_id: reportId,
        media_type: item.mediaType,
        media_url: item.mediaUrl,
        thumbnail_url: item.thumbnailUrl,
        original_filename: item.originalFilename,
        captured_at: input.capturedAt,
        uploaded_at: now,
        licensing_status: input.licensingStatus,
        created_at: now,
      });
    }
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
  const reportRows = database.reports.filter((item) => item.created_by === profile.id && isVisible(item));
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

  return assembleReporterProfilePage(profile, reports, locationsById, {
    followerCount,
    supportCount,
    correctionCount,
    completedLicensingCount,
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

function mockContentExists(contentType: ModerationContentType, contentId: string) {
  const database = readMockDatabase();
  if (contentType === "coverage_request") {
    return database.coverage_requests.some((item) => item.id === contentId);
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
      : database.reports.find((row) => row.id === item.content_id);

  return {
    id: item.id,
    submittedBy: item.submitted_by,
    submittedByUsername: submitter?.username ?? "unknown",
    contentType: item.content_type,
    contentId: item.content_id,
    contentTitle: content?.title ?? "Content no longer available",
    contentHref: contentPath(item.content_type, item.content_id),
    contentRemoved: Boolean(content?.removed_at) || !content,
    reason: item.reason,
    details: item.details,
    createdAt: item.created_at,
    status: item.status,
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

export { getMockUser };
