import { isRealCloudflareLiveInputId } from "@/lib/live/fail-closed";
import {
  getCloudflareLiveInput,
  isCloudflareLiveConfigured,
  listCloudflareLiveInputsForDev,
  resolveCloudflareLiveWhepUrl,
} from "@/lib/media/cloudflare-live";
import { createPublicAnonClient } from "@/lib/supabase/server";

function logDev(message: string) {
  console.info(`[Firsthand CF WHEP TEST] ${message}`);
}

export async function getDevReferenceWhepPlaybackUrl() {
  if (!isCloudflareLiveConfigured()) {
    logDev("Cloudflare configured: no");
    return { whepUrl: null as string | null, streamId: null as string | null, inputId: null as string | null };
  }

  try {
    const listed = await listCloudflareLiveInputsForDev();
    logDev(`list count: ${listed.length}`);
    for (const item of listed) {
      logDev(`list input ID: ${item.id}`);
      logDev(`list enabled: ${item.enabled ? "yes" : "no"}`);
      logDev(
        `list status present=${item.status.present} kind=${item.status.kind} state=${item.status.state} currentState=${item.status.currentState} keys=${item.status.keys} connectedHelper=${item.status.connectedHelper ? "yes" : "no"}`,
      );
      logDev(`list webRTCPlayback object present: ${item.webRTCPlaybackObject}`);
      logDev(`list webRTCPlayback.url present: ${item.webRTCPlaybackUrl}`);
    }
  } catch (error) {
    logDev(`list failed: ${error instanceof Error ? error.message : "unknown"}`);
  }

  const supabase = createPublicAnonClient();
  const { data, error } = await supabase
    .from("live_streams")
    .select("id, cloudflare_live_input_id, started_at")
    .eq("status", "live")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    logDev(`Firsthand live query error: ${error.message}`);
    return { whepUrl: null, streamId: null, inputId: null };
  }
  if (!data) {
    logDev("Firsthand live row: none");
    return { whepUrl: null, streamId: null, inputId: null };
  }

  const streamId = data.id;
  const inputId = data.cloudflare_live_input_id;
  logDev(`active Firsthand stream ID: ${streamId}`);
  logDev(`active Cloudflare input ID: ${inputId ?? "none"}`);
  if (!isRealCloudflareLiveInputId(inputId)) {
    logDev("active input is not a real Cloudflare Live Input id");
    return { whepUrl: null, streamId, inputId: inputId ?? null };
  }

  const input = await getCloudflareLiveInput(inputId);
  logDev(`GET input ID: ${input.uid}`);
  logDev(`GET enabled: ${input.enabled ? "yes" : "no"}`);
  logDev(
    `GET status present=${input.statusSummary.present} kind=${input.statusSummary.kind} state=${input.statusSummary.state} currentState=${input.statusSummary.currentState} keys=${input.statusSummary.keys} connectedHelper=${input.statusSummary.connectedHelper ? "yes" : "no"}`,
  );
  logDev(`GET webRTCPlayback object present: ${input.webRTCPlaybackPresent ? "yes" : "no"}`);
  logDev(`GET webRTCPlayback.url present: ${input.whepUrl ? "yes" : "no"}`);

  const playUrl =
    input.whepUrl &&
    input.whepUrl.startsWith("https://") &&
    input.whepUrl.includes("/webRTC/play") &&
    !input.whepUrl.includes("/webRTC/publish")
      ? input.whepUrl
      : await resolveCloudflareLiveWhepUrl(inputId);
  logDev(`WHEP URL present: ${playUrl ? "yes" : "no"}`);
  logDev(`selection: Firsthand live row → GET exact Live Input (not list connected filter)`);
  return { whepUrl: playUrl, streamId, inputId };
}
