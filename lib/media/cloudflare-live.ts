import { cloudflareStreamEmbedUrl, cloudflareStreamThumbnailUrl } from "@/lib/media/classify";

type CloudflareLiveResult = {
  success: boolean;
  errors?: { message: string }[];
  result?: CloudflareLiveInput;
};

type CloudflareLiveInput = {
  uid?: string;
  status?: string | null;
  enabled?: boolean;
  webRTC?: { url?: string };
  webRTCPlayback?: { url?: string };
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

function streamConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN?.trim();
  if (!accountId || !apiToken) {
    return null;
  }
  return { accountId, apiToken };
}

export function isCloudflareLiveConfigured() {
  return streamConfig() !== null;
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

export async function getCloudflareLiveInput(uid: string) {
  const response = await streamFetch(`/stream/live_inputs/${uid}`);
  const payload = (await response.json()) as CloudflareLiveResult;
  if (!response.ok || !payload.success || !payload.result?.uid) {
    throw new Error(payload.errors?.[0]?.message || "Could not read the live input.");
  }
  const status = String(payload.result.status ?? "");
  return {
    uid: payload.result.uid,
    connected: status === "connected",
    enabled: payload.result.enabled !== false,
    whipUrl: payload.result.webRTC?.url ?? null,
    whepUrl: payload.result.webRTCPlayback?.url ?? null,
  };
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
