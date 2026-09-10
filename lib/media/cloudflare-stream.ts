import {
  cloudflareStreamEmbedUrl,
  cloudflareStreamThumbnailUrl,
} from "@/lib/media/classify";
import type { StoredMedia } from "@/lib/media/types";

type CloudflareStreamResult = {
  success: boolean;
  errors?: { message: string }[];
  result?: {
    uid: string;
    thumbnail?: string;
    playback?: { hls?: string };
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

export async function uploadCloudflareStream(file: File): Promise<StoredMedia> {
  const config = streamConfig();
  if (!config) {
    throw new Error("Cloudflare Stream is not configured.");
  }

  const body = new FormData();
  body.set("file", file, file.name);
  body.set("meta", JSON.stringify({ name: file.name, filename: file.name }));

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/stream`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
      },
      body,
    },
  );

  const payload = (await response.json()) as CloudflareStreamResult;
  if (!response.ok || !payload.success || !payload.result?.uid) {
    const message = payload.errors?.[0]?.message || "Cloudflare Stream upload failed.";
    throw new Error(message);
  }

  const uid = payload.result.uid;
  return {
    mediaType: "video",
    mediaUrl: cloudflareStreamEmbedUrl(uid),
    thumbnailUrl: payload.result.thumbnail || cloudflareStreamThumbnailUrl(uid),
    originalFilename: file.name,
    provider: "cloudflare-stream",
  };
}
