import { NextResponse } from "next/server";
import { jsonError, requireUploadUser } from "@/lib/media/http";
import { completeImageMediaUpload } from "@/lib/data";
import { USER_UPLOAD_FAILED_MESSAGE } from "@/lib/media/limits";

export async function POST(request: Request) {
  const { user, response } = await requireUploadUser();
  if (!user) {
    return response;
  }

  const body = (await request.json().catch(() => null)) as { mediaId?: string; publicUrl?: string } | null;
  if (!body?.mediaId) {
    return jsonError("Missing image upload details.");
  }

  try {
    await completeImageMediaUpload(user.id, body.mediaId);
    return NextResponse.json({ uploadStatus: "ready" });
  } catch {
    return jsonError(USER_UPLOAD_FAILED_MESSAGE, 400);
  }
}
