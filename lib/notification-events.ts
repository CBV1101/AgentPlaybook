import { locationFollowMatch } from "@/lib/follows";
import {
  coverageResponseMessage,
  coverageWantedMessage,
  followedLocationReportMessage,
  followedReporterReportMessage,
  HIGH_INTEREST_SUPPORTER_THRESHOLD,
  IN_APP_CHANNELS,
  licensingInquiryMessage,
  licensingStatusMessage,
  liveFromPlaceMessage,
  mergeNotificationPreferences,
  preferenceAllows,
  type NotificationChannel,
  type NotificationPreferences,
  type NotificationType,
} from "@/lib/notifications";
import type { LocationSummary } from "@/lib/types";

export type PlannedNotification = {
  userId: string;
  type: NotificationType;
  actorId: string | null;
  locationId: string | null;
  eventId: string | null;
  coverageRequestId: string | null;
  reportId: string | null;
  liveStreamId: string | null;
  message: string;
  channels: NotificationChannel[];
};

export type NotificationAudienceMember = {
  id: string;
  homeCity: string | null;
  homeCountry: string | null;
  preferences: NotificationPreferences;
};

export type FollowedLocationRow = {
  userId: string;
  location: LocationSummary;
};

function emptyPlan(): PlannedNotification[] {
  return [];
}

function withPrefs(
  member: NotificationAudienceMember | undefined,
  type: NotificationType,
  build: () => PlannedNotification,
): PlannedNotification | null {
  const preferences = mergeNotificationPreferences(member?.preferences);
  if (!preferenceAllows(type, preferences)) {
    return null;
  }
  return build();
}

function homeCityMatches(
  member: NotificationAudienceMember,
  location: LocationSummary,
) {
  if (!member.homeCity || member.homeCity !== location.city) {
    return false;
  }
  if (member.homeCountry && member.homeCountry !== location.country) {
    return false;
  }
  return true;
}

function followsLocation(userId: string, location: LocationSummary, follows: FollowedLocationRow[]) {
  return follows.some(
    (row) => row.userId === userId && Boolean(locationFollowMatch(row.location, location)),
  );
}

function onePerUser(items: Array<PlannedNotification | null>) {
  const byUser = new Map<string, PlannedNotification>();
  for (const item of items) {
    if (!item || byUser.has(item.userId)) {
      continue;
    }
    byUser.set(item.userId, item);
  }
  return [...byUser.values()];
}

export function planPublishedReport(input: {
  actorId: string;
  actorName: string;
  reportId: string;
  location: LocationSummary;
  requestId: string | null;
  eventId?: string | null;
  requestCreatorId?: string | null;
  requestSupporterIds?: string[];
  reporterFollowerIds: string[];
  locationFollows: FollowedLocationRow[];
  members: NotificationAudienceMember[];
}): PlannedNotification[] {
  const supporters = new Set(input.requestSupporterIds ?? []);
  const members = new Map(input.members.map((item) => [item.id, item]));
  const planned: Array<PlannedNotification | null> = [];

  const candidateIds = new Set<string>([
    ...input.reporterFollowerIds,
    ...input.locationFollows.map((row) => row.userId),
    ...(input.requestCreatorId ? [input.requestCreatorId] : []),
    ...supporters,
  ]);

  for (const userId of candidateIds) {
    if (userId === input.actorId) {
      continue;
    }
    const member = members.get(userId);
    const followsReporter = input.reporterFollowerIds.includes(userId);
    const locationMatch = followsLocation(userId, input.location, input.locationFollows);
    const createdRequest = Boolean(input.requestId && input.requestCreatorId === userId);
    const supportedRequest = Boolean(input.requestId && supporters.has(userId));

    let type: NotificationType | null = null;
    let message = "";
    if (input.requestId && (createdRequest || supportedRequest)) {
      type = "coverage_request_response";
      message = coverageResponseMessage(input.actorName, supportedRequest && !createdRequest);
    } else if (followsReporter) {
      type = "new_report_from_followed_reporter";
      message = followedReporterReportMessage(input.actorName);
    } else if (locationMatch) {
      type = "new_report_from_followed_location";
      message = followedLocationReportMessage(input.location.label);
    }

    if (!type) {
      continue;
    }

    planned.push(
      withPrefs(member, type, () => ({
        userId,
        type,
        actorId: input.actorId,
        locationId: input.location.id,
        eventId: input.eventId ?? null,
        coverageRequestId: input.requestId,
        reportId: input.reportId,
        liveStreamId: null,
        message,
        channels: IN_APP_CHANNELS,
      })),
    );
  }

  return onePerUser(planned);
}

export function planLiveStarted(input: {
  actorId: string;
  actorName: string;
  liveStreamId: string;
  location: LocationSummary;
  eventId?: string | null;
  coverageRequestId?: string | null;
  reporterFollowerIds: string[];
  locationFollows: FollowedLocationRow[];
  members: NotificationAudienceMember[];
}): PlannedNotification[] {
  const members = new Map(input.members.map((item) => [item.id, item]));
  const candidateIds = new Set([
    ...input.reporterFollowerIds,
    ...input.locationFollows.map((row) => row.userId),
  ]);
  const planned: Array<PlannedNotification | null> = [];

  for (const userId of candidateIds) {
    if (userId === input.actorId) {
      continue;
    }
    const followsReporter = input.reporterFollowerIds.includes(userId);
    const locationMatch = followsLocation(userId, input.location, input.locationFollows);
    const type: NotificationType | null = followsReporter
      ? "reporter_live"
      : locationMatch
        ? "live_in_followed_location"
        : null;
    if (!type) {
      continue;
    }
    planned.push(
      withPrefs(members.get(userId), type, () => ({
        userId,
        type,
        actorId: input.actorId,
        locationId: input.location.id,
        eventId: input.eventId ?? null,
        coverageRequestId: input.coverageRequestId ?? null,
        reportId: null,
        liveStreamId: input.liveStreamId,
        message: liveFromPlaceMessage(input.actorName, input.location.label),
        channels: IN_APP_CHANNELS,
      })),
    );
  }

  return onePerUser(planned);
}

export function planHighInterestCoverageRequest(input: {
  actorId: string;
  requestId: string;
  location: LocationSummary;
  supporterCount: number;
  eventId?: string | null;
  supporterIds: string[];
  locationFollows: FollowedLocationRow[];
  members: NotificationAudienceMember[];
}): PlannedNotification[] {
  if (input.supporterCount < HIGH_INTEREST_SUPPORTER_THRESHOLD) {
    return emptyPlan();
  }

  const blocked = new Set([input.actorId, ...input.supporterIds]);
  const planned: Array<PlannedNotification | null> = [];

  for (const member of input.members) {
    if (blocked.has(member.id)) {
      continue;
    }
    const follows = followsLocation(member.id, input.location, input.locationFollows);
    const home = homeCityMatches(member, input.location);
    if (!follows && !home) {
      continue;
    }
    planned.push(
      withPrefs(member, "coverage_request_in_followed_location", () => ({
        userId: member.id,
        type: "coverage_request_in_followed_location",
        actorId: input.actorId,
        locationId: input.location.id,
        eventId: input.eventId ?? null,
        coverageRequestId: input.requestId,
        reportId: null,
        liveStreamId: null,
        message: coverageWantedMessage(input.location.label, input.supporterCount),
        channels: IN_APP_CHANNELS,
      })),
    );
  }

  return onePerUser(planned);
}

export function planLicensingInquiry(input: {
  actorId: string;
  reporterId: string;
  reportId: string;
  organizationName: string;
  member?: NotificationAudienceMember;
}): PlannedNotification[] {
  if (input.reporterId === input.actorId) {
    return emptyPlan();
  }
  const row = withPrefs(input.member, "licensing_inquiry", () => ({
    userId: input.reporterId,
    type: "licensing_inquiry" as const,
    actorId: input.actorId,
    locationId: null,
    eventId: null,
    coverageRequestId: null,
    reportId: input.reportId,
    liveStreamId: null,
    message: licensingInquiryMessage(input.organizationName),
    channels: IN_APP_CHANNELS,
  }));
  return row ? [row] : [];
}

export function planLicensingStatusChange(input: {
  actorId: string;
  licenseeId: string | null;
  reportId: string;
  reportTitle: string;
  statusLabel: string;
  member?: NotificationAudienceMember;
}): PlannedNotification[] {
  if (!input.licenseeId || input.licenseeId === input.actorId) {
    return emptyPlan();
  }
  const row = withPrefs(input.member, "licensing_status_change", () => ({
    userId: input.licenseeId!,
    type: "licensing_status_change" as const,
    actorId: input.actorId,
    locationId: null,
    eventId: null,
    coverageRequestId: null,
    reportId: input.reportId,
    liveStreamId: null,
    message: licensingStatusMessage(input.reportTitle, input.statusLabel),
    channels: IN_APP_CHANNELS,
  }));
  return row ? [row] : [];
}
