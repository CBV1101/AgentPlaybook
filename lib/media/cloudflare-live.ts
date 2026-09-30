import { cloudflareCustomerWhepPlaybackUrl } from "@/lib/live/customer-player";
import type { CloudflareIngestObservation } from "@/lib/live";
import { cloudflareStreamEmbedUrl, cloudflareStreamThumbnailUrl } from "@/lib/media/classify";

type CloudflareLiveResult = {
  success: boolean;
  errors?: { message: string }[];
  result?: CloudflareLiveInput;
};

type CloudflareLiveInput = {
  uid?: string;
  status?: unknown;
  enabled?: boolean;
  webRTC?: { url?: string };
  webRTCPlayback?: { url?: string };
  playback?: { hls?: string; dash?: string };
};

type CloudflareVideoList = {
  success: boolean;
  errors?: { message: string }[];
  result?: Array<{
    uid?: string;
    thumbnail?: string;
    preview?: string;
    readyToStream?: boolean;
    status?: { state?: string };
    liveInput?: string;
  }>;
};

export function isCloudflareLiveInputConnected(status: unknown) {
  if (typeof status === "string") {
    return status.trim().toLowerCase() === "connected";
  }
  if (!status || typeof status !== "object") {
    return false;
  }
  const row = status as Record<string, unknown>;
  const current = row.current && typeof row.current === "object" ? (row.current as Record<string, unknown>) : null;
  const values = [row.state, current?.state, row.status];
  return values.some((value) => String(value ?? "").trim().toLowerCase() === "connected");
}

export function cloudflareIngestFromLiveInputStatus(status: unknown): CloudflareIngestObservation {
  if (status == null) {
    return "unknown";
  }
  return isCloudflareLiveInputConnected(status) ? "connected" : "disconnected";
}

export function isCloudflareLiveConfigured(env: Record<string, string | undefined> = process.env as Record<string, string | undefined>) {
  return Boolean(env.CLOUDFLARE_ACCOUNT_ID?.trim() && env.CLOUDFLARE_STREAM_API_TOKEN?.trim());
}

function streamConfig(env: Record<string, string | undefined> = process.env as Record<string, string | undefined>) {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = env.CLOUDFLARE_STREAM_API_TOKEN?.trim();
  if (!accountId || !apiToken) {
    return null;
  }
  return { accountId, apiToken };
}

async function streamFetch(path: string, init?: RequestInit) {
  const config = streamConfig();
  if (!config) {
    throw new Error("Cloudflare Stream is not configured.");
  }
  return fetch(`https://api.cloudflare.com/client/v4/accounts/${config.accountId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

export async function createCloudflareLiveInput(input: {
  name: string;
  streamId: string;
  reporterId: string;
}) {
  const response = await streamFetch("/stream/live_inputs", {
    method: "POST",
    body: JSON.stringify({
      meta: {
        name: input.name,
        firsthandStreamId: input.streamId,
        reporterId: input.reporterId,
      },
      recording: {
        mode: "automatic",
        timeoutSeconds: 30,
        requireSignedURLs: false,
      },
    }),
  });
  const payload = (await response.json()) as CloudflareLiveResult;
  const uid = payload.result?.uid;
  const whipUrl = payload.result?.webRTC?.url;
  const whepUrl = payload.result?.webRTCPlayback?.url;
  if (!response.ok || !payload.success || !uid) {
    throw new Error(payload.errors?.[0]?.message || "Could not create a live input.");
  }
  return {
    uid,
    whipUrl: whipUrl ?? null,
    whepUrl: whepUrl ?? null,
  };
}

export async function getCloudflareLiveViewerCount(uid: string): Promise<number | null> {
  const response = await streamFetch(`/stream/live_inputs/${uid}`);
  const payload = (await response.json()) as {
    success?: boolean;
    result?: Record<string, unknown>;
  };
  if (!response.ok || !payload.success || !payload.result) {
    return null;
  }
  const result = payload.result;
  const status = result.status;
  const nested =
    status && typeof status === "object" && !Array.isArray(status)
      ? (status as Record<string, unknown>)
      : null;
  const candidates = [
    result.currentViewers,
    result.current_viewers,
    result.viewers,
    nested?.currentViewers,
    nested?.current_viewers,
  ];
  for (const value of candidates) {
    const count = Number(value);
    if (Number.isFinite(count) && count >= 0) {
      return Math.round(count);
    }
  }
  return null;
}

export function summarizeCloudflareLiveInputStatus(status: unknown) {
  if (status == null) {
    return { present: "no" as const, kind: "none" as const, connectedHelper: false, state: "none", currentState: "none", keys: "none" };
  }
  if (typeof status === "string") {
    return {
      present: "yes" as const,
      kind: "string" as const,
      connectedHelper: isCloudflareLiveInputConnected(status),
      state: status.trim().toLowerCase() || "none",
      currentState: "none",
      keys: "none",
    };
  }
  if (typeof status === "object") {
    const row = status as Record<string, unknown>;
    const current = row.current && typeof row.current === "object" ? (row.current as Record<string, unknown>) : null;
    return {
      present: "yes" as const,
      kind: "object" as const,
      connectedHelper: isCloudflareLiveInputConnected(status),
      state: String(row.state ?? "none"),
      currentState: String(current?.state ?? "none"),
      keys: Object.keys(row).join(",") || "none",
    };
  }
  return {
    present: "yes" as const,
    kind: "other" as const,
    connectedHelper: false,
    state: "none",
    currentState: "none",
    keys: "none",
  };
}

export async function listCloudflareLiveInputsForDev() {
  const response = await streamFetch("/stream/live_inputs");
  const payload = (await response.json()) as {
    success?: boolean;
    errors?: { message: string }[];
    result?: CloudflareLiveInput[] | { liveInputs?: CloudflareLiveInput[] };
  };
  if (!response.ok || !payload.success) {
    throw new Error(payload.errors?.[0]?.message || "Could not list live inputs.");
  }
  const rows = Array.isArray(payload.result)
    ? payload.result
    : Array.isArray(payload.result?.liveInputs)
      ? payload.result.liveInputs
      : [];
  return rows.map((item) => ({
    id: item.uid ?? "none",
    enabled: item.enabled !== false,
    status: summarizeCloudflareLiveInputStatus(item.status),
    webRTCPlaybackObject: item.webRTCPlayback ? "yes" : "no",
    webRTCPlaybackUrl: item.webRTCPlayback?.url ? "yes" : "no",
  }));
}

export async function getCloudflareLiveInput(uid: string) {
  const response = await streamFetch(`/stream/live_inputs/${uid}`);
  const payload = (await response.json()) as CloudflareLiveResult;
  if (process.env.NODE_ENV === "development") {
    console.info(`[Firsthand Live] Cloudflare lookup HTTP: ${response.status}`);
    console.info(`[Firsthand Live] Cloudflare lookup: ${response.ok && payload.success && payload.result?.uid ? "success" : "fail"}`);
    console.info(`[Firsthand Live] webRTCPlayback.url present: ${payload.result?.webRTCPlayback?.url ? "yes" : "no"}`);
    console.info(`[Firsthand Live] HLS present: ${payload.result?.playback?.hls ? "yes" : "no"}`);
    console.info(`[Firsthand Live] DASH present: ${payload.result?.playback?.dash ? "yes" : "no"}`);
  }
  if (!response.ok || !payload.success || !payload.result?.uid) {
    throw new Error(payload.errors?.[0]?.message || "Could not read the live input.");
  }
  const status = payload.result.status;
  return {
    uid: payload.result.uid,
    connected: isCloudflareLiveInputConnected(status),
    ingest: cloudflareIngestFromLiveInputStatus(status),
    enabled: payload.result.enabled !== false,
    statusSummary: summarizeCloudflareLiveInputStatus(status),
    webRTCPlaybackPresent: Boolean(payload.result.webRTCPlayback),
    whipUrl: payload.result.webRTC?.url ?? null,
    whepUrl: payload.result.webRTCPlayback?.url ?? null,
    playbackHls: payload.result.playback?.hls ?? null,
    playbackDash: payload.result.playback?.dash ?? null,
  };
}

export function whepPlaybackUrlFromLiveInput(
  liveInputId: string,
  input: { whepUrl: string | null; playbackHls: string | null; playbackDash: string | null },
) {
  const candidates = [input.whepUrl, input.playbackHls, input.playbackDash];
  for (const candidate of candidates) {
    const value = candidate?.trim() ?? "";
    if (!value.startsWith("https://") || value.includes("/webRTC/publish")) {
      continue;
    }
    if (value.includes("/webRTC/play")) {
      return value;
    }
    const derived = cloudflareCustomerWhepPlaybackUrl(liveInputId, value);
    if (derived) {
      return derived;
    }
  }
  return null;
}

export async function resolveCloudflareLiveWhepUrl(liveInputId: string): Promise<string | null> {
  const input = await getCloudflareLiveInput(liveInputId);
  return whepPlaybackUrlFromLiveInput(liveInputId, input);
}

export async function disableCloudflareLiveInput(uid: string) {
  const response = await streamFetch(`/stream/live_inputs/${uid}`, {
    method: "PUT",
    body: JSON.stringify({ enabled: false }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as CloudflareLiveResult | null;
    throw new Error(payload?.errors?.[0]?.message || "Could not stop the live input.");
  }
}

export async function listCloudflareLiveRecordings(liveInputId: string) {
  const response = await streamFetch(`/stream/live_inputs/${liveInputId}/videos`);
  const payload = (await response.json()) as CloudflareVideoList;
  if (!response.ok || !payload.success) {
    throw new Error(payload.errors?.[0]?.message || "Could not load live recordings.");
  }
  return (payload.result ?? []).map((item) => {
    const uid = item.uid ?? "";
    const state = item.status?.state ?? "";
    const ready = Boolean(item.readyToStream) || state === "ready";
    return {
      uid,
      ready,
      live: state === "live-inprogress",
      mediaUrl: uid ? cloudflareStreamEmbedUrl(uid) : "",
      thumbnailUrl: item.thumbnail || item.preview || (uid ? cloudflareStreamThumbnailUrl(uid) : null),
    };
  });
}
