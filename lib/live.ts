import type { LiveStreamStatus } from "@/lib/database.types";
import type { LocationSummary } from "@/lib/types";

export type { LiveStreamStatus };

export type CloudflareIngestObservation = "connected" | "disconnected" | "unknown";

export type LiveStreamSummary = {
  id: string;
  title: string;
  status: LiveStreamStatus;
  startedAt: string | null;
  endedAt: string | null;
  location: LocationSummary;
  reporterId: string;
  reporterName: string;
  reporterUsername: string;
  eventId: string | null;
  eventTitle: string | null;
  requestId: string | null;
  requestTitle: string | null;
  reportId: string | null;
  playbackKind: "whep" | "iframe" | "file";
  playbackUrl: string | null;
  thumbnailUrl: string | null;
  sensitiveContent: boolean;
  recordingAssetId: string | null;
  viewerCount: number | null;
  cloudflareIngest: CloudflareIngestObservation;
};

export const LIVE_HEARTBEAT_STALE_MS = 75_000;
export const LIVE_CREATED_TIMEOUT_MS = 15 * 60 * 1000;
export const MOCK_LIVE_SAMPLE_VIDEO =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

export function liveHref(id: string) {
  return `/live/${id}`;
}

export function reporterProfileHref(username?: string | null) {
  const value = username?.trim();
  if (!value) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[firsthand] Public stream is missing a reporter username; not linking to a reporter profile.");
    }
    return null;
  }
  return `/u/${value}`;
}

export function liveBroadcastHref(id: string) {
  return `/live/${id}/broadcast`;
}

/**
 * Public LIVE catalog (P0 #4A). Cloudflare disconnected ingest is hidden.
 * This does not change persisted status and does not free the reporter's
 * one-active-broadcast slot (P0 #4B).
 */
export function isPubliclyLive(stream: {
  status: LiveStreamStatus | string;
  cloudflareIngest?: CloudflareIngestObservation;
}) {
  return stream.status === "live" && stream.cloudflareIngest !== "disconnected";
}

/** Persisted on-air row. Not public catalog truth and not occupancy. */
export function isActiveLiveStatus(status: LiveStreamStatus | string) {
  return status === "live";
}

/**
 * Reporter occupancy for P0 #4B: at most one of these per reporter.
 * Historical ended / failed / terminated rows do not occupy the slot.
 * Enforcement belongs on create (server-side), not on public GET.
 */
export function isOccupyingBroadcastSlot(status: LiveStreamStatus | string) {
  return status === "created" || status === "live";
}

export function isPublicLiveStatus(status: LiveStreamStatus | string) {
  return status === "live" || status === "ended";
}

export function liveStatusLabel(status: LiveStreamStatus | string) {
  if (status === "live") {
    return "Live";
  }
  if (status === "ended") {
    return "Ended";
  }
  if (status === "failed") {
    return "Broadcast stopped";
  }
  if (status === "terminated") {
    return "Removed";
  }
  return "Starting";
}

export function cloudflareLiveIframeUrl(liveInputId: string, options?: { autoplay?: boolean }) {
  const autoplay = options?.autoplay === false ? "false" : undefined;
  const url = `https://iframe.cloudflarestream.com/${liveInputId}`;
  return autoplay ? `${url}?autoplay=${autoplay}` : url;
}

export function withLivePreviewIframeParams(playbackUrl: string, options: { autoplay: boolean; muted: boolean }) {
  const url = new URL(playbackUrl);
  if (!options.autoplay) {
    url.searchParams.set("autoplay", "false");
  } else {
    url.searchParams.delete("autoplay");
  }
  if (options.muted) {
    url.searchParams.set("muted", "true");
  }
  return url.toString();
}
