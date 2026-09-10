import type { Location, Profile, ReportMedia } from "@/lib/database.types";
import { formatLocationLabel } from "@/lib/location";
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
  locations: LocationRow | LocationRow[] | null;
  profiles: Pick<Profile, "display_name" | "username"> | Pick<Profile, "display_name" | "username">[] | null;
  report_media: Pick<ReportMedia, "media_type" | "media_url" | "thumbnail_url">[] | null;
};

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
  };
}

export function toCoverageRequest(row: RequestJoinRow, currentUserId?: string | null): CoverageRequest {
  const location = one(row.locations);
  return {
    id: row.id,
    title: row.title,
    location: location ? formatLocationLabel(location) : "Unknown location",
    locationSlug: location?.slug,
    supporterCount: row.request_interests?.length ?? 0,
    createdAt: row.created_at,
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

  return {
    id: row.id,
    title: row.title,
    location: location ? formatLocationLabel(location) : "Unknown location",
    locationId: location?.id ?? row.location_id,
    locationSlug: location?.slug,
    excerpt: row.description?.trim() || "No additional description.",
    mediaKind,
    capturedAt: row.captured_at,
    publishedAt: row.uploaded_at,
    reporterName: profile?.display_name || profile?.username || "Anonymous reporter",
    reporterUsername: profile?.username,
    licensingStatus: row.licensing_status,
    requestId: row.request_id,
    respondsToRequest: Boolean(row.request_id),
    thumbnailUrl: media.find((item) => item.thumbnail_url || item.media_type === "photo")?.thumbnail_url
      || media.find((item) => item.media_type === "photo")?.media_url
      || null,
  };
}
