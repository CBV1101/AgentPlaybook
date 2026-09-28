import { randomUUID } from "node:crypto";
import { toLiveStreamSummary } from "@/lib/data/live-map";
import { assertEventAttachable } from "@/lib/events";
import {
  LIVE_CREATED_TIMEOUT_MS,
  LIVE_HEARTBEAT_STALE_MS,
  type LiveStreamSummary,
} from "@/lib/live";
import {
  createCloudflareLiveInput,
  disableCloudflareLiveInput,
  getCloudflareLiveInput,
  getCloudflareLiveViewerCount,
  isCloudflareLiveConfigured,
  listCloudflareLiveRecordings,
} from "@/lib/media/cloudflare-live";
import { cloudflareStreamEmbedUrl, cloudflareStreamThumbnailUrl } from "@/lib/media/classify";
import { liveRecordingProvenanceFields } from "@/lib/media/provenance";
import { createClient } from "@/lib/supabase/server";
import type { LiveStreamRecord, Location } from "@/lib/database.types";

async function supabaseSweepLiveStreams() {
  const supabase = await createClient();
  const now = Date.now();
  const { data } = await supabase.from("live_streams").select("id, status, last_seen_at, created_at").in("status", [
    "live",
    "created",
  ]);
  for (const row of data ?? []) {
    if (row.status === "live" && row.last_seen_at) {
      if (now - new Date(row.last_seen_at).getTime() > LIVE_HEARTBEAT_STALE_MS) {
        await supabase
          .from("live_streams")
          .update({ status: "failed", ended_at: new Date().toISOString() })
          .eq("id", row.id)
          .eq("status", "live");
      }
    }
    if (row.status === "created" && now - new Date(row.created_at).getTime() > LIVE_CREATED_TIMEOUT_MS) {
      await supabase
        .from("live_streams")
        .update({ status: "failed", ended_at: new Date().toISOString() })
        .eq("id", row.id)
        .eq("status", "created");
    }
  }
}

async function hydrateLiveRows(
  rows: LiveStreamRecord[],
  includeModerationPlayback = false,
): Promise<LiveStreamSummary[]> {
  if (rows.length === 0) {
    return [];
  }
  const supabase = await createClient();
  const locationIds = [...new Set(rows.map((item) => item.location_id))];
  const reporterIds = [...new Set(rows.map((item) => item.reporter_id))];
  const eventIds = [...new Set(rows.flatMap((item) => (item.event_id ? [item.event_id] : [])))];
  const requestIds = [...new Set(rows.flatMap((item) => (item.coverage_request_id ? [item.coverage_request_id] : [])))];

  const [{ data: locations }, { data: profiles }, { data: events }, { data: requests }] = await Promise.all([
    supabase.from("locations").select("*").in("id", locationIds),
    supabase.from("profiles").select("id, display_name, username").in("id", reporterIds),
    eventIds.length ? supabase.from("events").select("id, title").in("id", eventIds) : Promise.resolve({ data: [] }),
    requestIds.length
      ? supabase.from("coverage_requests").select("id, title").in("id", requestIds)
      : Promise.resolve({ data: [] }),
  ]);

  const locationById = new Map((locations ?? []).map((item) => [item.id, item]));
  const profileById = new Map((profiles ?? []).map((item) => [item.id, item]));
  const eventById = new Map((events ?? []).map((item) => [item.id, item.title]));
  const requestById = new Map((requests ?? []).map((item) => [item.id, item.title]));

  return rows.flatMap((row) => {
    const location = locationById.get(row.location_id);
    const profile = profileById.get(row.reporter_id);
    if (!location || !profile) {
      return [];
    }
    return [
      toLiveStreamSummary({
        row,
        location: location as Location,
        reporterName: profile.display_name,
        reporterUsername: profile.username,
        eventTitle: row.event_id ? eventById.get(row.event_id) ?? null : null,
        requestTitle: row.coverage_request_id ? requestById.get(row.coverage_request_id) ?? null : null,
        includeModerationPlayback,
      }),
    ];
  });
}

const VIEWER_COUNT_TTL_MS = 45_000;

async function refreshLiveViewerCounts(rows: LiveStreamRecord[], summaries: LiveStreamSummary[]) {
  if (!isCloudflareLiveConfigured()) {
    return;
  }
  const supabase = await createClient();
  const now = Date.now();
  const live = rows.filter(
    (row) =>
      row.status === "live" &&
      row.cloudflare_live_input_id &&
      !row.cloudflare_live_input_id.startsWith("local-"),
  );
  const stale = live
    .filter((row) => {
      const checked = row.viewer_count_checked_at ? new Date(row.viewer_count_checked_at).getTime() : 0;
      return now - checked > VIEWER_COUNT_TTL_MS;
    })
    .slice(0, 8);
  await Promise.all(
    stale.map(async (row) => {
      try {
        const count = await getCloudflareLiveViewerCount(row.cloudflare_live_input_id!);
        const checkedAt = new Date().toISOString();
        await supabase
          .from("live_streams")
          .update({ viewer_count: count, viewer_count_checked_at: checkedAt })
          .eq("id", row.id);
        const summary = summaries.find((item) => item.id === row.id);
        if (summary) {
          summary.viewerCount = count;
        }
      } catch {
        // Leave viewerCount unknown rather than inventing a number.
      }
    }),
  );
}

export async function supabaseListPublicLiveStreams(filter?: {
  locationIds?: string[];
  eventId?: string;
  reporterId?: string;
  requestId?: string;
  includeEnded?: boolean;
}): Promise<LiveStreamSummary[]> {
  await supabaseSweepLiveStreams();
  const supabase = await createClient();
  let query = supabase.from("live_streams").select("*");
  if (filter?.includeEnded) {
    query = query.in("status", ["live", "ended"]);
  } else {
    query = query.eq("status", "live");
  }
  if (filter?.locationIds?.length) {
    query = query.in("location_id", filter.locationIds);
  }
  if (filter?.eventId) {
    query = query.eq("event_id", filter.eventId);
  }
  if (filter?.reporterId) {
    query = query.eq("reporter_id", filter.reporterId);
  }
  if (filter?.requestId) {
    query = query.eq("coverage_request_id", filter.requestId);
  }
  const { data } = await query.order("started_at", { ascending: false });
  const rows = (data ?? []) as LiveStreamRecord[];
  const summaries = await hydrateLiveRows(rows);
  await refreshLiveViewerCounts(rows, summaries);
  return summaries.sort((a, b) => {
    if (a.status === "live" && b.status !== "live") {
      return -1;
    }
    if (b.status === "live" && a.status !== "live") {
      return 1;
    }
    return (b.startedAt ?? "").localeCompare(a.startedAt ?? "");
  });
}

export async function supabaseLiveLocationIds() {
  const streams = await supabaseListPublicLiveStreams();
  return streams.filter((item) => item.status === "live").map((item) => item.location.id);
}

export async function supabaseGetLiveStreamPage(id: string, currentUserId?: string | null) {
  await supabaseSweepLiveStreams();
  const supabase = await createClient();
  const { data } = await supabase.from("live_streams").select("*").eq("id", id).maybeSingle();
  if (!data) {
    return null;
  }
  const row = data as LiveStreamRecord;
  let admin = false;
  if (currentUserId) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", currentUserId).maybeSingle();
    admin = profile?.role === "admin";
  }
  if (row.status === "created" && row.reporter_id !== currentUserId && !admin) {
    return null;
  }
  if (row.status === "failed" && row.reporter_id !== currentUserId && !admin) {
    return null;
  }
  const [summary] = await hydrateLiveRows([row], admin);
  return summary ?? null;
}

export async function supabaseCreateLiveStream(input: {
  userId: string;
  title: string;
  locationId: string;
  eventId?: string | null;
  requestId?: string | null;
}) {
  const supabase = await createClient();
  const { data: reporter } = await supabase
    .from("profiles")
    .select("can_live_stream")
    .eq("id", input.userId)
    .maybeSingle();
  if (reporter && reporter.can_live_stream === false) {
    throw new Error("live-privilege");
  }
  if (input.eventId) {
    const { data: event } = await supabase.from("events").select("*").eq("id", input.eventId).maybeSingle();
    assertEventAttachable(event, input.locationId);
  }
  if (input.requestId) {
    const { data: request } = await supabase
      .from("coverage_requests")
      .select("id, location_id, removed_at")
      .eq("id", input.requestId)
      .maybeSingle();
    if (!request || request.removed_at) {
      throw new Error("That coverage request was not found.");
    }
    if (request.location_id !== input.locationId) {
      throw new Error("That coverage request is for a different location.");
    }
  }

  const id = randomUUID();
  const { error } = await supabase.from("live_streams").insert({
    id,
    reporter_id: input.userId,
    location_id: input.locationId,
    event_id: input.eventId || null,
    coverage_request_id: input.requestId || null,
    status: "created",
    title: input.title,
  });
  if (error) {
    throw new Error(error.message);
  }

  if (isCloudflareLiveConfigured()) {
    try {
      const created = await createCloudflareLiveInput({
        name: input.title,
        streamId: id,
        reporterId: input.userId,
      });
      const { error: updateError } = await supabase
        .from("live_streams")
        .update({ cloudflare_live_input_id: created.uid })
        .eq("id", id);
      if (updateError) {
        throw new Error(updateError.message);
      }
    } catch (error) {
      await supabase.from("live_streams").update({ status: "failed", ended_at: new Date().toISOString() }).eq("id", id);
      throw error;
    }
  } else {
    await supabase.from("live_streams").update({ cloudflare_live_input_id: `local-${id}` }).eq("id", id);
  }

  return { id };
}

export async function supabaseLiveBroadcastSession(userId: string, streamId: string) {
  await supabaseSweepLiveStreams();
  const supabase = await createClient();
  const { data } = await supabase.from("live_streams").select("*").eq("id", streamId).maybeSingle();
  const row = data as LiveStreamRecord | null;
  if (!row || row.reporter_id !== userId) {
    throw new Error("That live report was not found.");
  }
  if (row.status === "ended" || row.status === "terminated") {
    throw new Error("This broadcast has already ended.");
  }
  const { data: reporter } = await supabase.from("profiles").select("can_live_stream").eq("id", userId).maybeSingle();
  if (reporter && reporter.can_live_stream === false) {
    throw new Error("live-privilege");
  }

  if (row.cloudflare_live_input_id && isCloudflareLiveConfigured() && !row.cloudflare_live_input_id.startsWith("local-")) {
    const input = await getCloudflareLiveInput(row.cloudflare_live_input_id);
    if (!input.whipUrl) {
      throw new Error("Could not create a broadcast session.");
    }
    return {
      streamId: row.id,
      status: row.status,
      whipUrl: input.whipUrl,
      whepUrl: input.whepUrl,
      protocol: "webrtc" as const,
    };
  }

  return {
    streamId: row.id,
    status: row.status,
    whipUrl: "mock:local",
    whepUrl: null as string | null,
    protocol: "mock" as const,
  };
}

export async function supabaseMarkLiveStream(userId: string, streamId: string, status: "live" | "failed") {
  const supabase = await createClient();
  const { data } = await supabase.from("live_streams").select("id, reporter_id, started_at, status").eq("id", streamId).maybeSingle();
  if (!data || data.reporter_id !== userId) {
    throw new Error("That live report was not found.");
  }
  const wasLive = data.status === "live";
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("live_streams")
    .update({
      status,
      last_seen_at: now,
      started_at: status === "live" ? data.started_at ?? now : data.started_at,
      ended_at: status === "failed" ? now : null,
    })
    .eq("id", streamId);
  if (error) {
    throw new Error(error.message);
  }
  if (status === "live" && !wasLive) {
    try {
      const { supabaseDispatchLiveStarted } = await import("@/lib/data/supabase/notification-repository");
      await supabaseDispatchLiveStarted(streamId);
    } catch {
      // Going live still succeeds if the inbox write fails.
    }
  }
}

export async function supabaseHeartbeatLiveStream(userId: string, streamId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("live_streams")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", streamId)
    .eq("reporter_id", userId)
    .eq("status", "live");
  if (error) {
    throw new Error(error.message);
  }
}

export async function supabaseEndLiveStream(userId: string, streamId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("live_streams").select("*").eq("id", streamId).maybeSingle();
  const row = data as LiveStreamRecord | null;
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
  const started = row.started_at ?? now;
  let recordingUid: string | null = row.recording_asset_id;
  let mediaUrl = "";
  let thumbnailUrl: string | null = null;
  let provider: "cloudflare-stream" | "local" = "local";

  if (row.cloudflare_live_input_id && isCloudflareLiveConfigured() && !row.cloudflare_live_input_id.startsWith("local-")) {
    try {
      await disableCloudflareLiveInput(row.cloudflare_live_input_id);
    } catch {
      // Still archive even if disable fails.
    }
    const recordings = await listCloudflareLiveRecordings(row.cloudflare_live_input_id);
    const ready = recordings.find((item) => item.ready && item.uid) ?? recordings.find((item) => item.uid);
    if (ready?.uid) {
      recordingUid = ready.uid;
      mediaUrl = ready.mediaUrl || cloudflareStreamEmbedUrl(ready.uid);
      thumbnailUrl = ready.thumbnailUrl || cloudflareStreamThumbnailUrl(ready.uid);
      provider = "cloudflare-stream";
    }
  }

  const reportId = row.report_id ?? randomUUID();
  if (!mediaUrl) {
    mediaUrl = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
  }
  if (!recordingUid) {
    recordingUid = row.cloudflare_live_input_id || `local-live-${reportId}`;
  }
  if (!row.report_id) {
    const { error: reportError } = await supabase.from("reports").insert({
      id: reportId,
      created_by: userId,
      request_id: row.coverage_request_id,
      location_id: row.location_id,
      event_id: row.event_id,
      title: row.title,
      description: `Recording of a live firsthand broadcast that started ${started} and ended ${now}. This is a firsthand account, not a verified finding.`,
      captured_at: started,
      uploaded_at: now,
      licensing_status: "view_only",
      publish_status: "published",
      sensitive_content: Boolean(row.sensitive_content),
    });
    if (reportError) {
      throw new Error(reportError.message);
    }
    const { error: mediaError } = await supabase.from("report_media").insert({
      report_id: reportId,
      media_type: "video",
      media_url: mediaUrl,
      thumbnail_url: thumbnailUrl,
      original_filename: "live-recording.mp4",
      captured_at: started,
      licensing_status: "view_only",
      provider,
      provider_asset_id: recordingUid,
      upload_status: "ready",
      ...liveRecordingProvenanceFields(),
    });
    if (mediaError) {
      throw new Error(mediaError.message);
    }
  }

  const { error } = await supabase
    .from("live_streams")
    .update({
      status: "ended",
      ended_at: now,
      last_seen_at: now,
      report_id: reportId,
      recording_asset_id: recordingUid,
    })
    .eq("id", streamId);
  if (error) {
    throw new Error(error.message);
  }
  if (!row.report_id) {
    try {
      const { supabaseDispatchPublishedReport } = await import("@/lib/data/supabase/notification-repository");
      await supabaseDispatchPublishedReport(reportId);
    } catch {
      // The recording is stored even if the inbox write fails.
    }
  }
  return { reportId };
}

export async function supabaseTerminateLiveStream(streamId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("live_streams").select("*").eq("id", streamId).maybeSingle();
  const row = data as LiveStreamRecord | null;
  if (!row) {
    throw new Error("That live report was not found.");
  }
  const now = new Date().toISOString();
  let recordingUid = row.recording_asset_id;
  if (row.cloudflare_live_input_id && isCloudflareLiveConfigured() && !row.cloudflare_live_input_id.startsWith("local-")) {
    try {
      await disableCloudflareLiveInput(row.cloudflare_live_input_id);
    } catch {
      // Keep the moderation record even if disable fails.
    }
    try {
      const recordings = await listCloudflareLiveRecordings(row.cloudflare_live_input_id);
      const ready = recordings.find((item) => item.uid);
      if (ready?.uid) {
        recordingUid = ready.uid;
      }
    } catch {
      recordingUid = recordingUid ?? row.cloudflare_live_input_id;
    }
  }
  if (!recordingUid) {
    recordingUid = row.cloudflare_live_input_id;
  }

  const { error } = await supabase
    .from("live_streams")
    .update({
      status: "terminated",
      ended_at: row.ended_at ?? now,
      last_seen_at: now,
      recording_asset_id: recordingUid,
    })
    .eq("id", streamId);
  if (error) {
    throw new Error(error.message);
  }

  if (row.report_id) {
    await supabase.from("reports").update({ removed_at: now }).eq("id", row.report_id).is("removed_at", null);
  }

  await supabase
    .from("moderation_reports")
    .update({ status: "removed" })
    .eq("content_type", "live_stream")
    .eq("content_id", streamId)
    .eq("status", "open");
}

export async function supabaseSetReporterLivePrivilege(reporterId: string, canLiveStream: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ can_live_stream: canLiveStream }).eq("id", reporterId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function supabaseSetSensitiveContent(input: {
  contentType: "live_stream" | "firsthand_report";
  contentId: string;
  sensitive: boolean;
}) {
  const supabase = await createClient();
  if (input.contentType === "live_stream") {
    const { error } = await supabase
      .from("live_streams")
      .update({ sensitive_content: input.sensitive })
      .eq("id", input.contentId);
    if (error) {
      throw new Error(error.message);
    }
    return;
  }
  const { error } = await supabase
    .from("reports")
    .update({ sensitive_content: input.sensitive })
    .eq("id", input.contentId);
  if (error) {
    throw new Error(error.message);
  }
}
