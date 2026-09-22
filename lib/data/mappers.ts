import type { Location, Profile, ReportMedia } from "@/lib/database.types";
import { locationArchiveHref } from "@/lib/geo";
import { formatLocationLabel } from "@/lib/location";
import { formatWhenUtc } from "@/lib/format";
import type { CoverageRequest, CoverageRequestStatus, FirsthandReport, LocationSummary } from "@/lib/types";

export type LocationRow = Pick<
  Location,
  "id" | "slug" | "place" | "city" | "country" | "latitude" | "longitude"
>;

export type RequestJoinRow = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  status: CoverageRequestStatus;
  created_by: string;
  location_id: string;
  event_id?: string | null;
  locations: LocationRow | LocationRow[] | null;
  request_interests: { id: string; user_id: string }[] | null;
};

export type ReportJoinRow = {
  id: string;
  title: string;
  description: string | null;
  uploaded_at: string;
  captured_at: string;
  request_id: string | null;
  location_id: string;
  licensing_status?: "view_only" | "licensing_available";
  event_id?: string | null;
  locations: LocationRow | LocationRow[] | null;
  profiles:
    | (Pick<Profile, "display_name" | "username"> & Partial<Pick<Profile, "avatar_url">>)
    | (Pick<Profile, "display_name" | "username"> & Partial<Pick<Profile, "avatar_url">>)[]
    | null;
  report_media:
    | (Pick<ReportMedia, "media_type" | "media_url" | "thumbnail_url"> &
        Partial<Pick<ReportMedia, "id" | "original_filename">>)[]
    | null;
  coverage_requests?:
    | { title: string; request_interests?: { id: string }[] | null }
    | { title: string; request_interests?: { id: string }[] | null }[]
    | null;
};

export const REPORT_FEED_SELECT =
  "id, title, description, uploaded_at, captured_at, request_id, location_id, licensing_status, locations(*), profiles(display_name, username, avatar_url), report_media(media_type, media_url, thumbnail_url, original_filename), coverage_requests(title, request_interests(id))";

export function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function toLocationSummary(row: LocationRow): LocationSummary {
  return {
    id: row.id,
    slug: row.slug,
    place: row.place,
    city: row.city,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    label: formatLocationLabel(row),
    href: locationArchiveHref(row),
  };
}

export function toCoverageRequest(
  row: RequestJoinRow,
  currentUserId?: string | null,
  responseCount = 0,
): CoverageRequest {
  const location = one(row.locations);
  return {
    id: row.id,
    title: row.title,
    location: location ? formatLocationLabel(location) : "Unknown location",
    locationSlug: location?.slug,
    locationHref: location ? locationArchiveHref(location) : undefined,
    city: location?.city,
    country: location?.country,
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
    supporterCount: row.request_interests?.length ?? 0,
    responseCount,
    createdAt: row.created_at,
    requestedLabel: formatWhenUtc(row.created_at),
    status: row.status,
    currentUserInterested: currentUserId
      ? Boolean(row.request_interests?.some((item) => item.user_id === currentUserId))
      : false,
  };
}

export function toReport(row: ReportJoinRow): FirsthandReport {
  const location = one(row.locations);
  const profile = one(row.profiles);
  const media = row.report_media ?? [];
  const mediaKind = media.some((item) => item.media_type === "video")
    ? "video"
    : media.some((item) => item.media_type === "photo")
      ? "photo"
      : "text";
  const request = one(row.coverage_requests);

  return {
    id: row.id,
    title: row.title,
    location: location ? formatLocationLabel(location) : "Unknown location",
    locationId: location?.id ?? row.location_id,
    locationSlug: location?.slug,
    locationHref: location ? locationArchiveHref(location) : undefined,
    city: location?.city,
    country: location?.country,
    excerpt: row.description?.trim() || "No additional description.",
    mediaKind,
    capturedAt: row.captured_at,
    publishedAt: row.uploaded_at,
    reporterName: profile?.display_name || profile?.username || "Anonymous reporter",
    reporterUsername: profile?.username,
    reporterAvatarUrl: profile?.avatar_url ?? null,
    licensingStatus: row.licensing_status,
    requestId: row.request_id,
    requestTitle: request?.title ?? null,
    respondsToRequest: Boolean(row.request_id),
    requestSupporterCount: request?.request_interests?.length,
    recordedLive: isRecordedLiveReport(row.description, media),
    thumbnailUrl: media.find((item) => item.thumbnail_url || item.media_type === "photo")?.thumbnail_url
      || media.find((item) => item.media_type === "photo")?.media_url
      || null,
  };
}

export function isRecordedLiveReport(
  description: string | null | undefined,
  media: Array<{ original_filename?: string | null }>,
) {
  if (media.some((item) => item.original_filename === "live-recording.mp4")) {
    return true;
  }
  return Boolean(description?.startsWith("Recording of a live firsthand"));
}
