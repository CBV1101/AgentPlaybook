/**
 * In-app notification copy, preference mapping, and inbox helpers.
 *
 * Event generation lives in `lib/notification-events.ts` so later push, email,
 * or mobile delivery can reuse the same planned events. This module does not
 * send email, SMS, or push.
 */

export const NOTIFICATION_TYPES = [
  "new_report_from_followed_reporter",
  "new_report_from_followed_location",
  "coverage_request_in_followed_location",
  "coverage_request_response",
  "reporter_live",
  "live_in_followed_location",
  "licensing_inquiry",
  "licensing_status_change",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_PREFERENCE_KEYS = [
  "reporter_activity",
  "location_activity",
  "coverage_responses",
  "livestreams",
  "licensing",
] as const;

export type NotificationPreferenceKey = (typeof NOTIFICATION_PREFERENCE_KEYS)[number];

export type NotificationPreferences = Record<NotificationPreferenceKey, boolean>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  reporter_activity: true,
  location_activity: true,
  coverage_responses: true,
  livestreams: true,
  licensing: true,
};

export const NOTIFICATION_PREFERENCE_LABELS: Record<NotificationPreferenceKey, string> = {
  reporter_activity: "Reporter activity",
  location_activity: "Location activity",
  coverage_responses: "Coverage responses",
  livestreams: "Livestreams",
  licensing: "Licensing",
};

export const NOTIFICATION_TYPE_PREFERENCE: Record<NotificationType, NotificationPreferenceKey> = {
  new_report_from_followed_reporter: "reporter_activity",
  new_report_from_followed_location: "location_activity",
  coverage_request_in_followed_location: "location_activity",
  coverage_request_response: "coverage_responses",
  reporter_live: "livestreams",
  live_in_followed_location: "livestreams",
  licensing_inquiry: "licensing",
  licensing_status_change: "licensing",
};

/** Demand notifications fire once a request has this many supporters. */
export const HIGH_INTEREST_SUPPORTER_THRESHOLD = 3;

export type NotificationChannel = "in_app" | "push" | "email" | "mobile";

export const IN_APP_CHANNELS: NotificationChannel[] = ["in_app"];

export type NotificationRecord = {
  id: string;
  userId: string;
  type: NotificationType;
  actorId: string | null;
  locationId: string | null;
  eventId: string | null;
  coverageRequestId: string | null;
  reportId: string | null;
  liveStreamId: string | null;
  message: string;
  readAt: string | null;
  createdAt: string;
};

export function preferenceAllows(type: NotificationType, preferences: NotificationPreferences) {
  return preferences[NOTIFICATION_TYPE_PREFERENCE[type]] !== false;
}

export function mergeNotificationPreferences(
  row?: Partial<NotificationPreferences> | null,
): NotificationPreferences {
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...row,
  };
}

export function notificationHref(item: Pick<
  NotificationRecord,
  "type" | "reportId" | "liveStreamId" | "coverageRequestId"
>) {
  if (item.liveStreamId && (item.type === "reporter_live" || item.type === "live_in_followed_location")) {
    return `/live/${item.liveStreamId}`;
  }
  if (item.reportId) {
    return `/reports/${item.reportId}`;
  }
  if (item.coverageRequestId) {
    return `/requests/${item.coverageRequestId}`;
  }
  if (item.type === "licensing_inquiry" || item.type === "licensing_status_change") {
    return "/profile/licensing";
  }
  return "/notifications";
}

export function groupNotifications(items: NotificationRecord[], now = new Date()) {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const today: NotificationRecord[] = [];
  const earlier: NotificationRecord[] = [];
  for (const item of items) {
    if (new Date(item.createdAt) >= startOfToday) {
      today.push(item);
    } else {
      earlier.push(item);
    }
  }
  return { today, earlier };
}

export function coverageWantedMessage(placeLabel: string, supporterCount?: number) {
  if (supporterCount && supporterCount >= 10) {
    return `${supporterCount.toLocaleString("en")} people want coverage in ${placeLabel}`;
  }
  return `Coverage wanted in ${placeLabel}`;
}

export function followedReporterReportMessage(reporterName: string) {
  return `${reporterName} published a new report.`;
}

export function followedLocationReportMessage(placeLabel: string) {
  return `New firsthand report from ${placeLabel}.`;
}

export function coverageResponseMessage(reporterName: string, forSupporter: boolean) {
  return forSupporter
    ? `${reporterName} published a firsthand report for a coverage request you support.`
    : `${reporterName} published a firsthand report answering your coverage request.`;
}

export function liveFromPlaceMessage(reporterName: string, placeLabel: string) {
  return `${reporterName} is live from ${placeLabel}`;
}

export function licensingInquiryMessage(organizationName: string) {
  return `${organizationName} sent a licensing inquiry about your report.`;
}

export function licensingStatusMessage(reportTitle: string, statusLabel: string) {
  return `Licensing inquiry for “${reportTitle}” is now ${statusLabel}.`;
}
