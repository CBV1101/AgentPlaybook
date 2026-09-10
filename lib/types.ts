export type MediaKind = "video" | "photo" | "text";
export type LicensingStatus = "view_only" | "licensing_available";
export type CoverageRequestStatus = "open" | "fulfilled" | "closed";
export type MediaType = "photo" | "video";

export type LocationSummary = {
  id: string;
  slug: string;
  place: string | null;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  label: string;
};

export type CoverageRequest = {
  id: string;
  title: string;
  location: string;
  locationSlug?: string;
  supporterCount: number;
  createdAt: string;
  status?: CoverageRequestStatus;
  currentUserInterested?: boolean;
};

export type FirsthandReport = {
  id: string;
  title: string;
  location: string;
  locationId?: string;
  locationSlug?: string;
  excerpt: string;
  mediaKind: MediaKind;
  capturedAt: string;
  publishedAt: string;
  reporterName: string;
  reporterUsername?: string;
  thumbnailUrl?: string | null;
  licensingStatus?: LicensingStatus;
  requestId?: string | null;
  respondsToRequest: boolean;
  requestSupporterCount?: number;
};

export type ReporterStats = {
  reportCount: number;
  independentReportCount: number;
  locationCount: number;
  licensingAvailableCount: number;
  followerCount: number;
  supportCount: number;
  correctionCount: number;
  completedLicensingCount: number;
};

export type PlaceCovered = {
  location: LocationSummary;
  reportCount: number;
  latestUploadedAt: string;
};
