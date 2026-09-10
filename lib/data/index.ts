import { isMockMode } from "@/lib/data/mode";
import {
  mockCreateCoverageRequest,
  mockCreateReport,
  mockExpressInterest,
  mockFindOrCreateLocation,
  mockGetCoverageRequestPage,
  mockGetHomeFeed,
  mockGetLocationBySlug,
  mockGetPlacePageData,
  mockGetProfileByUserId,
  mockGetProfilePage,
  mockGetReportPage,
  mockGetRequestComposeContext,
  mockListModerationReports,
  mockRemoveReportedContent,
  mockSearchCoverage,
  mockSearchLocations,
  mockSubmitModerationReport,
  mockUpdateModerationStatus,
} from "@/lib/data/mock/repository";
import {
  supabaseCreateCoverageRequest,
  supabaseCreateReport,
  supabaseExpressInterest,
  supabaseFindOrCreateLocation,
  supabaseGetCoverageRequestPage,
  supabaseGetHomeFeed,
  supabaseGetLocationBySlug,
  supabaseGetPlacePageData,
  supabaseGetProfileByUserId,
  supabaseGetProfilePage,
  supabaseGetReportPage,
  supabaseGetRequestComposeContext,
  supabaseListModerationReports,
  supabaseRemoveReportedContent,
  supabaseSearchCoverage,
  supabaseSearchLocations,
  supabaseSubmitModerationReport,
  supabaseUpdateModerationStatus,
} from "@/lib/data/supabase/repository";
import type { StructuredLocation } from "@/lib/location";

export async function getHomeFeed(currentUserId?: string | null) {
  return isMockMode() ? mockGetHomeFeed(currentUserId) : supabaseGetHomeFeed();
}

export async function searchLocations(query: string) {
  return isMockMode() ? mockSearchLocations(query) : supabaseSearchLocations(query);
}

export async function searchCoverage(query: string, currentUserId?: string | null) {
  return isMockMode()
    ? mockSearchCoverage(query, currentUserId)
    : supabaseSearchCoverage(query, currentUserId);
}

export async function getLocationBySlug(slug: string) {
  return isMockMode() ? mockGetLocationBySlug(slug) : supabaseGetLocationBySlug(slug);
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

export async function getReportPage(id: string) {
  return isMockMode() ? mockGetReportPage(id) : supabaseGetReportPage(id);
}

export async function getRequestComposeContext(requestId: string) {
  return isMockMode()
    ? mockGetRequestComposeContext(requestId)
    : supabaseGetRequestComposeContext(requestId);
}

export async function findOrCreateLocation(location: StructuredLocation) {
  return isMockMode() ? mockFindOrCreateLocation(location) : supabaseFindOrCreateLocation(location);
}

export async function createCoverageRequestRecord(input: {
  userId: string;
  title: string;
  description: string | null;
  location: StructuredLocation;
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
  files: File[];
  licensingStatus: "view_only" | "licensing_available";
}) {
  return isMockMode() ? mockCreateReport(input) : supabaseCreateReport(input);
}

export async function submitModerationReport(input: {
  userId: string;
  contentType: "firsthand_report" | "coverage_request";
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
