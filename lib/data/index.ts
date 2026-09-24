import { isMockMode } from "@/lib/data/mode";
import {
  mockCreateEvent,
  mockGetEventPage,
  mockListActiveEvents,
  mockListActiveEventsAtLocation,
  mockCreateLicensingInquiry,
  mockCreateCoverageRequest,
  mockCreateReport,
  mockCreateMediaSession,
  mockCompleteLocalMedia,
  mockRefreshVideoStatus,
  mockMarkMediaStatus,
  mockCompleteImageMedia,
  mockPublishReport,
  mockExpressInterest,
  mockFollowLocation,
  mockFollowReporter,
  mockGetFollowingFeed,
  mockGetFollowGraph,
  mockIsFollowingLocation,
  mockIsFollowingReporter,
  mockSupportReport,
  mockUpdateLicensingInquiryStatus,
  mockUnfollowLocation,
  mockUnfollowReporter,
  mockFindOrCreateLocation,
  mockGetCoverageRequestPage,
  mockGetHomeFeed,
  mockListOpenCoverageWanted,
  mockGetLocationBySlug,
  mockGetLocationById,
  mockGetPlacePageData,
  mockGetProfileByUserId,
  mockGetProfilePage,
  mockIsUsernameAvailable,
  mockSetReporterAvatar,
  mockUpdateReporterProfile,
  mockGetReportPage,
  mockGetRequestComposeContext,
  mockGetBrowseOverview,
  mockGetCountryPage,
  mockGetCityPage,
  mockListLicensingInbox,
  mockListModerationReports,
  mockRemoveReportSupport,
  mockRemoveReportedContent,
  mockSearchCoverage,
  mockSearchGeography,
  mockSearchLocations,
  mockSubmitModerationReport,
  mockUpdateModerationStatus,
  mockCreateLiveStream,
  mockEndLiveStream,
  mockGetLiveStreamPage,
  mockHeartbeatLiveStream,
  mockListPublicLiveStreams,
  mockLiveBroadcastSession,
  mockMarkLiveStream,
  mockSetReporterLivePrivilege,
  mockSetSensitiveContent,
} from "@/lib/data/mock/repository";
import { mockSearchFirsthand } from "@/lib/data/mock/search";
import {
  mockGetNotificationPreferences,
  mockListNotifications,
  mockMarkAllNotificationsRead,
  mockMarkNotificationRead,
  mockUnreadNotificationCount,
  mockUpdateNotificationPreferences,
} from "@/lib/data/mock/notification-repository";
import {
  supabaseCreateEvent,
  supabaseGetEventPage,
  supabaseListActiveEvents,
  supabaseListActiveEventsAtLocation,
  supabaseCreateLicensingInquiry,
  supabaseCreateCoverageRequest,
  supabaseCreateReport,
  supabaseCreateMediaSession,
  supabaseCompleteLocalMedia,
  supabaseRefreshVideoStatus,
  supabaseMarkMediaStatus,
  supabaseCompleteImageMedia,
  supabasePublishReport,
  supabaseExpressInterest,
  supabaseFollowLocation,
  supabaseFollowReporter,
  supabaseGetFollowingFeed,
  supabaseGetFollowGraph,
  supabaseIsFollowingLocation,
  supabaseIsFollowingReporter,
  supabaseSupportReport,
  supabaseUpdateLicensingInquiryStatus,
  supabaseUnfollowLocation,
  supabaseUnfollowReporter,
  supabaseFindOrCreateLocation,
  supabaseGetCoverageRequestPage,
  supabaseGetHomeFeed,
  supabaseListOpenCoverageWanted,
  supabaseGetLocationBySlug,
  supabaseGetLocationById,
  supabaseGetPlacePageData,
  supabaseGetBrowseOverview,
  supabaseGetCountryPage,
  supabaseGetCityPage,
  supabaseGetProfileByUserId,
  supabaseGetProfilePage,
  supabaseIsUsernameAvailable,
  supabaseSetReporterAvatar,
  supabaseUpdateReporterProfile,
  supabaseGetReportPage,
  supabaseGetRequestComposeContext,
  supabaseListLicensingInbox,
  supabaseListModerationReports,
  supabaseRemoveReportSupport,
  supabaseRemoveReportedContent,
  supabaseSearchCoverage,
  supabaseSearchGeography,
  supabaseSearchLocations,
  supabaseSubmitModerationReport,
  supabaseUpdateModerationStatus,
} from "@/lib/data/supabase/repository";
import { supabaseSearchFirsthand } from "@/lib/data/supabase/search";
import {
  supabaseCreateLiveStream,
  supabaseEndLiveStream,
  supabaseGetLiveStreamPage,
  supabaseHeartbeatLiveStream,
  supabaseListPublicLiveStreams,
  supabaseLiveBroadcastSession,
  supabaseMarkLiveStream,
  supabaseSetReporterLivePrivilege,
  supabaseSetSensitiveContent,
} from "@/lib/data/supabase/live-repository";
import {
  supabaseGetNotificationPreferences,
  supabaseListNotifications,
  supabaseMarkAllNotificationsRead,
  supabaseMarkNotificationRead,
  supabaseUnreadNotificationCount,
  supabaseUpdateNotificationPreferences,
} from "@/lib/data/supabase/notification-repository";
import type { EventSummary } from "@/lib/types";
import type { LiveStreamSummary } from "@/lib/live";
import type { GeoFollowTarget } from "@/lib/follows";
import type { LicensingInquiryStatus } from "@/lib/licensing";
import type { StructuredLocation } from "@/lib/location";
import type { NotificationPreferences, NotificationRecord } from "@/lib/notifications";

export async function getHomeFeed(currentUserId?: string | null) {
  return isMockMode() ? mockGetHomeFeed(currentUserId) : supabaseGetHomeFeed();
}

export async function listOpenCoverageWanted(currentUserId?: string | null) {
  return isMockMode()
    ? mockListOpenCoverageWanted(currentUserId)
    : supabaseListOpenCoverageWanted(currentUserId);
}

export async function searchLocations(query: string) {
  return isMockMode() ? mockSearchLocations(query) : supabaseSearchLocations(query);
}

export async function searchCoverage(query: string, currentUserId?: string | null) {
  return isMockMode()
    ? mockSearchCoverage(query, currentUserId)
    : supabaseSearchCoverage(query, currentUserId);
}

export async function searchGeography(query: string) {
  return isMockMode() ? mockSearchGeography(query) : supabaseSearchGeography(query);
}

export async function searchFirsthand(
  query: import("@/lib/search").SearchQuery,
  currentUserId?: string | null,
) {
  return isMockMode() ? mockSearchFirsthand(query, currentUserId) : supabaseSearchFirsthand(query, currentUserId);
}

export async function getBrowseOverview() {
  return isMockMode() ? mockGetBrowseOverview() : supabaseGetBrowseOverview();
}

export async function getCountryPage(slug: string, currentUserId?: string | null) {
  return isMockMode() ? mockGetCountryPage(slug, currentUserId) : supabaseGetCountryPage(slug, currentUserId);
}

export async function getCityPage(slug: string, currentUserId?: string | null) {
  return isMockMode() ? mockGetCityPage(slug, currentUserId) : supabaseGetCityPage(slug, currentUserId);
}

export async function getLocationBySlug(slug: string) {
  return isMockMode() ? mockGetLocationBySlug(slug) : supabaseGetLocationBySlug(slug);
}

export async function getLocationById(id: string) {
  return isMockMode() ? mockGetLocationById(id) : supabaseGetLocationById(id);
}

export async function getPlacePageData(slug: string, currentUserId?: string | null) {
  return isMockMode()
    ? mockGetPlacePageData(slug, currentUserId)
    : supabaseGetPlacePageData(slug, currentUserId);
}

export async function getCoverageRequestPage(id: string, currentUserId?: string | null) {
  return isMockMode()
    ? mockGetCoverageRequestPage(id, currentUserId)
    : supabaseGetCoverageRequestPage(id, currentUserId);
}

export async function getProfilePage(username: string) {
  return isMockMode() ? mockGetProfilePage(username) : supabaseGetProfilePage(username);
}

export async function getProfileByUserId(userId: string) {
  return isMockMode() ? mockGetProfileByUserId(userId) : supabaseGetProfileByUserId(userId);
}

export async function isUsernameAvailable(username: string, excludeUserId?: string) {
  return isMockMode()
    ? mockIsUsernameAvailable(username, excludeUserId)
    : supabaseIsUsernameAvailable(username, excludeUserId);
}

export async function updateReporterProfile(
  userId: string,
  patch: import("@/lib/profile").ReporterProfilePatch,
) {
  return isMockMode()
    ? mockUpdateReporterProfile(userId, patch)
    : supabaseUpdateReporterProfile(userId, patch);
}

export async function setReporterAvatar(
  userId: string,
  file: { bytes: Uint8Array; filename: string; contentType: string; size: number } | null,
) {
  return isMockMode() ? mockSetReporterAvatar(userId, file) : supabaseSetReporterAvatar(userId, file);
}

export async function getReportPage(id: string, currentUserId?: string | null) {
  return isMockMode() ? mockGetReportPage(id, currentUserId) : supabaseGetReportPage(id, currentUserId);
}

export async function getRequestComposeContext(requestId: string) {
  return isMockMode()
    ? mockGetRequestComposeContext(requestId)
    : supabaseGetRequestComposeContext(requestId);
}

export async function isFollowingReporter(followerId: string, reporterId: string) {
  return isMockMode()
    ? mockIsFollowingReporter(followerId, reporterId)
    : supabaseIsFollowingReporter(followerId, reporterId);
}

export async function followReporter(followerId: string, reporterId: string) {
  return isMockMode() ? mockFollowReporter(followerId, reporterId) : supabaseFollowReporter(followerId, reporterId);
}

export async function unfollowReporter(followerId: string, reporterId: string) {
  return isMockMode()
    ? mockUnfollowReporter(followerId, reporterId)
    : supabaseUnfollowReporter(followerId, reporterId);
}

export async function isFollowingLocation(userId: string, target: GeoFollowTarget) {
  return isMockMode()
    ? mockIsFollowingLocation(userId, target)
    : supabaseIsFollowingLocation(userId, target);
}

export async function followLocation(userId: string, target: GeoFollowTarget) {
  return isMockMode() ? mockFollowLocation(userId, target) : supabaseFollowLocation(userId, target);
}

export async function unfollowLocation(userId: string, target: GeoFollowTarget) {
  return isMockMode() ? mockUnfollowLocation(userId, target) : supabaseUnfollowLocation(userId, target);
}

export async function getFollowingFeed(userId: string) {
  return isMockMode() ? mockGetFollowingFeed(userId) : supabaseGetFollowingFeed(userId);
}

export async function getFollowGraph(userId: string) {
  return isMockMode() ? mockGetFollowGraph(userId) : supabaseGetFollowGraph(userId);
}

export async function findOrCreateLocation(location: StructuredLocation) {
  return isMockMode() ? mockFindOrCreateLocation(location) : supabaseFindOrCreateLocation(location);
}

export async function createCoverageRequestRecord(input: {
  userId: string;
  title: string;
  description: string | null;
  location: StructuredLocation;
  eventId?: string | null;
}) {
  return isMockMode() ? mockCreateCoverageRequest(input) : supabaseCreateCoverageRequest(input);
}

export async function expressInterestRecord(requestId: string, userId: string) {
  return isMockMode() ? mockExpressInterest(requestId, userId) : supabaseExpressInterest(requestId, userId);
}

export async function createReportRecord(input: {
  userId: string;
  title: string;
  description: string;
  capturedAt: string;
  requestId: string | null;
  locationId?: string;
  location?: StructuredLocation | null;
  licensingStatus: "view_only" | "licensing_available";
  eventId?: string | null;
}) {
  return isMockMode() ? mockCreateReport(input) : supabaseCreateReport(input);
}

export async function createMediaUploadSession(input: {
  userId: string;
  reportId: string;
  mediaType: "photo" | "video";
  filename: string;
  fileSize: number;
  contentType: string;
  capturedAt: string;
  licensingStatus: "view_only" | "licensing_available";
  originalSha256?: string | null;
}) {
  return isMockMode() ? mockCreateMediaSession(input) : supabaseCreateMediaSession(input);
}

export async function completeLocalMediaUpload(input: {
  userId: string;
  mediaId: string;
  filename: string;
  bytes: Uint8Array;
}) {
  return isMockMode() ? mockCompleteLocalMedia(input) : supabaseCompleteLocalMedia(input);
}

export async function refreshVideoMediaStatus(userId: string, mediaId: string) {
  return isMockMode() ? mockRefreshVideoStatus(userId, mediaId) : supabaseRefreshVideoStatus(userId, mediaId);
}

export async function markMediaUploadStatus(
  userId: string,
  mediaId: string,
  status: "uploading" | "processing" | "failed",
) {
  return isMockMode()
    ? mockMarkMediaStatus(userId, mediaId, status)
    : supabaseMarkMediaStatus(userId, mediaId, status);
}

export async function completeImageMediaUpload(userId: string, mediaId: string, publicUrl: string) {
  return isMockMode()
    ? mockCompleteImageMedia(userId, mediaId, publicUrl)
    : supabaseCompleteImageMedia(userId, mediaId, publicUrl);
}

export async function publishReportRecord(userId: string, reportId: string) {
  return isMockMode() ? mockPublishReport(userId, reportId) : supabasePublishReport(userId, reportId);
}

export async function submitModerationReport(input: {
  userId: string;
  contentType: "firsthand_report" | "coverage_request" | "live_stream";
  contentId: string;
  reason: string;
  details: string | null;
}) {
  return isMockMode() ? mockSubmitModerationReport(input) : supabaseSubmitModerationReport(input);
}

export async function listModerationReports() {
  return isMockMode() ? mockListModerationReports() : supabaseListModerationReports();
}

export async function updateModerationStatus(
  id: string,
  status: "open" | "reviewed" | "dismissed" | "removed",
) {
  return isMockMode() ? mockUpdateModerationStatus(id, status) : supabaseUpdateModerationStatus(id, status);
}

export async function removeReportedContent(id: string) {
  return isMockMode() ? mockRemoveReportedContent(id) : supabaseRemoveReportedContent(id);
}

export async function supportReport(reportId: string, userId: string) {
  return isMockMode() ? mockSupportReport(reportId, userId) : supabaseSupportReport(reportId, userId);
}

export async function removeReportSupport(reportId: string, userId: string) {
  return isMockMode()
    ? mockRemoveReportSupport(reportId, userId)
    : supabaseRemoveReportSupport(reportId, userId);
}

export async function createLicensingInquiry(input: {
  userId: string;
  reportId: string;
  mediaId: string | null;
  organizationName: string;
  contactEmail: string;
  intendedUse: string;
  message: string;
}) {
  return isMockMode() ? mockCreateLicensingInquiry(input) : supabaseCreateLicensingInquiry(input);
}

export async function listLicensingInbox(userId: string) {
  return isMockMode() ? mockListLicensingInbox(userId) : supabaseListLicensingInbox(userId);
}

export async function updateLicensingInquiryStatus(
  userId: string,
  inquiryId: string,
  status: LicensingInquiryStatus,
) {
  return isMockMode()
    ? mockUpdateLicensingInquiryStatus(userId, inquiryId, status)
    : supabaseUpdateLicensingInquiryStatus(userId, inquiryId, status);
}

export async function listActiveEvents(locationId?: string | null): Promise<EventSummary[]> {
  return isMockMode()
    ? mockListActiveEvents(locationId)
    : supabaseListActiveEvents(locationId ? [locationId] : undefined);
}

export async function listActiveEventsAtLocation(location: StructuredLocation): Promise<EventSummary[]> {
  return isMockMode()
    ? mockListActiveEventsAtLocation(location)
    : supabaseListActiveEventsAtLocation(location);
}

export async function getEventPage(id: string, currentUserId?: string | null) {
  return isMockMode() ? mockGetEventPage(id, currentUserId) : supabaseGetEventPage(id, currentUserId);
}

export async function createEventRecord(input: {
  userId: string;
  title: string;
  description: string | null;
  startedAt: string;
  location: StructuredLocation;
}) {
  return isMockMode() ? mockCreateEvent(input) : supabaseCreateEvent(input);
}

export async function listPublicLiveStreams(filter?: {
  locationIds?: string[];
  eventId?: string;
  reporterId?: string;
  requestId?: string;
}): Promise<LiveStreamSummary[]> {
  return isMockMode() ? mockListPublicLiveStreams(filter) : supabaseListPublicLiveStreams(filter);
}

export async function getLiveStreamPage(id: string, currentUserId?: string | null) {
  return isMockMode() ? mockGetLiveStreamPage(id, currentUserId) : supabaseGetLiveStreamPage(id, currentUserId);
}

export async function createLiveStreamRecord(input: {
  userId: string;
  title: string;
  locationId: string;
  eventId?: string | null;
  requestId?: string | null;
}) {
  return isMockMode() ? mockCreateLiveStream(input) : supabaseCreateLiveStream(input);
}

export async function liveBroadcastSession(userId: string, streamId: string) {
  return isMockMode() ? mockLiveBroadcastSession(userId, streamId) : supabaseLiveBroadcastSession(userId, streamId);
}

export async function markLiveStreamStatus(userId: string, streamId: string, status: "live" | "failed") {
  return isMockMode()
    ? mockMarkLiveStream(userId, streamId, status)
    : supabaseMarkLiveStream(userId, streamId, status);
}

export async function heartbeatLiveStream(userId: string, streamId: string) {
  return isMockMode()
    ? mockHeartbeatLiveStream(userId, streamId)
    : supabaseHeartbeatLiveStream(userId, streamId);
}

export async function endLiveStreamRecord(userId: string, streamId: string) {
  return isMockMode() ? mockEndLiveStream(userId, streamId) : supabaseEndLiveStream(userId, streamId);
}

export async function setReporterLivePrivilege(reporterId: string, canLiveStream: boolean) {
  return isMockMode()
    ? mockSetReporterLivePrivilege(reporterId, canLiveStream)
    : supabaseSetReporterLivePrivilege(reporterId, canLiveStream);
}

export async function setSensitiveContentFlag(input: {
  contentType: "live_stream" | "firsthand_report";
  contentId: string;
  sensitive: boolean;
}) {
  return isMockMode() ? mockSetSensitiveContent(input) : supabaseSetSensitiveContent(input);
}

export async function listNotifications(userId: string): Promise<NotificationRecord[]> {
  return isMockMode() ? mockListNotifications(userId) : supabaseListNotifications(userId);
}

export async function unreadNotificationCount(userId: string) {
  return isMockMode()
    ? mockUnreadNotificationCount(userId)
    : supabaseUnreadNotificationCount(userId);
}

export async function markNotificationRead(userId: string, notificationId: string) {
  return isMockMode()
    ? mockMarkNotificationRead(userId, notificationId)
    : supabaseMarkNotificationRead(userId, notificationId);
}

export async function markAllNotificationsRead(userId: string) {
  return isMockMode()
    ? mockMarkAllNotificationsRead(userId)
    : supabaseMarkAllNotificationsRead(userId);
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  return isMockMode()
    ? mockGetNotificationPreferences(userId)
    : supabaseGetNotificationPreferences(userId);
}

export async function updateNotificationPreferences(userId: string, next: NotificationPreferences) {
  return isMockMode()
    ? mockUpdateNotificationPreferences(userId, next)
    : supabaseUpdateNotificationPreferences(userId, next);
}
