import type { LocationSummary } from "@/lib/types";

export type DiscoveryPlace = LocationSummary & {
  reportCount: number;
  openRequestCount: number;
};

export type PlaceArchiveSort =
  | "newest_uploaded"
  | "newest_captured"
  | "oldest"
  | "most_requested";

export type PlaceArchiveFilters = {
  sort: PlaceArchiveSort;
  kinds: Array<"video" | "photo">;
  usage: Array<"view_only" | "licensing_available">;
};

export function aggregateDiscoveryPlaces(input: {
  locations: Array<LocationSummary & { id: string }>;
  reports: Array<{ locationId?: string }>;
  openRequests: Array<{ locationSlug?: string; location?: string }>;
  openRequestLocationIds: string[];
}): DiscoveryPlace[] {
  const reportCounts = new Map<string, number>();
  for (const report of input.reports) {
    if (!report.locationId) {
      continue;
    }
    reportCounts.set(report.locationId, (reportCounts.get(report.locationId) ?? 0) + 1);
  }

  const requestCounts = new Map<string, number>();
  for (const locationId of input.openRequestLocationIds) {
    requestCounts.set(locationId, (requestCounts.get(locationId) ?? 0) + 1);
  }

  return input.locations
    .filter((location) => location.latitude !== null && location.longitude !== null)
    .map((location) => ({
      ...location,
      reportCount: reportCounts.get(location.id) ?? 0,
      openRequestCount: requestCounts.get(location.id) ?? 0,
    }))
    .filter((place) => place.reportCount > 0 || place.openRequestCount > 0);
}

export function parsePlaceArchiveFilters(searchParams: {
  sort?: string | string[];
  kind?: string | string[];
  usage?: string | string[];
}): PlaceArchiveFilters {
  const sortValue = first(searchParams.sort);
  const sort: PlaceArchiveSort =
    sortValue === "newest_captured" || sortValue === "oldest" || sortValue === "most_requested"
      ? sortValue
      : "newest_uploaded";

  return {
    sort,
    kinds: asList(searchParams.kind).filter((value): value is "video" | "photo" => value === "video" || value === "photo"),
    usage: asList(searchParams.usage).filter(
      (value): value is "view_only" | "licensing_available" =>
        value === "view_only" || value === "licensing_available",
    ),
  };
}

export function filterAndSortPlaceReports<
  T extends {
    mediaKind: "video" | "photo" | "text";
    licensingStatus?: "view_only" | "licensing_available";
    publishedAt: string;
    capturedAt: string;
    respondsToRequest: boolean;
    requestSupporterCount?: number;
  },
>(reports: T[], filters: PlaceArchiveFilters): T[] {
  const filtered = reports.filter((report) => {
    if (filters.kinds.length > 0 && !filters.kinds.includes(report.mediaKind as "video" | "photo")) {
      return false;
    }
    if (filters.usage.length > 0 && !filters.usage.includes(report.licensingStatus as "view_only" | "licensing_available")) {
      return false;
    }
    return true;
  });

  return [...filtered].sort((a, b) => {
    if (filters.sort === "newest_captured") {
      return b.capturedAt.localeCompare(a.capturedAt);
    }
    if (filters.sort === "oldest") {
      return a.capturedAt.localeCompare(b.capturedAt) || a.publishedAt.localeCompare(b.publishedAt);
    }
    if (filters.sort === "most_requested") {
      const support = (b.requestSupporterCount ?? 0) - (a.requestSupporterCount ?? 0);
      if (support !== 0) {
        return support;
      }
      if (a.respondsToRequest !== b.respondsToRequest) {
        return a.respondsToRequest ? -1 : 1;
      }
      return b.publishedAt.localeCompare(a.publishedAt);
    }
    return b.publishedAt.localeCompare(a.publishedAt);
  });
}

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function asList(value?: string | string[]) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}
