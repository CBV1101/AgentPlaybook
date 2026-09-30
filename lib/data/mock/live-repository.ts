import { randomUUID } from "node:crypto";
import { toLiveStreamSummary } from "@/lib/data/live-map";
import { readMockDatabase, updateMockDatabase } from "@/lib/data/mock/store";
import { assertEventAttachable } from "@/lib/events";
import {
  LIVE_CREATED_TIMEOUT_MS,
  MOCK_LIVE_SAMPLE_VIDEO,
  isPublicLiveStatus,
  isPubliclyLive,
  type LiveStreamSummary,
} from "@/lib/live";
import { liveRecordingProvenanceFields } from "@/lib/media/provenance";
import type { LiveStreamRecord } from "@/lib/database.types";

function mockSweepLiveStreams() {
  const now = Date.now();
  updateMockDatabase((current) => {
    current.live_streams ??= [];
    for (const row of current.live_streams) {
      if (row.status === "created") {
        if (now - new Date(row.created_at).getTime() > LIVE_CREATED_TIMEOUT_MS) {
          row.status = "failed";
          row.ended_at = new Date().toISOString();
        }
      }
    }
  });
}

function isMockAdmin(userId?: string | null) {
  if (!userId) {
    return false;
  }
  return readMockDatabase().profiles.find((item) => item.id === userId)?.role === "admin";
}

function liveRowSummary(row: LiveStreamRecord, includeModerationPlayback = false): LiveStreamSummary | null {
  const database = readMockDatabase();
  const location = database.locations.find((item) => item.id === row.location_id);
  const profile = database.profiles.find((item) => item.id === row.reporter_id);
  if (!location || !profile) {
    return null;
  }
  const event = row.event_id ? database.events.find((item) => item.id === row.event_id) : null;
  const request = row.coverage_request_id
    ? database.coverage_requests.find((item) => item.id === row.coverage_request_id)
    : null;
  return toLiveStreamSummary({
    row,
    location,
    reporterName: profile.display_name,
    reporterUsername: profile.username,
    eventTitle: event?.title ?? null,
    requestTitle: request?.title ?? null,
    thumbnailUrl: mockLiveThumbnail(database, row.location_id),
    includeModerationPlayback,
  });
}

function mockLiveThumbnail(
  database: ReturnType<typeof readMockDatabase>,
  locationId: string,
): string | null {
  const reports = database.reports
    .filter((item) => item.location_id === locationId && !item.removed_at && item.publish_status !== "draft")
    .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));
  for (const report of reports) {
    const media = database.report_media.filter((item) => item.report_id === report.id);
    const thumb = media.find((item) => item.thumbnail_url)?.thumbnail_url;
    if (thumb) {
      return thumb;
    }
    const photo = media.find((item) => item.media_type === "photo" && item.media_url)?.media_url;
    if (photo) {
      return photo;
    }
  }
  return null;
}

export function mockListPublicLiveStreams(filter?: {
  locationIds?: string[];
  eventId?: string;
  reporterId?: string;
  requestId?: string;
}): LiveStreamSummary[] {
  mockSweepLiveStreams();
  const database = readMockDatabase();
  return (database.live_streams ?? [])
    .filter((item) => isPublicLiveStatus(item.status))
    .filter((item) => !filter?.locationIds || filter.locationIds.includes(item.location_id))
    .filter((item) => !filter?.eventId || item.event_id === filter.eventId)
    .filter((item) => !filter?.reporterId || item.reporter_id === filter.reporterId)
    .filter((item) => !filter?.requestId || item.coverage_request_id === filter.requestId)
    .sort((a, b) => {
      if (a.status === "live" && b.status !== "live") {
        return -1;
      }
      if (b.status === "live" && a.status !== "live") {
        return 1;
      }
      return (b.started_at ?? b.created_at).localeCompare(a.started_at ?? a.created_at);
    })
    .flatMap((item) => {
      const summary = liveRowSummary(item);
      return summary ? [summary] : [];
    });
}

export function mockLiveLocationIds() {
  mockSweepLiveStreams();
  return (readMockDatabase().live_streams ?? [])
    .filter((item) => isPubliclyLive(item))
    .map((item) => item.location_id);
}

export async function mockGetLiveStreamPage(id: string, currentUserId?: string | null) {
  mockSweepLiveStreams();
  const row = (readMockDatabase().live_streams ?? []).find((item) => item.id === id);
  if (!row) {
    return null;
  }
  const admin = isMockAdmin(currentUserId);
  if (row.status === "created" && row.reporter_id !== currentUserId && !admin) {
    return null;
  }
  if (row.status === "failed" && row.reporter_id !== currentUserId && !admin) {
    return null;
  }
  return liveRowSummary(row, admin);
}

export async function mockCreateLiveStream(input: {
  userId: string;
  title: string;
  locationId: string;
  eventId?: string | null;
  requestId?: string | null;
}) {
  // P0 #4B occupancy (created|live) is not enforced here. See supabaseCreateLiveStream.
  const locationId = input.locationId;
  const database = readMockDatabase();
  const reporter = database.profiles.find((item) => item.id === input.userId);
  if (reporter && reporter.can_live_stream === false) {
    throw new Error("live-privilege");
  }
  if (input.eventId) {
    const event = database.events.find((item) => item.id === input.eventId);
    assertEventAttachable(event, locationId);
  }
  if (input.requestId) {
    const request = database.coverage_requests.find((item) => item.id === input.requestId && !item.removed_at);
    if (!request) {
      throw new Error("That coverage request was not found.");
    }
    if (request.location_id !== locationId) {
      throw new Error("That coverage request is for a different location.");
    }
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  updateMockDatabase((current) => {
    current.live_streams ??= [];
    current.live_streams.push({
      id,
      reporter_id: input.userId,
      location_id: locationId,
      event_id: input.eventId || null,
      coverage_request_id: input.requestId || null,
      report_id: null,
      cloudflare_live_input_id: `mock-live-${id}`,
      recording_asset_id: null,
      status: "created",
      title: input.title,
      started_at: null,
      ended_at: null,
      last_seen_at: null,
      created_at: now,
      sensitive_content: false,
    });
  });
  return { id };
}

export async function mockLiveBroadcastSession(userId: string, streamId: string) {
  mockSweepLiveStreams();
  const row = (readMockDatabase().live_streams ?? []).find((item) => item.id === streamId);
  if (!row || row.reporter_id !== userId) {
    throw new Error("That live report was not found.");
  }
  if (row.status === "ended" || row.status === "terminated") {
    throw new Error("This broadcast has already ended.");
  }
  const reporter = readMockDatabase().profiles.find((item) => item.id === userId);
  if (reporter && reporter.can_live_stream === false) {
    throw new Error("live-privilege");
  }
  return {
    streamId: row.id,
    status: row.status,
    whipUrl: "mock:local",
    whepUrl: null as string | null,
    protocol: "mock" as const,
  };
}

export async function mockMarkLiveStream(userId: string, streamId: string, status: "live" | "failed") {
  const row = (readMockDatabase().live_streams ?? []).find((item) => item.id === streamId);
  if (!row || row.reporter_id !== userId) {
    throw new Error("That live report was not found.");
  }
  const wasLive = row.status === "live";
  const now = new Date().toISOString();
  updateMockDatabase((current) => {
    const target = current.live_streams.find((item) => item.id === streamId);
    if (!target) {
      return;
    }
    target.status = status;
    target.last_seen_at = now;
    if (status === "live") {
      target.started_at = target.started_at ?? now;
    }
    if (status === "failed") {
      target.ended_at = now;
    }
  });
  if (status === "live" && !wasLive) {
    const { mockDispatchLiveStarted } = await import("@/lib/data/mock/notification-repository");
    mockDispatchLiveStarted(streamId);
  }
}

export async function mockHeartbeatLiveStream(userId: string, streamId: string) {
  const row = (readMockDatabase().live_streams ?? []).find((item) => item.id === streamId);
  if (!row || row.reporter_id !== userId) {
    throw new Error("That live report was not found.");
  }
  updateMockDatabase((current) => {
    const target = current.live_streams.find((item) => item.id === streamId);
    if (target && target.status === "live") {
      target.last_seen_at = new Date().toISOString();
    }
  });
}

export async function mockEndLiveStream(userId: string, streamId: string) {
  const database = readMockDatabase();
  const row = (database.live_streams ?? []).find((item) => item.id === streamId);
  if (!row || row.reporter_id !== userId) {
    throw new Error("That live report was not found.");
  }
  if (row.status === "terminated") {
    throw new Error("This livestream was removed from public view.");
  }
  if (row.status === "ended" && row.report_id) {
    return { reportId: row.report_id };
  }

  const now = new Date().toISOString();
  const reportId = row.report_id ?? randomUUID();
  const mediaId = randomUUID();
  const started = row.started_at ?? now;

  updateMockDatabase((current) => {
    const target = current.live_streams.find((item) => item.id === streamId);
    if (!target) {
      return;
    }
    if (!target.report_id) {
      current.reports.push({
        id: reportId,
        created_by: userId,
        request_id: target.coverage_request_id,
        location_id: target.location_id,
        event_id: target.event_id,
        title: target.title,
        description: `Recording of a live firsthand broadcast that started ${started} and ended ${now}. This is a firsthand account, not a verified finding.`,
        captured_at: started,
        uploaded_at: now,
        created_at: now,
        licensing_status: "view_only",
        removed_at: null,
        publish_status: "published",
        sensitive_content: Boolean(target.sensitive_content),
      });
      current.report_media.push({
        id: mediaId,
        report_id: reportId,
        media_type: "video",
        media_url: MOCK_LIVE_SAMPLE_VIDEO,
        thumbnail_url: "https://picsum.photos/seed/live-recording/800/500",
        original_filename: "live-recording.mp4",
        captured_at: started,
        uploaded_at: now,
        licensing_status: "view_only",
        created_at: now,
        provider: "local",
        provider_asset_id: mediaId,
        upload_status: "ready",
        ...liveRecordingProvenanceFields(),
      });
      target.report_id = reportId;
      target.recording_asset_id = mediaId;
    }
    target.status = "ended";
    target.ended_at = now;
    target.last_seen_at = now;
  });

  if (!row.report_id) {
    const { mockDispatchPublishedReport } = await import("@/lib/data/mock/notification-repository");
    mockDispatchPublishedReport(reportId);
  }
  return { reportId };
}

export function applyLiveTermination(
  current: ReturnType<typeof readMockDatabase>,
  streamId: string,
  now = new Date().toISOString(),
) {
  const stream = (current.live_streams ?? []).find((item) => item.id === streamId);
  if (!stream) {
    return;
  }
  stream.status = "terminated";
  stream.ended_at = stream.ended_at ?? now;
  stream.last_seen_at = now;
  if (!stream.recording_asset_id) {
    stream.recording_asset_id = stream.cloudflare_live_input_id ?? `moderation-${stream.id}`;
  }
  if (stream.report_id) {
    const report = current.reports.find((item) => item.id === stream.report_id);
    if (report && !report.removed_at) {
      report.removed_at = now;
    }
  }
  for (const row of current.moderation_reports ?? []) {
    if (row.content_type === "live_stream" && row.content_id === streamId && row.status === "open") {
      row.status = "removed";
    }
  }
}

export function mockTerminateLiveStream(streamId: string) {
  updateMockDatabase((current) => {
    applyLiveTermination(current, streamId);
  });
}

export function mockSetReporterLivePrivilege(reporterId: string, canLiveStream: boolean) {
  updateMockDatabase((current) => {
    const profile = current.profiles.find((item) => item.id === reporterId);
    if (profile) {
      profile.can_live_stream = canLiveStream;
    }
  });
}

export function mockSetSensitiveContent(input: {
  contentType: "live_stream" | "firsthand_report";
  contentId: string;
  sensitive: boolean;
}) {
  updateMockDatabase((current) => {
    if (input.contentType === "live_stream") {
      const stream = (current.live_streams ?? []).find((item) => item.id === input.contentId);
      if (stream) {
        stream.sensitive_content = input.sensitive;
      }
      return;
    }
    const report = current.reports.find((item) => item.id === input.contentId);
    if (report) {
      report.sensitive_content = input.sensitive;
    }
  });
}

