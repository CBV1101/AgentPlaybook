import type { LicensingStatus, MediaType } from "@/lib/types";

export type StoredMedia = {
  mediaType: MediaType;
  mediaUrl: string;
  thumbnailUrl: string | null;
  originalFilename: string;
  provider: "cloudflare-stream" | "supabase-storage" | "local";
};

export type MediaUploadContext = {
  userId: string;
  reportId: string;
  licensingStatus: LicensingStatus;
};
