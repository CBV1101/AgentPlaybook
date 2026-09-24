import {
  cloudflareStreamEmbedUrl,
  cloudflareStreamThumbnailUrl,
} from "@/lib/media/classify";
import {
  CREATOR_UPLOAD_TTL_MS,
  MAX_STREAM_DURATION_SECONDS,
} from "@/lib/media/status";

type CloudflareStreamResult = {
  success: boolean;
  errors?: { message: string }[];
  result?: {
    uid?: string;
    uploadURL?: string;
    thumbnail?: string;
    preview?: string;
    readyToStream?: boolean;
    status?: { state?: string; errorReasonText?: string };
  };
};

function streamConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN?.trim();
  if (!accountId || !apiToken) {
    return null;
  }
  return { accountId, apiToken };
}

export function isCloudflareStreamConfigured() {
  return streamConfig() !== null;
}

function metadataValue(value: string) {
  return Buffer.from(value, "utf8").toString("base64");
}

export async function createCloudflareTusUpload(input: {
  filename: string;
  fileSize: number;
  contentType: string;
  creatorId: string;
  reportId: string;
}) {
  const config = streamConfig();
  if (!config) {
    throw new Error("Cloudflare Stream is not configured.");
  }

  const metadata = [
    `maxDurationSeconds ${metadataValue(String(MAX_STREAM_DURATION_SECONDS))}`,
    `name ${metadataValue(input.filename)}`,
    `filetype ${metadataValue(input.contentType || "video/mp4")}`,
    `creatorid ${metadataValue(input.creatorId)}`,
    `reportid ${metadataValue(input.reportId)}`,
  ].join(",");

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/stream?direct_user=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        "Tus-Resumable": "1.0.0",
        "Upload-Length": String(input.fileSize),
        "Upload-Metadata": metadata,
      },
    },
  );

  const uploadUrl = response.headers.get("location");
  const uid = response.headers.get("stream-media-id");
  if (!response.ok || !uploadUrl || !uid) {
    const payload = (await response.json().catch(() => null)) as CloudflareStreamResult | null;
    throw new Error(payload?.errors?.[0]?.message || "Could not create a resumable video upload.");
  }

  return { uid, uploadUrl };
}

export async function createCloudflareBasicUpload(input: {
  filename: string;
  creatorId: string;
  reportId: string;
}) {
  const config = streamConfig();
  if (!config) {
    throw new Error("Cloudflare Stream is not configured.");
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/stream/direct_upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        maxDurationSeconds: MAX_STREAM_DURATION_SECONDS,
        expiry: new Date(Date.now() + CREATOR_UPLOAD_TTL_MS).toISOString(),
        meta: {
          name: input.filename,
          creatorId: input.creatorId,
          reportId: input.reportId,
        },
      }),
    },
  );

  const payload = (await response.json()) as CloudflareStreamResult;
  const uid = payload.result?.uid;
  const uploadUrl = payload.result?.uploadURL;
  if (!response.ok || !payload.success || !uid || !uploadUrl) {
    throw new Error(payload.errors?.[0]?.message || "Could not create a video upload URL.");
  }

  return { uid, uploadUrl };
}

export async function getCloudflareStreamVideo(uid: string) {
  const config = streamConfig();
  if (!config) {
    throw new Error("Cloudflare Stream is not configured.");
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/stream/${uid}`,
    {
      headers: { Authorization: `Bearer ${config.apiToken}` },
    },
  );
  const payload = (await response.json()) as CloudflareStreamResult;
  if (!response.ok || !payload.success || !payload.result) {
    throw new Error(payload.errors?.[0]?.message || "Could not read video status.");
  }

  const state = payload.result.status?.state ?? "";
  const ready = Boolean(payload.result.readyToStream) || state === "ready";
  const failed = state === "error";

  return {
    uid,
    ready,
    failed,
    error: payload.result.status?.errorReasonText ?? null,
    mediaUrl: cloudflareStreamEmbedUrl(uid),
    thumbnailUrl: payload.result.thumbnail || payload.result.preview || cloudflareStreamThumbnailUrl(uid),
  };
}
