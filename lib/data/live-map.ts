import type { LiveStreamRecord } from "@/lib/database.types";
import {
  cloudflareLiveIframeUrl,
  MOCK_LIVE_SAMPLE_VIDEO,
  type LiveStreamSummary,
} from "@/lib/live";
import { toLocationSummary, type LocationRow } from "@/lib/data/mappers";

export function toLiveStreamSummary(input: {
  row: LiveStreamRecord;
  location: LocationRow;
  reporterName: string;
  reporterUsername: string;
  eventTitle?: string | null;
  requestTitle?: string | null;
  thumbnailUrl?: string | null;
  includeModerationPlayback?: boolean;
}): LiveStreamSummary {
  const { row } = input;
  const recordingId = row.recording_asset_id;
  const liveInputId = row.cloudflare_live_input_id;
  const mockPlayback = !liveInputId || liveInputId.startsWith("mock-") || liveInputId.startsWith("local-");
  const sensitive = Boolean(row.sensitive_content);
  const allowAutoplay = !sensitive;

  let playbackKind: LiveStreamSummary["playbackKind"] = "file";
  let playbackUrl: string | null = MOCK_LIVE_SAMPLE_VIDEO;

  const terminatedPlayback = row.status === "terminated" && Boolean(recordingId) && input.includeModerationPlayback;

  if ((row.status === "ended" || terminatedPlayback) && recordingId && !mockPlayback) {
    playbackKind = "iframe";
    playbackUrl = cloudflareLiveIframeUrl(recordingId, { autoplay: allowAutoplay });
  } else if (row.status === "live" && liveInputId && !mockPlayback) {
    playbackKind = "iframe";
    playbackUrl = cloudflareLiveIframeUrl(liveInputId, { autoplay: allowAutoplay });
  } else if ((row.status === "ended" || terminatedPlayback) && recordingId && mockPlayback) {
    playbackKind = "file";
    playbackUrl = MOCK_LIVE_SAMPLE_VIDEO;
  } else if (row.status === "live" && mockPlayback) {
    playbackKind = "file";
    playbackUrl = MOCK_LIVE_SAMPLE_VIDEO;
  } else {
    playbackUrl = null;
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
  };
}
