import { toLocationSummary } from "@/lib/data/mappers";
import { countryHubSlug } from "@/lib/geo";
import { inquiryStatusLabel, type LicensingInquiryStatus } from "@/lib/licensing";
import {
  planHighInterestCoverageRequest,
  planLicensingInquiry,
  planLicensingStatusChange,
  planLiveStarted,
  planPublishedReport,
  type FollowedLocationRow,
  type NotificationAudienceMember,
  type PlannedNotification,
} from "@/lib/notification-events";
import {
  mergeNotificationPreferences,
  type NotificationPreferences,
  type NotificationRecord,
  type NotificationType,
} from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import type { Location } from "@/lib/database.types";

function toRecord(row: {
  id: string;
  user_id: string;
  type: string;
  actor_id: string | null;
  location_id: string | null;
  event_id: string | null;
  coverage_request_id: string | null;
  report_id: string | null;
  live_stream_id: string | null;
  message: string;
  read_at: string | null;
  created_at: string;
}): NotificationRecord {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as NotificationType,
    actorId: row.actor_id,
    locationId: row.location_id,
    eventId: row.event_id,
    coverageRequestId: row.coverage_request_id,
    reportId: row.report_id,
    liveStreamId: row.live_stream_id,
    message: row.message,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

async function persistPlanned(planned: PlannedNotification[]) {
  if (planned.length === 0) {
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("emit_in_app_notifications", {
    payload: planned.map((item) => ({
      user_id: item.userId,
      type: item.type,
      actor_id: item.actorId,
      location_id: item.locationId,
      event_id: item.eventId,
      coverage_request_id: item.coverageRequestId,
      report_id: item.reportId,
      live_stream_id: item.liveStreamId,
      message: item.message,
    })),
  });
  if (error) {
    throw new Error(error.message);
  }
}

async function loadPreferences(userIds: string[]): Promise<Map<string, NotificationPreferences>> {
  const unique = [...new Set(userIds)];
  const map = new Map<string, NotificationPreferences>();
  if (unique.length === 0) {
    return map;
  }
  const supabase = await createClient();
  const { data } = await supabase.from("notification_preferences").select("*").in("user_id", unique);
  for (const id of unique) {
    const row = (data ?? []).find((item) => item.user_id === id);
    map.set(id, mergeNotificationPreferences(row));
  }
  return map;
}

async function membersFor(userIds: string[]): Promise<NotificationAudienceMember[]> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) {
    return [];
  }
  const supabase = await createClient();
  const [{ data: profiles }, prefs] = await Promise.all([
    supabase.from("profiles").select("id, home_city, home_country").in("id", unique),
    loadPreferences(unique),
  ]);
  return (profiles ?? []).map((profile) => ({
    id: profile.id,
    homeCity: profile.home_city,
    homeCountry: profile.home_country,
    preferences: prefs.get(profile.id) ?? mergeNotificationPreferences(),
  }));
}

async function relatedLocationIds(location: Location) {
  const supabase = await createClient();
  const ids = new Set<string>([location.id]);
  const { data: city } = await supabase
    .from("locations")
    .select("id")
    .eq("country", location.country)
    .eq("city", location.city)
    .is("place", null)
    .neq("slug", countryHubSlug(location.country));
  for (const row of city ?? []) {
    ids.add(row.id);
  }
  const { data: country } = await supabase
    .from("locations")
    .select("id")
    .eq("slug", countryHubSlug(location.country))
    .maybeSingle();
  if (country) {
    ids.add(country.id);
  }
  return [...ids];
}

async function locationFollowsFor(location: Location): Promise<FollowedLocationRow[]> {
  const supabase = await createClient();
  const locationIds = await relatedLocationIds(location);
  const { data: follows } = await supabase
    .from("location_follows")
    .select("user_id, location_id")
    .in("location_id", locationIds);
  if (!follows?.length) {
    return [];
  }
  const { data: locations } = await supabase
    .from("locations")
    .select("id, slug, place, city, country, latitude, longitude")
    .in("id", [...new Set(follows.map((item) => item.location_id))]);
  const byId = new Map((locations ?? []).map((row) => [row.id, row]));
  return follows.flatMap((row) => {
    const followed = byId.get(row.location_id);
    return followed ? [{ userId: row.user_id, location: toLocationSummary(followed) }] : [];
  });
}

async function reporterFollowerIds(reporterId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("profile_follows").select("follower_id").eq("following_id", reporterId);
  return (data ?? []).map((item) => item.follower_id);
}

async function homeCityMemberIds(location: Location) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("home_city", location.city)
    .or(`home_country.eq.${location.country},home_country.is.null`);
  return (data ?? []).map((item) => item.id);
}

export async function supabaseListNotifications(userId: string): Promise<NotificationRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map(toRecord);
}

export async function supabaseUnreadNotificationCount(userId: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}

export async function supabaseMarkNotificationRead(userId: string, notificationId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) {
    throw new Error(error.message);
  }
}

export async function supabaseMarkAllNotificationsRead(userId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) {
    throw new Error(error.message);
  }
}

export async function supabaseGetNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const supabase = await createClient();
  const { data } = await supabase.from("notification_preferences").select("*").eq("user_id", userId).maybeSingle();
  return mergeNotificationPreferences(data);
}

export async function supabaseUpdateNotificationPreferences(userId: string, next: NotificationPreferences) {
  const supabase = await createClient();
  const { error } = await supabase.from("notification_preferences").upsert({
    user_id: userId,
    reporter_activity: next.reporter_activity,
    location_activity: next.location_activity,
    coverage_responses: next.coverage_responses,
    livestreams: next.livestreams,
    licensing: next.licensing,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function supabaseDispatchPublishedReport(reportId: string) {
  const supabase = await createClient();
  const { data: report } = await supabase
    .from("reports")
    .select("id, created_by, location_id, request_id, event_id, publish_status, removed_at")
    .eq("id", reportId)
    .maybeSingle();
  if (!report || report.publish_status !== "published" || report.removed_at) {
    return;
  }
  const [{ data: location }, { data: actor }] = await Promise.all([
    supabase.from("locations").select("*").eq("id", report.location_id).maybeSingle(),
    supabase.from("profiles").select("id, display_name").eq("id", report.created_by).maybeSingle(),
  ]);
  if (!location || !actor) {
    return;
  }

  let requestCreatorId: string | null = null;
  let supporterIds: string[] = [];
  if (report.request_id) {
    const [{ data: request }, { data: interests }] = await Promise.all([
      supabase.from("coverage_requests").select("created_by").eq("id", report.request_id).maybeSingle(),
      supabase.from("request_interests").select("user_id").eq("request_id", report.request_id),
    ]);
    requestCreatorId = request?.created_by ?? null;
    supporterIds = (interests ?? []).map((item) => item.user_id);
  }

  const [followerIds, locationFollows] = await Promise.all([
    reporterFollowerIds(actor.id),
    locationFollowsFor(location),
  ]);
  const memberIds = [
    ...followerIds,
    ...locationFollows.map((row) => row.userId),
    ...(requestCreatorId ? [requestCreatorId] : []),
    ...supporterIds,
  ];
  await persistPlanned(
    planPublishedReport({
      actorId: actor.id,
      actorName: actor.display_name,
      reportId: report.id,
      location: toLocationSummary(location),
      requestId: report.request_id,
      eventId: report.event_id,
      requestCreatorId,
      requestSupporterIds: supporterIds,
      reporterFollowerIds: followerIds,
      locationFollows,
      members: await membersFor(memberIds),
    }),
  );
}

export async function supabaseDispatchLiveStarted(liveStreamId: string) {
  const supabase = await createClient();
  const { data: stream } = await supabase.from("live_streams").select("*").eq("id", liveStreamId).maybeSingle();
  if (!stream || stream.status !== "live") {
    return;
  }
  const [{ data: location }, { data: actor }] = await Promise.all([
    supabase.from("locations").select("*").eq("id", stream.location_id).maybeSingle(),
    supabase.from("profiles").select("id, display_name").eq("id", stream.reporter_id).maybeSingle(),
  ]);
  if (!location || !actor) {
    return;
  }
  const [followerIds, locationFollows] = await Promise.all([
    reporterFollowerIds(actor.id),
    locationFollowsFor(location),
  ]);
  await persistPlanned(
    planLiveStarted({
      actorId: actor.id,
      actorName: actor.display_name,
      liveStreamId: stream.id,
      location: toLocationSummary(location),
      eventId: stream.event_id,
      coverageRequestId: stream.coverage_request_id,
      reporterFollowerIds: followerIds,
      locationFollows,
      members: await membersFor([...followerIds, ...locationFollows.map((row) => row.userId)]),
    }),
  );
}

export async function supabaseDispatchHighInterestRequest(requestId: string) {
  const supabase = await createClient();
  const { data: request } = await supabase.from("coverage_requests").select("*").eq("id", requestId).maybeSingle();
  if (!request || request.removed_at || request.status !== "open") {
    return;
  }
  const { data: location } = await supabase.from("locations").select("*").eq("id", request.location_id).maybeSingle();
  if (!location) {
    return;
  }
  const { data: interests } = await supabase.from("request_interests").select("user_id").eq("request_id", requestId);
  const supporterIds = (interests ?? []).map((item) => item.user_id);
  const [locationFollows, homeIds] = await Promise.all([
    locationFollowsFor(location),
    homeCityMemberIds(location),
  ]);
  const memberIds = [...locationFollows.map((row) => row.userId), ...homeIds];
  await persistPlanned(
    planHighInterestCoverageRequest({
      actorId: request.created_by,
      requestId: request.id,
      location: toLocationSummary(location),
      supporterCount: supporterIds.length,
      eventId: request.event_id,
      supporterIds,
      locationFollows,
      members: await membersFor(memberIds),
    }),
  );
}

export async function supabaseDispatchLicensingInquiry(input: {
  actorId: string;
  reporterId: string;
  reportId: string;
  organizationName: string;
}) {
  const members = await membersFor([input.reporterId]);
  await persistPlanned(
    planLicensingInquiry({
      ...input,
      member: members.find((item) => item.id === input.reporterId),
    }),
  );
}

export async function supabaseDispatchLicensingStatusChange(input: {
  actorId: string;
  inquiryId: string;
  status: LicensingInquiryStatus;
}) {
  const supabase = await createClient();
  const { data: inquiry } = await supabase
    .from("licensing_transactions")
    .select("id, report_id, licensee_profile_id")
    .eq("id", input.inquiryId)
    .maybeSingle();
  if (!inquiry?.licensee_profile_id) {
    return;
  }
  const { data: report } = await supabase.from("reports").select("title").eq("id", inquiry.report_id).maybeSingle();
  const members = await membersFor([inquiry.licensee_profile_id]);
  await persistPlanned(
    planLicensingStatusChange({
      actorId: input.actorId,
      licenseeId: inquiry.licensee_profile_id,
      reportId: inquiry.report_id,
      reportTitle: report?.title ?? "your report",
      statusLabel: inquiryStatusLabel(input.status),
      member: members[0],
    }),
  );
}
