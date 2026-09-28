import { randomUUID } from "node:crypto";
import { one, toLocationSummary, toReport, REPORT_FEED_SELECT, type ReportJoinRow } from "@/lib/data/mappers";
import { supabaseListPublicLiveStreams } from "@/lib/data/supabase/live-repository";
import type { InvestigationItemRecord, InvestigationRecord, InvestigationStatus, Location } from "@/lib/database.types";
import type { Database } from "@/lib/database.types";
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
import { createClient } from "@/lib/supabase/server";
import type { FirsthandReport } from "@/lib/types";

async function loadCoverUrl(coverMediaId: string | null) {
  if (!coverMediaId) {
    return null;
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("report_media")
    .select("thumbnail_url, media_url")
    .eq("id", coverMediaId)
    .maybeSingle();
  return data?.thumbnail_url || data?.media_url || null;
}

async function summaryFor(row: InvestigationRecord): Promise<InvestigationSummary> {
  const supabase = await createClient();
  const [{ data: profile }, { data: location }, { data: items }] = await Promise.all([
    supabase.from("profiles").select("display_name, username").eq("id", row.reporter_id).maybeSingle(),
    row.location_id
      ? supabase.from("locations").select("*").eq("id", row.location_id).maybeSingle()
      : Promise.resolve({ data: null as Location | null }),
    supabase.from("investigation_items").select("*").eq("investigation_id", row.id),
  ]);
  const streams = await supabaseListPublicLiveStreams({ reporterId: row.reporter_id, includeEnded: true });
  const itemRows = (items ?? []) as InvestigationItemRecord[];
  const liveNow = itemRows.some((item) => {
    const stream = streams.find((live) => live.id === item.live_stream_id || live.reportId === item.report_id);
    return stream?.status === "live";
  });
  const reportIds = itemRows.map((item) => item.report_id).filter((id): id is string => Boolean(id));
  let publicCount = itemRows.filter((item) => {
    const stream = streams.find((live) => live.id === item.live_stream_id);
    return stream?.status === "live" || stream?.status === "ended";
  }).length;
  if (reportIds.length) {
    const { data: reports } = await supabase
      .from("reports")
      .select("id")
      .in("id", reportIds)
      .is("removed_at", null)
      .eq("publish_status", "published");
    publicCount = Math.max(publicCount, (reports ?? []).length);
  }
  return assembleInvestigationSummary({
    row,
    reporterName: profile?.display_name ?? "Reporter",
    reporterUsername: profile?.username ?? "reporter",
    location: location ? toLocationSummary(location) : null,
    coverUrl: await loadCoverUrl(row.cover_media_id),
    partCount: publicCount,
    liveNow,
  });
}

export async function supabaseListPublishedInvestigations(): Promise<InvestigationSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("investigations")
    .select("*")
    .eq("status", "published")
    .is("removed_at", null)
    .order("updated_at", { ascending: false });
  const summaries = await Promise.all(((data ?? []) as InvestigationRecord[]).map(summaryFor));
  return summaries.filter((item) => item.partCount > 0);
}

export async function supabaseListPublicInvestigationsForReporter(reporterId: string): Promise<InvestigationSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("investigations")
    .select("*")
    .eq("reporter_id", reporterId)
    .eq("status", "published")
    .is("removed_at", null)
    .order("updated_at", { ascending: false });
  return Promise.all(((data ?? []) as InvestigationRecord[]).map(summaryFor));
}

export async function supabaseListReporterInvestigations(userId: string): Promise<InvestigationSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("investigations")
    .select("*")
    .eq("reporter_id", userId)
    .is("removed_at", null)
    .order("updated_at", { ascending: false });
  return Promise.all(((data ?? []) as InvestigationRecord[]).map(summaryFor));
}

export async function supabaseListInvestigationOptions(userId: string): Promise<ReporterInvestigationOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("investigations")
    .select("id, title, slug, status")
    .eq("reporter_id", userId)
    .is("removed_at", null)
    .neq("status", "archived")
    .order("updated_at", { ascending: false });
  return (data ?? []) as ReporterInvestigationOption[];
}

export async function supabaseGetInvestigationPage(
  username: string,
  slug: string,
  viewerId?: string | null,
): Promise<InvestigationPageData | null> {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
  if (!profile) {
    return null;
  }
  const { data: row } = await supabase
    .from("investigations")
    .select("*")
    .eq("reporter_id", profile.id)
    .eq("slug", slug)
    .maybeSingle();
  if (!row) {
    return null;
  }
  const investigation = row as InvestigationRecord;
  const owner = viewerId === investigation.reporter_id;
  if (!owner && !isInvestigationPublic(investigation)) {
    return null;
  }
  return buildPage(investigation, owner);
}

export async function supabaseGetOwnedInvestigation(userId: string, id: string) {
  const supabase = await createClient();
  const { data: row } = await supabase.from("investigations").select("*").eq("id", id).maybeSingle();
  if (!row || (row as InvestigationRecord).reporter_id !== userId) {
    throw new Error("That investigation was not found.");
  }
  return buildPage(row as InvestigationRecord, true);
}

async function buildPage(row: InvestigationRecord, includePrivate: boolean): Promise<InvestigationPageData> {
  const supabase = await createClient();
  const { data: itemRows } = await supabase
    .from("investigation_items")
    .select("*")
    .eq("investigation_id", row.id)
    .order("position", { ascending: true });
  const items = (itemRows ?? []) as InvestigationItemRecord[];
  const streams = await supabaseListPublicLiveStreams({ reporterId: row.reporter_id, includeEnded: true });
  const reportIds = items.map((item) => item.report_id).filter((id): id is string => Boolean(id));
  const { data: reportRows } = reportIds.length
    ? await supabase.from("reports").select(REPORT_FEED_SELECT).in("id", reportIds)
    : { data: [] as ReportJoinRow[] };
  const reports = new Map(((reportRows ?? []) as ReportJoinRow[]).map((item) => [item.id, item]));

  const parts = items.flatMap((item) => {
    const live = streams.find(
      (stream) => stream.id === item.live_stream_id || (item.report_id && stream.reportId === item.report_id),
    ) ?? null;
    if (item.report_id) {
      const joined = reports.get(item.report_id);
      if (!joined) {
        return [];
      }
      const visible = !joined.removed_at && joined.publish_status !== "draft";
      if (!visible && !includePrivate) {
        return [];
      }
      return [partFromReport(item, toReport(joined), live)];
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

  return assembleInvestigationPage(await summaryFor(row), includePrivate ? parts : parts.filter((part) => part.public));
}

export async function supabaseCreateInvestigation(input: {
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
  const supabase = await createClient();
  const { data: existing } = await supabase.from("investigations").select("slug").eq("reporter_id", input.userId);
  const slug = nextInvestigationSlug(title, new Set((existing ?? []).map((item) => item.slug)));
  const id = randomUUID();
  const now = new Date().toISOString();
  const { error } = await supabase.from("investigations").insert({
    id,
    reporter_id: input.userId,
    title,
    slug,
    description: input.description,
    location_id: input.locationId ?? null,
    status: input.status,
    published_at: input.status === "published" ? now : null,
  });
  if (error) {
    throw new Error(error.message);
  }
  return { id };
}

export async function supabaseUpdateInvestigation(
  userId: string,
  id: string,
  patch: {
    title?: string;
    description?: string | null;
    status?: InvestigationStatus;
    locationId?: string | null;
  },
) {
  const supabase = await createClient();
  const { data: row } = await supabase.from("investigations").select("*").eq("id", id).maybeSingle();
  if (!row || (row as InvestigationRecord).reporter_id !== userId) {
    throw new Error("That investigation was not found.");
  }
  const next: Database["public"]["Tables"]["investigations"]["Update"] = {};
  if (patch.title) {
    next.title = patch.title.trim();
  }
  if (patch.description !== undefined) {
    next.description = patch.description;
  }
  if (patch.locationId !== undefined) {
    next.location_id = patch.locationId;
  }
  if (patch.status) {
    next.status = patch.status;
    if (patch.status === "published" && !(row as InvestigationRecord).published_at) {
      next.published_at = new Date().toISOString();
    }
  }
  const { error } = await supabase.from("investigations").update(next).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function supabaseDeleteInvestigation(userId: string, id: string) {
  const supabase = await createClient();
  const { data: row } = await supabase.from("investigations").select("reporter_id").eq("id", id).maybeSingle();
  if (!row || row.reporter_id !== userId) {
    throw new Error("That investigation was not found.");
  }
  const { error } = await supabase.from("investigations").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function supabaseAddInvestigationContent(
  userId: string,
  investigationId: string,
  input: { reportId?: string | null; liveStreamId?: string | null },
) {
  const supabase = await createClient();
  const { data: investigation } = await supabase.from("investigations").select("*").eq("id", investigationId).maybeSingle();
  if (!investigation || (investigation as InvestigationRecord).reporter_id !== userId) {
    throw new Error("That investigation was not found.");
  }
  if (input.reportId) {
    const { data: report } = await supabase
      .from("reports")
      .select("id, created_by, removed_at")
      .eq("id", input.reportId)
      .maybeSingle();
    if (!report || report.created_by !== userId || report.removed_at) {
      throw new Error("You can only add your own reports.");
    }
  }
  if (input.liveStreamId) {
    const { data: live } = await supabase.from("live_streams").select("id, reporter_id").eq("id", input.liveStreamId).maybeSingle();
    if (!live || live.reporter_id !== userId) {
      throw new Error("You can only add your own livestreams.");
    }
  }
  if (!input.reportId && !input.liveStreamId) {
    throw new Error("Choose a report or livestream to add.");
  }
  const { data: items } = await supabase.from("investigation_items").select("position").eq("investigation_id", investigationId);
  const { error } = await supabase.from("investigation_items").insert({
    investigation_id: investigationId,
    report_id: input.reportId || null,
    live_stream_id: input.liveStreamId || null,
    position: nextItemPosition((items ?? []) as Array<{ position: number }>),
  });
  if (error) {
    if (error.message.toLowerCase().includes("duplicate") || error.code === "23505") {
      throw new Error("That report is already in an investigation.");
    }
    throw new Error(error.message);
  }
}

export async function supabaseRemoveInvestigationItem(userId: string, itemId: string) {
  const supabase = await createClient();
  const { data: item } = await supabase.from("investigation_items").select("*").eq("id", itemId).maybeSingle();
  if (!item) {
    throw new Error("That part was not found.");
  }
  const { data: investigation } = await supabase
    .from("investigations")
    .select("reporter_id")
    .eq("id", (item as InvestigationItemRecord).investigation_id)
    .maybeSingle();
  if (!investigation || investigation.reporter_id !== userId) {
    throw new Error("That investigation was not found.");
  }
  const { error } = await supabase.from("investigation_items").delete().eq("id", itemId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function supabaseReorderInvestigationItems(userId: string, investigationId: string, orderedItemIds: string[]) {
  const supabase = await createClient();
  const { data: investigation } = await supabase.from("investigations").select("reporter_id").eq("id", investigationId).maybeSingle();
  if (!investigation || investigation.reporter_id !== userId) {
    throw new Error("That investigation was not found.");
  }
  const { data: items } = await supabase.from("investigation_items").select("id").eq("investigation_id", investigationId);
  const current = (items ?? []) as Array<{ id: string }>;
  if (orderedItemIds.length !== current.length || orderedItemIds.some((id) => !current.some((item) => item.id === id))) {
    throw new Error("Reorder the full list of parts.");
  }
  for (const [index, id] of orderedItemIds.entries()) {
    const { error } = await supabase.from("investigation_items").update({ position: index + 1 + 10000 }).eq("id", id);
    if (error) {
      throw new Error(error.message);
    }
  }
  for (const [index, id] of orderedItemIds.entries()) {
    const { error } = await supabase.from("investigation_items").update({ position: index + 1 }).eq("id", id);
    if (error) {
      throw new Error(error.message);
    }
  }
}

export async function supabaseAppendReportToInvestigation(userId: string, reportId: string, investigationId: string) {
  await supabaseAddInvestigationContent(userId, investigationId, { reportId });
}

export async function supabaseAppendLiveToInvestigation(userId: string, liveStreamId: string, investigationId: string) {
  await supabaseAddInvestigationContent(userId, investigationId, { liveStreamId });
}

export async function supabaseLinkLiveRecordingToInvestigation(liveStreamId: string, reportId: string) {
  const supabase = await createClient();
  await supabase.from("investigation_items").update({ report_id: reportId }).eq("live_stream_id", liveStreamId).is("report_id", null);
}

export async function supabaseEligibleInvestigationContent(userId: string) {
  const supabase = await createClient();
  const { data: used } = await supabase.from("investigation_items").select("report_id, live_stream_id");
  const usedReports = new Set((used ?? []).map((item) => item.report_id).filter((id): id is string => Boolean(id)));
  const usedLive = new Set((used ?? []).map((item) => item.live_stream_id).filter((id): id is string => Boolean(id)));
  const { data: reportRows } = await supabase
    .from("reports")
    .select(REPORT_FEED_SELECT)
    .eq("created_by", userId)
    .is("removed_at", null)
    .eq("publish_status", "published");
  const reports: FirsthandReport[] = ((reportRows ?? []) as ReportJoinRow[])
    .filter((item) => !usedReports.has(item.id))
    .map(toReport);
  const liveStreams = (await supabaseListPublicLiveStreams({ reporterId: userId, includeEnded: true })).filter(
    (item) => !usedLive.has(item.id) && (!item.reportId || !usedReports.has(item.reportId)),
  );
  return { reports, liveStreams };
}

export async function supabaseLookupInvestigationForReport(reportId: string) {
  const supabase = await createClient();
  const { data: item } = await supabase.from("investigation_items").select("*").eq("report_id", reportId).maybeSingle();
  if (!item) {
    return null;
  }
  const { data: investigation } = await supabase
    .from("investigations")
    .select("*")
    .eq("id", (item as InvestigationItemRecord).investigation_id)
    .maybeSingle();
  if (!investigation || !isInvestigationPublic(investigation as InvestigationRecord)) {
    return null;
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", (investigation as InvestigationRecord).reporter_id)
    .maybeSingle();
  return {
    title: (investigation as InvestigationRecord).title,
    href: `/u/${profile?.username ?? "reporter"}/investigations/${(investigation as InvestigationRecord).slug}`,
    position: (item as InvestigationItemRecord).position,
  };
}
