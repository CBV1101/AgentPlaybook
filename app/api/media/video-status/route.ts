import { NextResponse } from "next/server";
import { jsonError, requireUploadUser } from "@/lib/media/http";
import { markMediaUploadStatus, refreshVideoMediaStatus } from "@/lib/data";

export async function POST(request: Request) {
  const { user, response } = await requireUploadUser();
  if (!user) {
    return response;
  }

  const body = (await request.json().catch(() => null)) as { mediaId?: string; markFailed?: boolean } | null;
  if (!body?.mediaId) {
    return jsonError("Missing media.");
  }

  try {
    if (body.markFailed) {
      await markMediaUploadStatus(user.id, body.mediaId, "failed");
      return NextResponse.json({ uploadStatus: "failed" });
    }
    const status = await refreshVideoMediaStatus(user.id, body.mediaId);
    return NextResponse.json(status);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not refresh video status.", 400);
  }
}
