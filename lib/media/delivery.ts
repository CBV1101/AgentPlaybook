import { logMediaStorageFailure } from "@/lib/media/log";
import { isOwnedReportImagePath } from "@/lib/media/report-image-path";
import { REPORT_IMAGES_BUCKET } from "@/lib/media/supabase-images";
import { createServiceRoleClient } from "@/lib/supabase/admin";

/** Ten minutes: long enough for a report page, short enough that a removed report's leaked URL ages out quickly. */
export const REPORT_IMAGE_SIGNED_TTL_SECONDS = 10 * 60;

export type ReportImageSignRequest = {
  path: string;
  ownerId: string;
  reportId: string;
};

export async function signReportImagePaths(requests: ReportImageSignRequest[]) {
  const unique = new Map<string, ReportImageSignRequest>();
  for (const request of requests) {
    if (!request.path) {
      continue;
    }
    if (!isOwnedReportImagePath(request.path, request.ownerId, request.reportId)) {
      logMediaStorageFailure(
        {
          operation: "refuse-unbound-storage-path",
          reportId: request.reportId,
        },
        new Error("report image path does not match parent report ownership"),
      );
      continue;
    }
    unique.set(request.path, request);
  }
  const paths = [...unique.keys()];
  if (paths.length === 0) {
    return new Map<string, string>();
  }
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.storage
    .from(REPORT_IMAGES_BUCKET)
    .createSignedUrls(paths, REPORT_IMAGE_SIGNED_TTL_SECONDS);
  if (error || !data) {
    throw new Error(error?.message || "Could not create media delivery URLs.");
  }
  const urls = new Map<string, string>();
  for (const item of data) {
    if (item.path && item.signedUrl && !item.error) {
      urls.set(item.path, item.signedUrl);
    }
  }
  return urls;
}
