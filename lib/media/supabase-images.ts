export const REPORT_IMAGES_BUCKET = "report-images";
export const REPORTER_AVATARS_BUCKET = "reporter-avatars";

export function reportMediaIdentityUrl(path: string) {
  return `storage://${REPORT_IMAGES_BUCKET}/${path}`;
}

export function reportImageStoragePath(item: {
  provider?: string | null;
  provider_asset_id?: string | null;
  media_url?: string | null;
}) {
  if (item.provider === "supabase-storage" && item.provider_asset_id) {
    return item.provider_asset_id;
  }
  const url = item.media_url ?? "";
  const identityPrefix = `storage://${REPORT_IMAGES_BUCKET}/`;
  if (url.startsWith(identityPrefix)) {
    return url.slice(identityPrefix.length);
  }
  const marker = `/object/public/${REPORT_IMAGES_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) {
    return null;
  }
  return decodeURIComponent(url.slice(index + marker.length).split("?")[0] ?? "") || null;
}

export function isReportMediaIdentityUrl(url: string) {
  return url.startsWith(`storage://${REPORT_IMAGES_BUCKET}/`);
}

export function isLegacyPublicReportImageUrl(url: string) {
  return url.includes(`/object/public/${REPORT_IMAGES_BUCKET}/`);
}
