import { randomUUID } from "node:crypto";
import { REPORT_IMAGES_BUCKET } from "@/lib/media/supabase-images";
import { createClient } from "@/lib/supabase/server";
import { avatarExtension } from "@/lib/profile";

function avatarPathFromPublicUrl(url: string, userId: string) {
  const marker = `/object/public/${REPORT_IMAGES_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) {
    return null;
  }
  const path = decodeURIComponent(url.slice(index + marker.length).split("?")[0] ?? "");
  if (!path.startsWith(`${userId}/avatar/`)) {
    return null;
  }
  return path;
}

export async function uploadSupabaseReporterAvatar(input: {
  userId: string;
  bytes: Uint8Array;
  filename: string;
  contentType: string;
  previousUrl: string | null;
}) {
  const supabase = await createClient();
  await removeSupabaseReporterAvatar(input.userId, input.previousUrl);
  const path = `${input.userId}/avatar/${randomUUID()}${avatarExtension(input.filename, input.contentType)}`;
  const { error } = await supabase.storage.from(REPORT_IMAGES_BUCKET).upload(path, input.bytes, {
    contentType: input.contentType || "image/jpeg",
    upsert: false,
  });
  if (error) {
    throw new Error(error.message);
  }
  const { data } = supabase.storage.from(REPORT_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function removeSupabaseReporterAvatar(userId: string, avatarUrl: string | null) {
  if (!avatarUrl) {
    return;
  }
  const path = avatarPathFromPublicUrl(avatarUrl, userId);
  if (!path) {
    return;
  }
  const supabase = await createClient();
  await supabase.storage.from(REPORT_IMAGES_BUCKET).remove([path]);
}
