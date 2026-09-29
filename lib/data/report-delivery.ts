import type { FirsthandReport } from "@/lib/types";
import { toReport, type ReportJoinRow } from "@/lib/data/mappers";
import { signReportImagePaths } from "@/lib/media/delivery";
import { reportImageStoragePath } from "@/lib/media/supabase-images";
import { canViewReportMedia } from "@/lib/media/visibility";

export type MediaViewer = {
  id?: string | null;
  isAdmin?: boolean;
};

function supabasePhotoPath(row: ReportJoinRow) {
  const media = row.report_media ?? [];
  const photo = media.find((item) => item.media_type === "photo" && reportImageStoragePath(item));
  return photo ? reportImageStoragePath(photo) : null;
}

export async function deliverReports(rows: ReportJoinRow[], viewer: MediaViewer = {}): Promise<FirsthandReport[]> {
  const reports = rows.map(toReport);
  const requests: { path: string; ownerId: string; reportId: string }[] = [];
  const pathByIndex = new Map<number, string>();
  rows.forEach((row, index) => {
    const allowed = canViewReportMedia({
      publishStatus: row.publish_status,
      removedAt: row.removed_at,
      ownerId: row.created_by,
      viewerId: viewer.id,
      isAdmin: viewer.isAdmin,
    });
    const path = allowed ? supabasePhotoPath(row) : null;
    if (path && row.created_by) {
      requests.push({ path, ownerId: row.created_by, reportId: row.id });
      pathByIndex.set(index, path);
    }
  });
  const signed = await signReportImagePaths(requests);
  return reports.map((report, index) => {
    const path = pathByIndex.get(index);
    if (!path) {
      return report;
    }
    const url = signed.get(path) ?? null;
    return { ...report, thumbnailUrl: url };
  });
}

export async function deliverStoredPhotoFields<
  T extends {
    provider?: string | null;
    provider_asset_id?: string | null;
    media_url: string;
    thumbnail_url?: string | null;
    media_type?: string;
  },
>(items: T[], allowed: boolean, parent: { ownerId: string; reportId: string }): Promise<T[]> {
  if (!allowed) {
    return items.map((item) =>
      reportImageStoragePath(item) ? { ...item, media_url: "", thumbnail_url: null } : item,
    );
  }
  const requests = items.flatMap((item) => {
    const path = reportImageStoragePath(item);
    return path ? [{ path, ownerId: parent.ownerId, reportId: parent.reportId }] : [];
  });
  const signed = await signReportImagePaths(requests);
  return items.map((item) => {
    const path = reportImageStoragePath(item);
    if (!path) {
      return item;
    }
    const url = signed.get(path);
    if (!url) {
      return { ...item, media_url: "", thumbnail_url: null };
    }
    return { ...item, media_url: url, thumbnail_url: url };
  });
}
