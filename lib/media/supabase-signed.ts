import { createClient } from "@/lib/supabase/server";
import { sha256Hex } from "@/lib/media/hash";
import { logMediaStorageFailure } from "@/lib/media/log";
import { reportImageObjectPath, USER_UPLOAD_FAILED_MESSAGE } from "@/lib/media/limits";
import { REPORT_IMAGES_BUCKET, reportMediaIdentityUrl } from "@/lib/media/supabase-images";

export async function createSupabaseImageUpload(input: {
  userId: string;
  reportId: string;
  filename: string;
  contentType: string;
}) {
  const supabase = await createClient();
  const path = reportImageObjectPath(input.userId, input.reportId, input.filename);
  const { data, error } = await supabase.storage.from(REPORT_IMAGES_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    logMediaStorageFailure(
      {
        operation: "createSignedUploadUrl",
        bucket: REPORT_IMAGES_BUCKET,
        reportId: input.reportId,
        mediaType: "photo",
      },
      error ?? new Error("empty signed upload response"),
    );
    throw new Error(USER_UPLOAD_FAILED_MESSAGE);
  }

  return {
    path,
    token: data.token,
    signedUrl: data.signedUrl,
    publicUrl: reportMediaIdentityUrl(path),
    contentType: input.contentType || "image/jpeg",
  };
}

export async function hashSupabaseImageObject(path: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(REPORT_IMAGES_BUCKET).download(path);
  if (error || !data) {
    logMediaStorageFailure({ operation: "download", mediaType: "photo" }, error ?? new Error("empty download"));
    return null;
  }
  const bytes = new Uint8Array(await data.arrayBuffer());
  return sha256Hex(bytes);
}
