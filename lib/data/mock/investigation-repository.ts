import { randomUUID } from "node:crypto";
import { readMockDatabase, updateMockDatabase } from "@/lib/data/mock/store";
import { toLocationSummary, toReport } from "@/lib/data/mappers";
import { mockListPublicLiveStreams } from "@/lib/data/mock/live-repository";
import { isPubliclyLive } from "@/lib/live";
import type { InvestigationItemRecord, InvestigationRecord, InvestigationStatus } from "@/lib/database.types";
import {
  assembleInvestigationPage,
  assembleInvestigationSummary,
  isInvestigationPublic,
  nextInvestigationSlug,
  nextItemPosition,
  partFromLiveOnly,
  partFromReport,
  type InvestigationPageData,
  type InvestigationSummary,
  type ReporterInvestigationOption,
} from "@/lib/investigations";
import type { FirsthandReport } from "@/lib/types";

function isPublicReport(row: { removed_at?: string | null; publish_status?: string | null }) {
  return !row.removed_at && row.publish_status !== "draft";
}

function joinReport(database: ReturnType<typeof readMockDatabase>, reportId: string) {
  const report = database.reports.find((item) => item.id === reportId);
  if (!report) {
    return null;
  }
  const location = database.locations.find((item) => item.id === report.location_id) ?? null;
  const profile = database.profiles.find((item) => item.id === report.created_by) ?? null;
  const request = report.request_id
    ? database.coverage_requests.find((item) => item.id === report.request_id)
    : null;
  return {
    ...report,
    locations: location,
    profiles: profile
      ? { display_name: profile.display_name, username: profile.username, avatar_url: profile.avatar_url }
      : null,
    report_media: database.report_media.filter((item) => item.report_id === report.id),
    coverage_requests: request
      ? {
          title: request.title,
          request_interests: database.request_interests.filter((item) => item.request_id === request.id),
        }
      : null,
  };
}

function coverUrl(database: ReturnType<typeof readMockDatabase>, coverMediaId: string | null) {
  if (!coverMediaId) {
    return null;
  }
  return database.report_media.find((item) => item.id === coverMediaId)?.thumbnail_url
    ?? database.report_media.find((item) => item.id === coverMediaId)?.media_url
    ?? null;
}

function requireOwnedInvestigation(database: ReturnType<typeof readMockDatabase>, userId: string, id: string) {
  const row = (database.investigations ?? []).find((item) => item.id === id);
  if (!row || row.reporter_id !== userId) {
    throw new Error("That investigation was not found.");
  }
  return row;
}

function summaryFor(
  database: ReturnType<typeof readMockDatabase>,
  row: InvestigationRecord,
): InvestigationSummary {
  const profile = database.profiles.find((item) => item.id === row.reporter_id);
  const location = row.location_id
    ? database.locations.find((item) => item.id === row.location_id)
    : null;
  const items = (database.investigation_items ?? []).filter((item) => item.investigation_id === row.id);
  const streams = mockListPublicLiveStreams({ reporterId: row.reporter_id });
  const liveNow = items.some((item) => {
    const stream = streams.find((live) => live.id === item.live_stream_id || live.reportId === item.report_id);
    return stream ? isPubliclyLive(stream) : false;
  });
  const publicCount = items.filter((item) => {
    if (item.report_id) {
      const report = database.reports.find((row) => row.id === item.report_id);
      return report && isPublicReport(report);
    }
    const stream = streams.find((live) => live.id === item.live_stream_id);
    return stream?.status === "live" || stream?.status === "ended";
  }).length;
  return assembleInvestigationSummary({
    row,
    reporterName: profile?.display_name ?? "Reporter",
    reporterUsername: profile?.username ?? "reporter",
    location: location ? toLocationSummary(location) : null,
    coverUrl: coverUrl(database, row.cover_media_id) ?? firstItemThumb(database, items),
    partCount: publicCount,
    liveNow,
  });
}

function firstItemThumb(
  database: ReturnType<typeof readMockDatabase>,
  items: InvestigationItemRecord[],
) {
  const ordered = [...items].sort((a, b) => a.position - b.position);
  for (const item of ordered) {
    if (item.report_id) {
      const media = database.report_media.find((row) => row.report_id === item.report_id);
      if (media?.thumbnail_url || media?.media_url) {
        return media.thumbnail_url ?? media.media_url;
      }
    }
  }
  return null;
}

export async function mockListPublishedInvestigations(): Promise<InvestigationSummary[]> {
  const database = readMockDatabase();
  return (database.investigations ?? [])
    .filter((item) => isInvestigationPublic(item))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((row) => summaryFor(database, row))
    .filter((item) => item.partCount > 0);
}

export async function mockListPublicInvestigationsForReporter(reporterId: string): Promise<InvestigationSummary[]> {
  const database = readMockDatabase();
  return (database.investigations ?? [])
    .filter((item) => item.reporter_id === reporterId && isInvestigationPublic(item))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((row) => summaryFor(database, row));
}

export async function mockListReporterInvestigations(userId: string): Promise<InvestigationSummary[]> {
  const database = readMockDatabase();
  return (database.investigations ?? [])
    .filter((item) => item.reporter_id === userId && !item.removed_at)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((row) => summaryFor(database, row));
}

export async function mockListInvestigationOptions(userId: string): Promise<ReporterInvestigationOption[]> {
  const database = readMockDatabase();
  return (database.investigations ?? [])
    .filter((item) => item.reporter_id === userId && !item.removed_at && item.status !== "archived")
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((item) => ({ id: item.id, title: item.title, slug: item.slug, status: item.status }));
}

export async function mockGetInvestigationPage(
  username: string,
  slug: string,
  viewerId?: string | null,
): Promise<InvestigationPageData | null> {
  const database = readMockDatabase();
  const profile = database.profiles.find((item) => item.username === username);
  if (!profile) {
    return null;
  }
  const row = (database.investigations ?? []).find(
    (item) => item.reporter_id === profile.id && item.slug === slug,
  );
  if (!row) {
    return null;
  }
  const owner = viewerId === row.reporter_id;
  if (!owner && !isInvestigationPublic(row)) {
    return null;
  }
  return buildPage(database, row, owner);
}

export async function mockGetOwnedInvestigation(userId: string, id: string) {
  const database = readMockDatabase();
  const row = requireOwnedInvestigation(database, userId, id);
  return buildPage(database, row, true);
}

function buildPage(
  database: ReturnType<typeof readMockDatabase>,
  row: InvestigationRecord,
  includePrivate: boolean,
): InvestigationPageData {
  const streams = mockListPublicLiveStreams({ reporterId: row.reporter_id });
  const items = (database.investigation_items ?? [])
    .filter((item) => item.investigation_id === row.id)
    .sort((a, b) => a.position - b.position);
  const parts = items.flatMap((item) => {
    const live = streams.find(
      (stream) => stream.id === item.live_stream_id || (item.report_id && stream.reportId === item.report_id),
    ) ?? null;
    if (item.report_id) {
      const joined = joinReport(database, item.report_id);
      if (!joined) {
        return [];
      }
      const visible = isPublicReport(joined);
      if (!visible && !includePrivate) {
        return [];
      }
      const part = partFromReport(item, toReport(joined), live);
      return [{ ...part, public: visible || includePrivate }];
    }
    if (live) {
      const part = partFromLiveOnly(item, live);
      if (!part.public && !includePrivate) {
        return [];
      }
      return [part];
    }
    return [];
  });
  return assembleInvestigationPage(summaryFor(database, row), includePrivate ? parts : parts.filter((part) => part.public));
}

export async function mockCreateInvestigation(input: {
  userId: string;
  title: string;
  description: string | null;
  locationId?: string | null;
  status: InvestigationStatus;
}) {
  const title = input.title.trim();
  if (!title) {
    throw new Error("Add a title for this investigation.");
  }
  const locationId = input.locationId ?? null;
  const id = randomUUID();
  const now = new Date().toISOString();
  updateMockDatabase((current) => {
    current.investigations ??= [];
    current.investigation_items ??= [];
    const taken = new Set(
      current.investigations.filter((item) => item.reporter_id === input.userId).map((item) => item.slug),
    );
    const slug = nextInvestigationSlug(title, taken);
    current.investigations.push({
      id,
      reporter_id: input.userId,
      title,
      slug,
      description: input.description,
      cover_media_id: null,
      location_id: locationId,
      status: input.status,
      created_at: now,
      updated_at: now,
      published_at: input.status === "published" ? now : null,
      removed_at: null,
    });
  });
  return { id };
}

export async function mockUpdateInvestigation(
  userId: string,
  id: string,
  patch: {
    title?: string;
    description?: string | null;
    status?: InvestigationStatus;
    locationId?: string | null;
  },
) {
  updateMockDatabase((current) => {
    const row = requireOwnedInvestigation(current, userId, id);
    if (patch.title) {
      row.title = patch.title.trim();
    }
    if (patch.description !== undefined) {
      row.description = patch.description;
    }
    if (patch.locationId !== undefined) {
      row.location_id = patch.locationId;
    }
    if (patch.status) {
      row.status = patch.status;
      if (patch.status === "published" && !row.published_at) {
        row.published_at = new Date().toISOString();
      }
    }
    row.updated_at = new Date().toISOString();
  });
}

export async function mockDeleteInvestigation(userId: string, id: string) {
  updateMockDatabase((current) => {
    requireOwnedInvestigation(current, userId, id);
    current.investigation_items = (current.investigation_items ?? []).filter((item) => item.investigation_id !== id);
    current.investigations = (current.investigations ?? []).filter((item) => item.id !== id);
  });
}

export async function mockAddInvestigationContent(
  userId: string,
  investigationId: string,
  input: { reportId?: string | null; liveStreamId?: string | null },
) {
  updateMockDatabase((current) => {
    const investigation = requireOwnedInvestigation(current, userId, investigationId);
    const items = current.investigation_items ?? [];
    current.investigation_items = items;
    if (input.reportId) {
      const report = current.reports.find((item) => item.id === input.reportId);
      if (!report || report.created_by !== userId || report.removed_at) {
        throw new Error("You can only add your own reports.");
      }
      if (items.some((item) => item.report_id === input.reportId)) {
        throw new Error("That report is already in an investigation.");
      }
    }
    if (input.liveStreamId) {
      const live = current.live_streams.find((item) => item.id === input.liveStreamId);
      if (!live || live.reporter_id !== userId) {
        throw new Error("You can only add your own livestreams.");
      }
      if (items.some((item) => item.live_stream_id === input.liveStreamId)) {
        return;
      }
      if (live.report_id && items.some((item) => item.report_id === live.report_id)) {
        return;
      }
    }
    if (!input.reportId && !input.liveStreamId) {
      throw new Error("Choose a report or livestream to add.");
    }
    items.push({
      id: randomUUID(),
      investigation_id: investigation.id,
      report_id: input.reportId || null,
      live_stream_id: input.liveStreamId || null,
      position: nextItemPosition(items.filter((item) => item.investigation_id === investigationId)),
      added_at: new Date().toISOString(),
    });
    investigation.updated_at = new Date().toISOString();
  });
}

export async function mockRemoveInvestigationItem(userId: string, itemId: string) {
  updateMockDatabase((current) => {
    const item = (current.investigation_items ?? []).find((row) => row.id === itemId);
    if (!item) {
      throw new Error("That part was not found.");
    }
    requireOwnedInvestigation(current, userId, item.investigation_id);
    current.investigation_items = (current.investigation_items ?? []).filter((row) => row.id !== itemId);
  });
}

export async function mockReorderInvestigationItems(userId: string, investigationId: string, orderedItemIds: string[]) {
  updateMockDatabase((current) => {
    requireOwnedInvestigation(current, userId, investigationId);
    const items = (current.investigation_items ?? []).filter((item) => item.investigation_id === investigationId);
    if (orderedItemIds.length !== items.length || orderedItemIds.some((id) => !items.some((item) => item.id === id))) {
      throw new Error("Reorder the full list of parts.");
    }
    orderedItemIds.forEach((id, index) => {
      const item = items.find((row) => row.id === id);
      if (item) {
        item.position = index + 1 + 10000;
      }
    });
    orderedItemIds.forEach((id, index) => {
      const item = items.find((row) => row.id === id);
      if (item) {
        item.position = index + 1;
      }
    });
  });
}

export async function mockAppendReportToInvestigation(userId: string, reportId: string, investigationId: string) {
  await mockAddInvestigationContent(userId, investigationId, { reportId });
}

export async function mockAppendLiveToInvestigation(userId: string, liveStreamId: string, investigationId: string) {
  await mockAddInvestigationContent(userId, investigationId, { liveStreamId });
}

export function mockLinkLiveRecordingToInvestigation(liveStreamId: string, reportId: string) {
  updateMockDatabase((current) => {
    const item = (current.investigation_items ?? []).find((row) => row.live_stream_id === liveStreamId);
    if (item && !item.report_id) {
      item.report_id = reportId;
    }
  });
}

export async function mockEligibleInvestigationContent(userId: string) {
  const database = readMockDatabase();
  const usedReports = new Set(
    (database.investigation_items ?? []).map((item) => item.report_id).filter((id): id is string => Boolean(id)),
  );
  const usedLive = new Set(
    (database.investigation_items ?? []).map((item) => item.live_stream_id).filter((id): id is string => Boolean(id)),
  );
  const reports: FirsthandReport[] = database.reports
    .filter((item) => item.created_by === userId && isPublicReport(item) && !usedReports.has(item.id))
    .flatMap((item) => {
      const joined = joinReport(database, item.id);
      return joined ? [toReport(joined)] : [];
    });
  const liveStreams = mockListPublicLiveStreams({ reporterId: userId }).filter(
    (item) => !usedLive.has(item.id) && (!item.reportId || !usedReports.has(item.reportId)),
  );
  return { reports, liveStreams };
}

export function mockLookupInvestigationForReport(reportId: string) {
  const database = readMockDatabase();
  const item = (database.investigation_items ?? []).find((row) => row.report_id === reportId);
  if (!item) {
    return null;
  }
  const investigation = (database.investigations ?? []).find((row) => row.id === item.investigation_id);
  if (!investigation || !isInvestigationPublic(investigation)) {
    return null;
  }
  const profile = database.profiles.find((row) => row.id === investigation.reporter_id);
  return {
    title: investigation.title,
    href: `/u/${profile?.username ?? "reporter"}/investigations/${investigation.slug}`,
    position: item.position,
  };
}
