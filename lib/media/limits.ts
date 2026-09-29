import { randomUUID } from "node:crypto";
import { classifyUpload } from "@/lib/media/classify";

/** Matches the `report-images` bucket `file_size_limit` in SQL. */
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

/** Disk cap for explicit mock local uploads only. */
export const MAX_LOCAL_MEDIA_BYTES = 50 * 1024 * 1024;

export const ALLOWED_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
] as const;

const PHOTO_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "webm", "m4v", "avi", "mkv"]);

export const USER_UPLOAD_FAILED_MESSAGE = "Upload failed. Please try again.";

export function extensionFromFilename(filename: string) {
  const trimmed = filename.trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0 || dot === trimmed.length - 1) {
    return "";
  }
  return trimmed
    .slice(dot + 1)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8);
}

export function safeMediaExtension(filename: string, mediaType: "photo" | "video") {
  const ext = extensionFromFilename(filename);
  if (mediaType === "photo") {
    if (PHOTO_EXTENSIONS.has(ext)) {
      return ext === "jpeg" ? ".jpg" : `.${ext}`;
    }
    return ".jpg";
  }
  if (VIDEO_EXTENSIONS.has(ext)) {
    return `.${ext}`;
  }
  return ".mp4";
}

export function reportImageObjectPath(userId: string, reportId: string, filename: string) {
  const user = userId.replace(/[^a-zA-Z0-9-]/g, "");
  const report = reportId.replace(/[^a-zA-Z0-9-]/g, "");
  if (!user || !report || user !== userId || report !== reportId) {
    throw new Error(USER_UPLOAD_FAILED_MESSAGE);
  }
  return `${userId}/${reportId}/${randomUUID()}${safeMediaExtension(filename, "photo")}`;
}

export function photoUploadRejection(input: { contentType: string; filename: string; fileSize: number }) {
  if (classifyUpload(input.contentType, input.filename) !== "photo") {
    return "Choose a photo to upload.";
  }
  if (input.fileSize <= 0) {
    return "Choose a photo to upload.";
  }
  if (input.fileSize > MAX_PHOTO_BYTES) {
    return "That photo is too large. Use an image under 15 MB.";
  }
  const mime = input.contentType.toLowerCase().split(";")[0]?.trim() ?? "";
  if (mime && !(ALLOWED_PHOTO_MIME_TYPES as readonly string[]).includes(mime)) {
    return "Use a JPEG, PNG, WebP, GIF, or HEIC photo.";
  }
  return null;
}
