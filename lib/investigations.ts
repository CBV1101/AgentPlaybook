import type { InvestigationItemRecord, InvestigationRecord, InvestigationStatus } from "@/lib/database.types";
import type { LiveStreamSummary } from "@/lib/live";
import type { FirsthandReport, LocationSummary } from "@/lib/types";

export type InvestigationSummary = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: InvestigationStatus;
  coverUrl: string | null;
  partCount: number;
  liveNow: boolean;
  updatedAt: string;
  publishedAt: string | null;
  location: LocationSummary | null;
  reporterId: string;
  reporterName: string;
  reporterUsername: string;
  href: string;
};

export type InvestigationPart = {
  id: string;
  position: number;
  title: string;
  locationLabel: string | null;
  city: string | null;
  country: string | null;
  capturedAt: string | null;
  durationLabel: string | null;
  thumbnailUrl: string | null;
  mediaKind: "video" | "photo" | "text" | "live";
  liveNow: boolean;
  recordedLive: boolean;
  href: string;
  report: FirsthandReport | null;
  liveStream: LiveStreamSummary | null;
  public: boolean;
};

export type InvestigationPageData = {
  investigation: InvestigationSummary;
  parts: InvestigationPart[];
  firstPublic: InvestigationPart | null;
  latestPublic: InvestigationPart | null;
  livePart: InvestigationPart | null;
};

export type ReporterInvestigationOption = {
  id: string;
  title: string;
  slug: string;
  status: InvestigationStatus;
};

export function investigationHref(username: string, slug: string) {
  return `/u/${username}/investigations/${slug}`;
}

export function investigationManageHref(id: string) {
  return `/profile/investigations/${id}`;
}

export function slugifyInvestigationTitle(title: string) {
  const slug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "investigation";
}

export function nextInvestigationSlug(base: string, taken: Set<string>) {
  const normalized = slugifyInvestigationTitle(base);
  if (!taken.has(normalized)) {
    return normalized;
  }
  for (let attempt = 2; attempt < 50; attempt += 1) {
    const candidate = `${normalized}-${attempt}`.slice(0, 120);
    if (!taken.has(candidate)) {
      return candidate;
    }
  }
  return `${normalized}-${Date.now().toString(36)}`.slice(0, 120);
}

export function isInvestigationPublic(row: Pick<InvestigationRecord, "status" | "removed_at">) {
  return row.status === "published" && !row.removed_at;
}

export function nextItemPosition(items: Array<{ position: number }>) {
  return items.reduce((max, item) => Math.max(max, item.position), 0) + 1;
}

export function assembleInvestigationSummary(input: {
  row: InvestigationRecord;
  reporterName: string;
  reporterUsername: string;
  location: LocationSummary | null;
  coverUrl: string | null;
  partCount: number;
  liveNow: boolean;
}): InvestigationSummary {
  return {
    id: input.row.id,
    title: input.row.title,
    slug: input.row.slug,
    description: input.row.description,
    status: input.row.status,
    coverUrl: input.coverUrl,
    partCount: input.partCount,
    liveNow: input.liveNow,
    updatedAt: input.row.updated_at,
    publishedAt: input.row.published_at,
    location: input.location,
    reporterId: input.row.reporter_id,
    reporterName: input.reporterName,
    reporterUsername: input.reporterUsername,
    href: investigationHref(input.reporterUsername, input.row.slug),
  };
}

export function assembleInvestigationPage(summary: InvestigationSummary, parts: InvestigationPart[]): InvestigationPageData {
  const visible = parts.filter((part) => part.public);
  return {
    investigation: summary,
    parts: visible,
    firstPublic: visible[0] ?? null,
    latestPublic: visible[visible.length - 1] ?? null,
    livePart: visible.find((part) => part.liveNow) ?? null,
  };
}

export function partFromReport(
  item: InvestigationItemRecord,
  report: FirsthandReport,
  liveStream: LiveStreamSummary | null,
): InvestigationPart {
  const liveNow = liveStream?.status === "live";
  return {
    id: item.id,
    position: item.position,
    title: report.title,
    locationLabel: report.location,
    city: report.city ?? null,
    country: report.country ?? null,
    capturedAt: report.capturedAt,
    durationLabel: null,
    thumbnailUrl: report.thumbnailUrl ?? liveStream?.thumbnailUrl ?? null,
    mediaKind: liveNow ? "live" : report.mediaKind,
    liveNow,
    recordedLive: Boolean(report.recordedLive || liveStream?.status === "ended"),
    href: liveNow && liveStream ? `/live/${liveStream.id}` : `/reports/${report.id}`,
    report,
    liveStream,
    public: true,
  };
}

export function partFromLiveOnly(item: InvestigationItemRecord, stream: LiveStreamSummary): InvestigationPart {
  const liveNow = stream.status === "live";
  return {
    id: item.id,
    position: item.position,
    title: stream.title,
    locationLabel: stream.location.label,
    city: stream.location.city,
    country: stream.location.country,
    capturedAt: stream.startedAt,
    durationLabel: null,
    thumbnailUrl: stream.thumbnailUrl,
    mediaKind: liveNow ? "live" : "video",
    liveNow,
    recordedLive: stream.status === "ended",
    href: `/live/${stream.id}`,
    report: null,
    liveStream: stream,
    public: stream.status === "live" || stream.status === "ended",
  };
}

export function lookupInvestigationForReport(
  items: InvestigationItemRecord[],
  investigations: InvestigationRecord[],
  reportId: string,
) {
  const item = items.find((row) => row.report_id === reportId);
  if (!item) {
    return null;
  }
  const investigation = investigations.find((row) => row.id === item.investigation_id);
  if (!investigation || !isInvestigationPublic(investigation)) {
    return null;
  }
  return { investigation, position: item.position };
}
