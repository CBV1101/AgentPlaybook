import { NextResponse } from "next/server";
import { jsonError, requireUploadUser } from "@/lib/media/http";
import { completeImageMediaUpload } from "@/lib/data";

export async function POST(request: Request) {
  const { user, response } = await requireUploadUser();
  if (!user) {
    return response;
  }

  const body = (await request.json().catch(() => null)) as { mediaId?: string; publicUrl?: string } | null;
  if (!body?.mediaId || !body.publicUrl) {
    return jsonError("Missing image upload details.");
  }

  try {
    await completeImageMediaUpload(user.id, body.mediaId, body.publicUrl);
    return NextResponse.json({ uploadStatus: "ready" });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not finish the photo upload.", 400);
  }
}
