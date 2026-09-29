import { randomUUID } from "node:crypto";
import { REPORT_IMAGES_BUCKET, REPORTER_AVATARS_BUCKET } from "@/lib/media/supabase-images";
import { createClient } from "@/lib/supabase/server";
import { avatarExtension } from "@/lib/profile";

function avatarObjectFromPublicUrl(url: string, userId: string) {
  for (const bucket of [REPORTER_AVATARS_BUCKET, REPORT_IMAGES_BUCKET]) {
    const marker = `/object/public/${bucket}/`;
    const index = url.indexOf(marker);
    if (index === -1) {
      continue;
    }
    const path = decodeURIComponent(url.slice(index + marker.length).split("?")[0] ?? "");
    if (path.startsWith(`${userId}/avatar/`)) {
      return { bucket, path };
    }
  }
  return null;
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
  const { error } = await supabase.storage.from(REPORTER_AVATARS_BUCKET).upload(path, input.bytes, {
    contentType: input.contentType || "image/jpeg",
    upsert: false,
  });
  if (error) {
    throw new Error(error.message);
  }
  const { data } = supabase.storage.from(REPORTER_AVATARS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function removeSupabaseReporterAvatar(userId: string, avatarUrl: string | null) {
  if (!avatarUrl) {
    return;
  }
  const object = avatarObjectFromPublicUrl(avatarUrl, userId);
  if (!object) {
    return;
  }
  const supabase = await createClient();
  await supabase.storage.from(object.bucket).remove([object.path]);
}
