import { NextResponse } from "next/server";
import { completeLocalMediaUpload, markMediaUploadStatus } from "@/lib/data";
import { jsonError, requireUploadUser } from "@/lib/media/http";
import { classifyUpload } from "@/lib/media/classify";
import { MAX_LOCAL_MEDIA_BYTES, photoUploadRejection } from "@/lib/media/limits";
import { localMediaEndpointDenied } from "@/lib/media/local-mode";

export const maxDuration = 120;

export async function POST(request: Request) {
  const denied = localMediaEndpointDenied();
  if (denied) {
    return jsonError(denied.error, denied.status);
  }

  const { user, response } = await requireUploadUser();
  if (!user) {
    return response;
  }

  const form = await request.formData();
  const mediaId = String(form.get("mediaId") ?? "");
  const file = form.get("file");
  if (!mediaId || !(file instanceof File) || file.size === 0) {
    return jsonError("Missing the file to store locally.");
  }
  if (file.size > MAX_LOCAL_MEDIA_BYTES) {
    return jsonError("That file is too large to store locally.");
  }

  const kind = classifyUpload(file.type, file.name);
  if (!kind) {
    return jsonError("Use a photo or video file.");
  }
  if (kind === "photo") {
    const rejected = photoUploadRejection({
      contentType: file.type,
      filename: file.name,
      fileSize: file.size,
    });
    if (rejected) {
      return jsonError(rejected);
    }
  }

  try {
    await markMediaUploadStatus(user.id, mediaId, "uploading");
    const bytes = new Uint8Array(await file.arrayBuffer());
    await completeLocalMediaUpload({
      userId: user.id,
      mediaId,
      filename: file.name,
      bytes,
    });
    return NextResponse.json({ uploadStatus: "ready" });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not store the file.", 400);
  }
}
