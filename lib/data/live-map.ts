import type { LiveStreamRecord } from "@/lib/database.types";
import { toLocationSummary, type LocationRow } from "@/lib/data/mappers";
import { isPlaceholderLiveInputId, isRealCloudflareLiveInputId } from "@/lib/live/fail-closed";
import {
  cloudflareLiveIframeUrl,
  MOCK_LIVE_SAMPLE_VIDEO,
  type LiveStreamSummary,
} from "@/lib/live";

export function toLiveStreamSummary(input: {
  row: LiveStreamRecord;
  location: LocationRow;
  reporterName: string;
  reporterUsername: string;
  eventTitle?: string | null;
  requestTitle?: string | null;
  thumbnailUrl?: string | null;
  includeModerationPlayback?: boolean;
  livePlayerUrl?: string | null;
  liveWhepUrl?: string | null;
  cloudflareIngest?: LiveStreamSummary["cloudflareIngest"];
}): LiveStreamSummary {
  const { row } = input;
  const recordingId = row.recording_asset_id;
  const liveInputId = row.cloudflare_live_input_id;
  const mockCatalogPlayback = Boolean(liveInputId?.startsWith("mock-"));
  const realLiveInput = isRealCloudflareLiveInputId(liveInputId);
  const realRecording = Boolean(recordingId) && !isPlaceholderLiveInputId(recordingId);
  const sensitive = Boolean(row.sensitive_content);
  const allowAutoplay = !sensitive;

  let playbackKind: LiveStreamSummary["playbackKind"] = "file";
  let playbackUrl: string | null = null;

  const terminatedPlayback = row.status === "terminated" && Boolean(recordingId) && input.includeModerationPlayback;

  if ((row.status === "ended" || terminatedPlayback) && realRecording) {
    playbackKind = "iframe";
    playbackUrl = cloudflareLiveIframeUrl(recordingId!, { autoplay: allowAutoplay });
  } else if (row.status === "live" && realLiveInput) {
    playbackKind = "whep";
    playbackUrl = input.liveWhepUrl ?? null;
  } else if ((row.status === "ended" || terminatedPlayback) && recordingId && mockCatalogPlayback) {
    playbackKind = "file";
    playbackUrl = MOCK_LIVE_SAMPLE_VIDEO;
  } else if (row.status === "live" && mockCatalogPlayback) {
    playbackKind = "file";
    playbackUrl = MOCK_LIVE_SAMPLE_VIDEO;
  }

  if (row.status === "terminated" && !input.includeModerationPlayback) {
    playbackUrl = null;
  }

  return {
    id: row.id,
    title: row.title,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    location: toLocationSummary(input.location),
    reporterId: row.reporter_id,
    reporterName: input.reporterName,
    reporterUsername: input.reporterUsername,
    eventId: row.event_id,
    eventTitle: input.eventTitle ?? null,
    requestId: row.coverage_request_id,
    requestTitle: input.requestTitle ?? null,
    reportId: row.status === "terminated" && !input.includeModerationPlayback ? null : row.report_id,
    playbackKind,
    playbackUrl,
    thumbnailUrl: input.thumbnailUrl ?? null,
    sensitiveContent: sensitive,
    recordingAssetId: input.includeModerationPlayback ? recordingId : null,
    viewerCount: row.viewer_count ?? null,
    cloudflareIngest: input.cloudflareIngest ?? "unknown",
  };
}
