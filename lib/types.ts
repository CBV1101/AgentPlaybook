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
  href: string;
};

export type CoverageRequest = {
  id: string;
  title: string;
  location: string;
  locationSlug?: string;
  locationHref?: string;
  city?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  supporterCount: number;
  responseCount?: number;
  createdAt: string;
  requestedLabel?: string;
  status?: CoverageRequestStatus;
  currentUserInterested?: boolean;
};

export type FirsthandReport = {
  id: string;
  title: string;
  location: string;
  locationId?: string;
  locationSlug?: string;
  locationHref?: string;
  city?: string;
  country?: string;
  excerpt: string;
  mediaKind: MediaKind;
  capturedAt: string;
  publishedAt: string;
  reporterName: string;
  reporterUsername?: string;
  reporterAvatarUrl?: string | null;
  thumbnailUrl?: string | null;
  licensingStatus?: LicensingStatus;
  requestId?: string | null;
  requestTitle?: string | null;
  respondsToRequest: boolean;
  requestSupporterCount?: number;
  recordedLive?: boolean;
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

export type EventStatus = "active" | "ended" | "archived";

export type EventSummary = {
  id: string;
  title: string;
  description: string | null;
  status: EventStatus;
  startedAt: string;
  endedAt: string | null;
  location: LocationSummary;
  reportCount: number;
  openRequestCount: number;
  reporterCount: number;
};

export type EventReporter = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export type EventTimelineItem =
  | { kind: "report"; at: string; report: FirsthandReport }
  | { kind: "request"; at: string; request: CoverageRequest };

export type EventPageData = {
  event: EventSummary;
  reports: FirsthandReport[];
  requests: CoverageRequest[];
  reporters: EventReporter[];
  timeline: EventTimelineItem[];
  liveStreams: import("@/lib/live").LiveStreamSummary[];
};
