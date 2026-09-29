import { randomUUID } from "node:crypto";
import { toLiveStreamSummary } from "@/lib/data/live-map";
import { assertEventAttachable } from "@/lib/events";
import {
  LIVE_CREATED_TIMEOUT_MS,
  type LiveStreamSummary,
} from "@/lib/live";
import {
  createCloudflareLiveInput,
  disableCloudflareLiveInput,
  getCloudflareLiveInput,
  getCloudflareLiveViewerCount,
  isCloudflareLiveConfigured,
  listCloudflareLiveRecordings,
  resolveCloudflareLiveWhepUrl,
} from "@/lib/media/cloudflare-live";
import { cloudflareStreamEmbedUrl, cloudflareStreamThumbnailUrl } from "@/lib/media/classify";
import { liveRecordingProvenanceFields } from "@/lib/media/provenance";
import {
  assertSupabaseCanMarkLive,
  assertSupabaseLiveCreateAllowed,
  assertSupabaseLiveSessionAllowed,
  isPlaceholderLiveInputId,
  isRealCloudflareLiveInputId,
  LIVE_UNAVAILABLE_CODE,
} from "@/lib/live/fail-closed";
import { isTracedLiveTitle, logLivePublicTrace } from "@/lib/live/public-trace";
import { createClient, createPublicAnonClient } from "@/lib/supabase/server";
import type { LiveStreamRecord, Location } from "@/lib/database.types";

async function supabaseSweepLiveStreams() {
  const supabase = await createClient();
  const now = Date.now();
  const { data } = await supabase
    .from("live_streams")
    .select("id, title, status, last_seen_at, created_at, cloudflare_live_input_id")
    .in("status", ["live", "created"]);
  for (const row of data ?? []) {
    const placeholder = isPlaceholderLiveInputId(row.cloudflare_live_input_id);
    if ((row.status === "live" || row.status === "created") && placeholder) {
      if (isTracedLiveTitle(row.title)) {
        logLivePublicTrace("sweep failing traced stream: placeholder live input");
      }
      await supabase
        .from("live_streams")
        .update({ status: "failed", ended_at: new Date().toISOString() })
        .eq("id", row.id)
        .in("status", ["live", "created"]);
      continue;
    }
    // Do not fail status=live for a stale last_seen_at on this GET path.
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
  const supabase = createPublicAnonClient();
  const locationIds = [...new Set(rows.map((item) => item.location_id))];
  const reporterIds = [...new Set(rows.map((item) => item.reporter_id))];
  const eventIds = [...new Set(rows.flatMap((item) => (item.event_id ? [item.event_id] : [])))];
  const requestIds = [...new Set(rows.flatMap((item) => (item.coverage_request_id ? [item.coverage_request_id] : [])))];

  const [
    { data: locations, error: locationsError },
    { data: profiles, error: profilesError },
    { data: events },
    { data: requests },
  ] = await Promise.all([
    supabase.from("locations").select("*").in("id", locationIds),
    supabase.from("profiles").select("id, display_name, username").in("id", reporterIds),
    eventIds.length ? supabase.from("events").select("id, title").in("id", eventIds) : Promise.resolve({ data: [] }),
    requestIds.length
      ? supabase.from("coverage_requests").select("id, title").in("id", requestIds)
      : Promise.resolve({ data: [] }),
  ]);

  if (locationsError) {
    logLivePublicTrace(`location query error: ${locationsError.message}`);
  }
  if (profilesError) {
    logLivePublicTrace(`reporter query error: ${profilesError.message}`);
  }
  const locationById = new Map((locations ?? []).map((item) => [item.id, item]));
  const profileById = new Map((profiles ?? []).map((item) => [item.id, item]));
  const eventById = new Map((events ?? []).map((item) => [item.id, item.title]));
  const requestById = new Map((requests ?? []).map((item) => [item.id, item.title]));
  const liveWhepByInputId = await resolveLiveWhepUrls(rows);

  const summaries = rows.flatMap((row) => {
    const location = locationById.get(row.location_id);
    const profile = profileById.get(row.reporter_id);
    const traced = isTracedLiveTitle(row.title);
    if (traced) {
      logLivePublicTrace(`hydrate input: yes`);
      logLivePublicTrace(`stream id: ${row.id}`);
      logLivePublicTrace(`title: ${row.title}`);
      logLivePublicTrace(`status: ${row.status}`);
      logLivePublicTrace(`cloudflare_live_input_id: ${row.cloudflare_live_input_id ?? "none"}`);
      logLivePublicTrace(`reporter id: ${row.reporter_id}`);
      logLivePublicTrace(`location id: ${row.location_id}`);
      logLivePublicTrace(`reporter resolved: ${profile ? "yes" : "no"}`);
      logLivePublicTrace(`location resolved: ${location ? "yes" : "no"}`);
    }
    if (!location || !profile) {
      if (process.env.NODE_ENV === "development" && row.status === "live") {
        logLivePublicTrace(
          `public summary dropped: location ${location ? "yes" : "no"} reporter ${profile ? "yes" : "no"} title: ${row.title}`,
        );
      }
      return [];
    }
    const liveInputId = row.cloudflare_live_input_id;
    const summary = toLiveStreamSummary({
      row,
      location: location as Location,
      reporterName: profile.display_name,
      reporterUsername: profile.username,
      eventTitle: row.event_id ? eventById.get(row.event_id) ?? null : null,
      requestTitle: row.coverage_request_id ? requestById.get(row.coverage_request_id) ?? null : null,
      includeModerationPlayback,
      liveWhepUrl: liveInputId ? liveWhepByInputId.get(liveInputId) ?? null : null,
    });
    if (traced) {
      logLivePublicTrace("summary: yes");
      logLivePublicTrace("summary source: real");
      logLivePublicTrace(`summary status: ${summary.status}`);
      logLivePublicTrace(`summary playback kind: ${summary.playbackKind}`);
      logLivePublicTrace(
        `summary WHEP: ${summary.playbackKind === "whep" && summary.playbackUrl ? "yes" : "no"}`,
      );
    }
    return [summary];
  });
  if (process.env.NODE_ENV === "development") {
    for (const summary of summaries) {
      if (summary.status !== "live") {
        continue;
      }
      console.info(`[Firsthand Live] title: ${summary.title}`);
      console.info(`[Firsthand Live] playback kind: ${summary.playbackKind}`);
      console.info(
        `[Firsthand Live] WHEP present: ${summary.playbackKind === "whep" && summary.playbackUrl ? "yes" : "no"}`,
      );
    }
  }
  return summaries;
}

async function resolveLiveWhepUrls(rows: LiveStreamRecord[]) {
  const urls = new Map<string, string>();
  if (!isCloudflareLiveConfigured()) {
    if (process.env.NODE_ENV === "development") {
      console.info("[Firsthand Live] Cloudflare configured: no");
    }
    return urls;
  }
  if (process.env.NODE_ENV === "development") {
    console.info("[Firsthand Live] Cloudflare configured: yes");
  }
  const traced = rows.find((row) => isTracedLiveTitle(row.title));
  if (traced) {
    if (traced.status !== "live") {
      logLivePublicTrace(`resolveLiveWhepUrls skipped: status ${traced.status}`);
    } else if (!isRealCloudflareLiveInputId(traced.cloudflare_live_input_id)) {
      logLivePublicTrace("resolveLiveWhepUrls skipped: live input is not a real Cloudflare id");
    }
  }
  const liveRows = rows.filter(
    (row) => row.status === "live" && isRealCloudflareLiveInputId(row.cloudflare_live_input_id),
  );
  for (const row of liveRows) {
    if (isTracedLiveTitle(row.title)) {
      logLivePublicTrace("resolveLiveWhepUrls received traced stream: yes");
    }
  }
  const ids = [...new Set(liveRows.map((row) => row.cloudflare_live_input_id!))];
  await Promise.all(
    ids.map(async (id) => {
      const traced = liveRows.some((row) => row.cloudflare_live_input_id === id && isTracedLiveTitle(row.title));
      try {
        const url = await resolveCloudflareLiveWhepUrl(id);
        if (traced) {
          logLivePublicTrace(`WHEP resolved: ${url ? "yes" : "no"}`);
        }
        if (url) {
          urls.set(id, url);
        }
      } catch {
        if (traced) {
          logLivePublicTrace("Cloudflare lookup: fail");
          logLivePublicTrace("WHEP resolved: no");
        }
        // Leave WHEP unset rather than substituting the Cloudflare iframe.
      }
    }),
  );
  return urls;
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
  const supabase = createPublicAnonClient();
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
  const { data, error } = await query.order("started_at", { ascending: false });
  if (error) {
    logLivePublicTrace(`raw query error: ${error.message}`);
  }
  const rows = (data ?? []) as LiveStreamRecord[];
  const tracedRow = rows.find((row) => isTracedLiveTitle(row.title));
  logLivePublicTrace(`raw query row count: ${rows.length}`);
  logLivePublicTrace(`raw query test: ${tracedRow ? "yes" : "no"}`);
  if (tracedRow) {
    logLivePublicTrace(`stream id: ${tracedRow.id}`);
    logLivePublicTrace(`title: ${tracedRow.title}`);
    logLivePublicTrace(`status: ${tracedRow.status}`);
    logLivePublicTrace(`cloudflare_live_input_id: ${tracedRow.cloudflare_live_input_id ?? "none"}`);
    logLivePublicTrace(`reporter id: ${tracedRow.reporter_id}`);
    logLivePublicTrace(`location id: ${tracedRow.location_id}`);
  }
  const summaries = await hydrateLiveRows(rows);
  logLivePublicTrace(`hydrate test: ${summaries.some((item) => isTracedLiveTitle(item.title)) ? "yes" : "no"}`);
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
  try {
    assertSupabaseLiveCreateAllowed(isCloudflareLiveConfigured());
  } catch (error) {
    console.error("[firsthand] live create blocked", { operation: "cloudflare-unconfigured" });
    throw error;
  }

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
    console.error("[firsthand] live create failed", {
      operation: "cloudflare-live-input",
      streamId: id,
      error: error instanceof Error ? error.message : "unknown",
    });
    throw new Error(LIVE_UNAVAILABLE_CODE);
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

  const liveInputId = row.cloudflare_live_input_id;
  try {
    assertSupabaseLiveSessionAllowed(isCloudflareLiveConfigured(), liveInputId);
  } catch (error) {
    console.error("[firsthand] live session blocked", { operation: "invalid-live-input", streamId: row.id });
    throw error;
  }
  if (!isRealCloudflareLiveInputId(liveInputId)) {
    throw new Error(LIVE_UNAVAILABLE_CODE);
  }

  const input = await getCloudflareLiveInput(liveInputId);
  if (!input.whipUrl) {
    throw new Error(LIVE_UNAVAILABLE_CODE);
  }
  return {
    streamId: row.id,
    status: row.status,
    whipUrl: input.whipUrl,
    whepUrl: input.whepUrl,
    protocol: "webrtc" as const,
  };
}

export async function supabaseMarkLiveStream(userId: string, streamId: string, status: "live" | "failed") {
  const supabase = await createClient();
  const { data } = await supabase.from("live_streams").select("id, reporter_id, started_at, status, cloudflare_live_input_id").eq("id", streamId).maybeSingle();
  if (!data || data.reporter_id !== userId) {
    throw new Error("That live report was not found.");
  }
  if (status === "live") {
    try {
      assertSupabaseCanMarkLive(data.cloudflare_live_input_id);
    } catch (error) {
      console.error("[firsthand] live start blocked", { operation: "invalid-live-input", streamId });
      throw error;
    }
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
  if (row.status === "ended") {
    return { reportId: row.report_id };
  }

  const now = new Date().toISOString();
  const started = row.started_at ?? now;
  let recordingUid: string | null = row.recording_asset_id;
  let mediaUrl = "";
  let thumbnailUrl: string | null = null;
  let provider: "cloudflare-stream" | "local" = "local";

  const liveInputId = row.cloudflare_live_input_id;
  if (isRealCloudflareLiveInputId(liveInputId) && isCloudflareLiveConfigured()) {
    try {
      await disableCloudflareLiveInput(liveInputId);
    } catch {
      // Still archive even if disable fails.
    }
    try {
      const recordings = await listCloudflareLiveRecordings(liveInputId);
      const ready = recordings.find((item) => item.ready && item.uid) ?? recordings.find((item) => item.uid);
      if (ready?.uid && isRealCloudflareLiveInputId(ready.uid)) {
        recordingUid = ready.uid;
        mediaUrl = ready.mediaUrl || cloudflareStreamEmbedUrl(ready.uid);
        thumbnailUrl = ready.thumbnailUrl || cloudflareStreamThumbnailUrl(ready.uid);
        provider = "cloudflare-stream";
      }
    } catch (error) {
      console.error("[firsthand] live recording lookup failed", {
        operation: "list-live-recordings",
        streamId,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  const reportId = row.report_id ?? (mediaUrl ? randomUUID() : null);
  if (!row.report_id && mediaUrl && reportId && provider === "cloudflare-stream") {
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
  if (!row.report_id && reportId) {
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
  const terminateInputId = row.cloudflare_live_input_id;
  if (isRealCloudflareLiveInputId(terminateInputId) && isCloudflareLiveConfigured()) {
    try {
      await disableCloudflareLiveInput(terminateInputId);
    } catch {
      // Keep the moderation record even if disable fails.
    }
    try {
      const recordings = await listCloudflareLiveRecordings(terminateInputId);
      const ready = recordings.find((item) => item.uid);
      if (ready?.uid && isRealCloudflareLiveInputId(ready.uid)) {
        recordingUid = ready.uid;
      }
    } catch {
      recordingUid = isRealCloudflareLiveInputId(recordingUid) ? recordingUid : null;
    }
  }
  if (!isRealCloudflareLiveInputId(recordingUid)) {
    recordingUid = null;
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
