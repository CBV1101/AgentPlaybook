import { NextResponse } from "next/server";
import { classifyUpload } from "@/lib/media/classify";
import { jsonError, requireUploadUser } from "@/lib/media/http";
import { photoUploadRejection, USER_UPLOAD_FAILED_MESSAGE } from "@/lib/media/limits";
import { parseOriginalSha256 } from "@/lib/media/provenance";
import { createMediaUploadSession } from "@/lib/data";

export async function POST(request: Request) {
  const { user, response } = await requireUploadUser();
  if (!user) {
    return response;
  }

  const body = (await request.json().catch(() => null)) as {
    reportId?: string;
    filename?: string;
    fileSize?: number;
    contentType?: string;
    capturedAt?: string;
    licensingStatus?: "view_only" | "licensing_available";
    originalSha256?: string;
  } | null;

  const filename = body?.filename?.trim() ?? "";
  const contentType = body?.contentType ?? "";
  const mediaType = classifyUpload(contentType, filename);
  const rejected = photoUploadRejection({
    contentType,
    filename,
    fileSize: body?.fileSize ?? 0,
  });
  if (!body?.reportId || !filename || mediaType !== "photo" || rejected) {
    return jsonError(rejected || "Choose a photo to upload.");
  }
  if (body.licensingStatus !== "view_only" && body.licensingStatus !== "licensing_available") {
    return jsonError("Choose a licensing option.");
  }

  try {
    const session = await createMediaUploadSession({
      userId: user.id,
      reportId: body.reportId,
      mediaType: "photo",
      filename,
      fileSize: body.fileSize ?? 0,
      contentType,
      capturedAt: body.capturedAt || new Date().toISOString(),
      licensingStatus: body.licensingStatus,
      originalSha256: parseOriginalSha256(body.originalSha256),
    });
    return NextResponse.json(session);
  } catch {
    return jsonError(USER_UPLOAD_FAILED_MESSAGE, 400);
  }
}
