import { isMockMode } from "@/lib/data/mode";
import { isImageFile, isVideoFile } from "@/lib/media/classify";
import { isCloudflareStreamConfigured, uploadCloudflareStream } from "@/lib/media/cloudflare-stream";
import { uploadLocalMedia } from "@/lib/media/local";
import { uploadSupabaseImage } from "@/lib/media/supabase-images";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { MediaUploadContext, StoredMedia } from "@/lib/media/types";

export async function storeReportMedia(files: File[], context: MediaUploadContext): Promise<StoredMedia[]> {
  const stored: StoredMedia[] = [];

  for (const file of files) {
    if (!file.size) {
      continue;
    }
    if (isVideoFile(file)) {
      stored.push(await storeVideo(file));
      continue;
    }
    if (isImageFile(file)) {
      stored.push(await storeImage(file, context));
      continue;
    }
    throw new Error("Only photos and video can be published as firsthand media.");
  }

  return stored;
}

async function storeVideo(file: File): Promise<StoredMedia> {
  if (isMockMode() || !isCloudflareStreamConfigured()) {
    return uploadLocalMedia(file);
  }
  return uploadCloudflareStream(file);
}

async function storeImage(file: File, context: MediaUploadContext): Promise<StoredMedia> {
  if (isMockMode() || !isSupabaseConfigured()) {
    return uploadLocalMedia(file);
  }
  return uploadSupabaseImage(file, context);
}
