export type MediaUploadStatus = "pending" | "uploading" | "processing" | "ready" | "failed";
export type MediaUploadProtocol = "tus" | "basic" | "local" | "supabase";

export const BASIC_VIDEO_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const CREATOR_UPLOAD_TTL_MS = 2 * 60 * 60 * 1000;
export const MAX_STREAM_DURATION_SECONDS = 3600;

export function pendingMediaUrl(kind: "video" | "photo", assetId: string) {
  return `pending://${kind}/${assetId}`;
}

export function preferTus(fileSize: number) {
  return fileSize >= BASIC_VIDEO_UPLOAD_MAX_BYTES;
}
