import { NextResponse } from "next/server";
import { jsonError, requireUploadUser } from "@/lib/media/http";
import { markMediaUploadStatus } from "@/lib/data";

export async function POST(request: Request) {
  const { user, response } = await requireUploadUser();
  if (!user) {
    return response;
  }

  const body = (await request.json().catch(() => null)) as {
    mediaId?: string;
    status?: "uploading" | "processing" | "failed";
  } | null;
  if (!body?.mediaId || !body.status) {
    return jsonError("Missing media status.");
  }

  try {
    await markMediaUploadStatus(user.id, body.mediaId, body.status);
    return NextResponse.json({ uploadStatus: body.status });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not update media status.", 400);
  }
}
