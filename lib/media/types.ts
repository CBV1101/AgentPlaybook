import type { MediaProvider, MediaType, MediaUploadStatus } from "@/lib/database.types";

export type CreateMediaSessionInput = {
  userId: string;
  reportId: string;
  mediaType: "photo" | "video";
  filename: string;
  fileSize: number;
  contentType: string;
  capturedAt: string;
  licensingStatus: "view_only" | "licensing_available";
  originalSha256?: string | null;
};

export type MediaUploadSession = {
  mediaId: string;
  protocol: "tus" | "basic" | "local" | "supabase";
  uploadUrl: string;
  token?: string;
  path?: string;
  publicUrl?: string;
  contentType?: string;
  provider: MediaProvider;
  providerAssetId: string | null;
};

export type UploadedMediaRecord = {
  id: string;
  mediaType: MediaType;
  mediaUrl: string;
  thumbnailUrl: string | null;
  originalFilename: string | null;
  provider: MediaProvider;
  providerAssetId: string | null;
  uploadStatus: MediaUploadStatus;
};
