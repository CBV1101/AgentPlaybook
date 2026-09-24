import { randomUUID } from "node:crypto";
import { toLocationSummary } from "@/lib/data/mappers";
import { readMockDatabase, updateMockDatabase } from "@/lib/data/mock/store";
import {
  planHighInterestCoverageRequest,
  planLicensingInquiry,
  planLicensingStatusChange,
  planLiveStarted,
  planPublishedReport,
  type PlannedNotification,
} from "@/lib/notification-events";
import {
  mergeNotificationPreferences,
  type NotificationPreferences,
  type NotificationRecord,
  type NotificationType,
} from "@/lib/notifications";
import { inquiryStatusLabel, type LicensingInquiryStatus } from "@/lib/licensing";
import type { MockDatabase } from "@/lib/data/mock/seed";
import type { NotificationPreferenceRow, NotificationRecordRow } from "@/lib/database.types";

function toRecord(row: NotificationRecordRow): NotificationRecord {
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

function prefsFor(database: MockDatabase, userId: string): NotificationPreferences {
  const row = (database.notification_preferences ?? []).find((item) => item.user_id === userId);
  return mergeNotificationPreferences(row);
}

function membersFrom(database: MockDatabase) {
  return database.profiles.map((profile) => ({
    id: profile.id,
    homeCity: profile.home_city,
    homeCountry: profile.home_country,
    preferences: prefsFor(database, profile.id),
  }));
}

function locationFollowsFrom(database: MockDatabase) {
  return (database.location_follows ?? []).flatMap((row) => {
    const location = database.locations.find((item) => item.id === row.location_id);
    return location ? [{ userId: row.user_id, location: toLocationSummary(location) }] : [];
  });
}

function reporterFollowers(database: MockDatabase, reporterId: string) {
  return (database.profile_follows ?? [])
    .filter((item) => item.following_id === reporterId)
    .map((item) => item.follower_id);
}

function isDuplicate(existing: NotificationRecordRow[], planned: PlannedNotification) {
  if (planned.type === "licensing_status_change") {
    return false;
  }
  return existing.some((row) => {
    if (row.user_id !== planned.userId || row.type !== planned.type) {
      return false;
    }
    if (planned.liveStreamId) {
      return row.live_stream_id === planned.liveStreamId;
    }
    if (planned.type === "coverage_request_in_followed_location") {
      return row.coverage_request_id === planned.coverageRequestId;
    }
    if (planned.reportId) {
      return row.report_id === planned.reportId;
    }
    return false;
  });
}

function persistPlanned(planned: PlannedNotification[]) {
  if (planned.length === 0) {
    return;
  }
  const now = new Date().toISOString();
  updateMockDatabase((current) => {
    current.notifications ??= [];
    for (const item of planned) {
      if (isDuplicate(current.notifications, item)) {
        continue;
      }
      current.notifications.push({
        id: randomUUID(),
        user_id: item.userId,
        type: item.type,
        actor_id: item.actorId,
        location_id: item.locationId,
        event_id: item.eventId,
        coverage_request_id: item.coverageRequestId,
        report_id: item.reportId,
        live_stream_id: item.liveStreamId,
        message: item.message,
        read_at: null,
        created_at: now,
      });
    }
  });
}

export function mockListNotifications(userId: string): NotificationRecord[] {
  return (readMockDatabase().notifications ?? [])
    .filter((item) => item.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 100)
    .map(toRecord);
}

export function mockUnreadNotificationCount(userId: string) {
  return (readMockDatabase().notifications ?? []).filter(
    (item) => item.user_id === userId && !item.read_at,
  ).length;
}

export function mockMarkNotificationRead(userId: string, notificationId: string) {
  const now = new Date().toISOString();
  updateMockDatabase((current) => {
    const row = (current.notifications ?? []).find((item) => item.id === notificationId && item.user_id === userId);
    if (row && !row.read_at) {
      row.read_at = now;
    }
  });
}

export function mockMarkAllNotificationsRead(userId: string) {
  const now = new Date().toISOString();
  updateMockDatabase((current) => {
    for (const row of current.notifications ?? []) {
      if (row.user_id === userId && !row.read_at) {
        row.read_at = now;
      }
    }
  });
}

export function mockGetNotificationPreferences(userId: string): NotificationPreferences {
  return prefsFor(readMockDatabase(), userId);
}

export function mockUpdateNotificationPreferences(userId: string, next: NotificationPreferences) {
  const now = new Date().toISOString();
  updateMockDatabase((current) => {
    current.notification_preferences ??= [];
    const existing = current.notification_preferences.find((item) => item.user_id === userId);
    const row: NotificationPreferenceRow = {
      user_id: userId,
      reporter_activity: next.reporter_activity,
      location_activity: next.location_activity,
      coverage_responses: next.coverage_responses,
      livestreams: next.livestreams,
      licensing: next.licensing,
      updated_at: now,
    };
    if (existing) {
      Object.assign(existing, row);
    } else {
      current.notification_preferences.push(row);
    }
  });
}

export function mockDispatchPublishedReport(reportId: string) {
  const database = readMockDatabase();
  const report = database.reports.find((item) => item.id === reportId);
  if (!report || report.publish_status !== "published" || report.removed_at) {
    return;
  }
  const location = database.locations.find((item) => item.id === report.location_id);
  const actor = database.profiles.find((item) => item.id === report.created_by);
  if (!location || !actor) {
    return;
  }
  const request = report.request_id
    ? database.coverage_requests.find((item) => item.id === report.request_id)
    : null;
  const supporterIds = report.request_id
    ? database.request_interests.filter((item) => item.request_id === report.request_id).map((item) => item.user_id)
    : [];
  persistPlanned(
    planPublishedReport({
      actorId: actor.id,
      actorName: actor.display_name,
      reportId: report.id,
      location: toLocationSummary(location),
      requestId: report.request_id,
      eventId: report.event_id,
      requestCreatorId: request?.created_by ?? null,
      requestSupporterIds: supporterIds,
      reporterFollowerIds: reporterFollowers(database, actor.id),
      locationFollows: locationFollowsFrom(database),
      members: membersFrom(database),
    }),
  );
}

export function mockDispatchLiveStarted(liveStreamId: string) {
  const database = readMockDatabase();
  const stream = (database.live_streams ?? []).find((item) => item.id === liveStreamId);
  if (!stream || stream.status !== "live") {
    return;
  }
  const location = database.locations.find((item) => item.id === stream.location_id);
  const actor = database.profiles.find((item) => item.id === stream.reporter_id);
  if (!location || !actor) {
    return;
  }
  persistPlanned(
    planLiveStarted({
      actorId: actor.id,
      actorName: actor.display_name,
      liveStreamId: stream.id,
      location: toLocationSummary(location),
      eventId: stream.event_id,
      coverageRequestId: stream.coverage_request_id,
      reporterFollowerIds: reporterFollowers(database, actor.id),
      locationFollows: locationFollowsFrom(database),
      members: membersFrom(database),
    }),
  );
}

export function mockDispatchHighInterestRequest(requestId: string) {
  const database = readMockDatabase();
  const request = database.coverage_requests.find((item) => item.id === requestId);
  if (!request || request.removed_at || request.status !== "open") {
    return;
  }
  const location = database.locations.find((item) => item.id === request.location_id);
  if (!location) {
    return;
  }
  const supporterIds = database.request_interests
    .filter((item) => item.request_id === requestId)
    .map((item) => item.user_id);
  persistPlanned(
    planHighInterestCoverageRequest({
      actorId: request.created_by,
      requestId: request.id,
      location: toLocationSummary(location),
      supporterCount: supporterIds.length,
      eventId: request.event_id,
      supporterIds,
      locationFollows: locationFollowsFrom(database),
      members: membersFrom(database),
    }),
  );
}

export function mockDispatchLicensingInquiry(input: {
  actorId: string;
  reporterId: string;
  reportId: string;
  organizationName: string;
}) {
  const database = readMockDatabase();
  persistPlanned(
    planLicensingInquiry({
      ...input,
      member: membersFrom(database).find((item) => item.id === input.reporterId),
    }),
  );
}

export function mockDispatchLicensingStatusChange(input: {
  actorId: string;
  inquiryId: string;
  status: LicensingInquiryStatus;
}) {
  const database = readMockDatabase();
  const inquiry = database.licensing_transactions.find((item) => item.id === input.inquiryId);
  if (!inquiry) {
    return;
  }
  const report = database.reports.find((item) => item.id === inquiry.report_id);
  persistPlanned(
    planLicensingStatusChange({
      actorId: input.actorId,
      licenseeId: inquiry.licensee_profile_id,
      reportId: inquiry.report_id,
      reportTitle: report?.title ?? "your report",
      statusLabel: inquiryStatusLabel(input.status),
      member: inquiry.licensee_profile_id
        ? membersFrom(database).find((item) => item.id === inquiry.licensee_profile_id)
        : undefined,
    }),
  );
}
