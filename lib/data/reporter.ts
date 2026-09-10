import type { LocationRow } from "@/lib/data/mappers";
import { toLocationSummary } from "@/lib/data/mappers";
import type { Profile } from "@/lib/database.types";
import type { FirsthandReport, PlaceCovered, ReporterStats } from "@/lib/types";

export type ReporterProfilePage = {
  profile: Profile;
  stats: ReporterStats;
  latestReports: FirsthandReport[];
  licensingReports: FirsthandReport[];
  placesCovered: PlaceCovered[];
};

export function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function assembleReporterProfilePage(
  profile: Profile,
  reports: FirsthandReport[],
  locationsById: Map<string, LocationRow>,
  extras?: Partial<Pick<ReporterStats, "followerCount" | "supportCount" | "correctionCount" | "completedLicensingCount">>,
): ReporterProfilePage {
  const latestReports = [...reports].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const placesCovered = buildPlacesCovered(latestReports, locationsById);
  const licensingReports = latestReports.filter((report) => report.licensingStatus === "licensing_available");

  return {
    profile,
    stats: buildReporterStats(latestReports, placesCovered, extras),
    latestReports,
    licensingReports,
    placesCovered,
  };
}

export function buildPlacesCovered(
  reports: FirsthandReport[],
  locationsById: Map<string, LocationRow>,
): PlaceCovered[] {
  const grouped = new Map<string, { reportCount: number; latestUploadedAt: string }>();

  for (const report of reports) {
    const locationId = report.locationId;
    if (!locationId) {
      continue;
    }
    const existing = grouped.get(locationId);
    if (!existing) {
      grouped.set(locationId, { reportCount: 1, latestUploadedAt: report.publishedAt });
      continue;
    }
    existing.reportCount += 1;
    if (report.publishedAt > existing.latestUploadedAt) {
      existing.latestUploadedAt = report.publishedAt;
    }
  }

  return [...grouped.entries()]
    .flatMap(([locationId, stats]) => {
      const location = locationsById.get(locationId);
      if (!location) {
        return [];
      }
      return [
        {
          location: toLocationSummary(location),
          reportCount: stats.reportCount,
          latestUploadedAt: stats.latestUploadedAt,
        },
      ];
    })
    .sort(
      (a, b) =>
        b.reportCount - a.reportCount || b.latestUploadedAt.localeCompare(a.latestUploadedAt),
    );
}

export function buildReporterStats(
  reports: FirsthandReport[],
  places: PlaceCovered[],
  extras?: Partial<Pick<ReporterStats, "followerCount" | "supportCount" | "correctionCount" | "completedLicensingCount">>,
): ReporterStats {
  return {
    reportCount: reports.length,
    independentReportCount: reports.filter((report) => !report.respondsToRequest).length,
    locationCount: places.length,
    licensingAvailableCount: reports.filter((report) => report.licensingStatus === "licensing_available").length,
    followerCount: extras?.followerCount ?? 0,
    supportCount: extras?.supportCount ?? 0,
    correctionCount: extras?.correctionCount ?? 0,
    completedLicensingCount: extras?.completedLicensingCount ?? 0,
  };
}
