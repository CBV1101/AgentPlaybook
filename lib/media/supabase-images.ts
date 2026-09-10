import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import type { MediaUploadContext, StoredMedia } from "@/lib/media/types";

export const REPORT_IMAGES_BUCKET = "report-images";

export async function uploadSupabaseImage(file: File, context: MediaUploadContext): Promise<StoredMedia> {
  const supabase = await createClient();
  const extension = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase() : ".jpg";
  const path = `${context.userId}/${context.reportId}/${randomUUID()}${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(REPORT_IMAGES_BUCKET).upload(path, bytes, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(REPORT_IMAGES_BUCKET).getPublicUrl(path);

  return {
    mediaType: "photo",
    mediaUrl: data.publicUrl,
    thumbnailUrl: data.publicUrl,
    originalFilename: file.name,
    provider: "supabase-storage",
  };
}
