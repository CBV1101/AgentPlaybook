import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { sha256Hex } from "@/lib/media/hash";
import { REPORT_IMAGES_BUCKET } from "@/lib/media/supabase-images";

export async function createSupabaseImageUpload(input: {
  userId: string;
  reportId: string;
  filename: string;
  contentType: string;
}) {
  const supabase = await createClient();
  const extension = input.filename.includes(".")
    ? input.filename.slice(input.filename.lastIndexOf(".")).toLowerCase()
    : ".jpg";
  const path = `${input.userId}/${input.reportId}/${randomUUID()}${extension}`;
  const { data, error } = await supabase.storage.from(REPORT_IMAGES_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    throw new Error(error?.message || "Could not create an image upload URL.");
  }

  const { data: publicUrl } = supabase.storage.from(REPORT_IMAGES_BUCKET).getPublicUrl(path);
  return {
    path,
    token: data.token,
    signedUrl: data.signedUrl,
    publicUrl: publicUrl.publicUrl,
    contentType: input.contentType || "image/jpeg",
  };
}

export async function hashSupabaseImageObject(path: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(REPORT_IMAGES_BUCKET).download(path);
  if (error || !data) {
    return null;
  }
  const bytes = new Uint8Array(await data.arrayBuffer());
  return sha256Hex(bytes);
}
