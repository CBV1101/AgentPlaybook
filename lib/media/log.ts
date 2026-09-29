import { REPORT_IMAGES_BUCKET } from "@/lib/media/supabase-images";

export function logMediaStorageFailure(
  context: {
    operation: string;
    bucket?: string;
    reportId?: string;
    mediaId?: string;
    mediaType?: string;
  },
  error: unknown,
) {
  const message = error instanceof Error ? error.message : "unknown error";
  console.error("[firsthand] media storage failure", {
    operation: context.operation,
    bucket: context.bucket ?? REPORT_IMAGES_BUCKET,
    reportId: context.reportId ?? null,
    mediaId: context.mediaId ?? null,
    mediaType: context.mediaType ?? null,
    error: message,
  });
}
