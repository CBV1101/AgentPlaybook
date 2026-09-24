import { NextResponse } from "next/server";
import { completeLocalMediaUpload, markMediaUploadStatus } from "@/lib/data";
import { jsonError, requireUploadUser } from "@/lib/media/http";

export const maxDuration = 120;

export async function POST(request: Request) {
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
