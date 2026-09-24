import type { CoverageRequest } from "@/lib/types";

/**
 * Public demand is currently audience interest (`request_interests`) plus
 * how many firsthand reports already answer the request.
 *
 * Paid bounties are not in this model. Later funding can attach to the same
 * coverage request via a side table keyed by `coverage_requests.id`
 * (for example pledges or escrow), without changing the request itself.
 */
export const UNDER_COVERED_RESPONSE_LIMIT = 2;
export const WANTED_RADII_KM = [5, 25, 100] as const;

export type WantedSort = "hot" | "most_wanted" | "newest" | "nearest" | "unanswered";
export type WantedRadiusKm = (typeof WANTED_RADII_KM)[number];

export type GeoOrigin = {
  latitude: number;
  longitude: number;
};

export function peopleWantThisCovered(count: number) {
  return count === 1 ? "1 person wants this covered" : `${count} people want this covered`;
}

export function peopleWantedThisCovered(count: number) {
  const formatted = new Intl.NumberFormat("en-US").format(count);
  return count === 1
    ? `${formatted} person wanted this covered`
    : `${formatted} people wanted this covered`;
}

export function firsthandResponseLabel(count: number) {
  return count === 1 ? "1 firsthand response" : `${count} firsthand responses`;
}

export function coverageGap(responseCount: number) {
  if (responseCount <= 0) {
    return 0;
  }
  if (responseCount < UNDER_COVERED_RESPONSE_LIMIT) {
    return 1;
  }
  return 2;
}

export function homepageCoverageWanted(items: CoverageRequest[], limit = 6) {
  return [...items]
    .sort((a, b) => compareHomepageWanted(a, b))
    .slice(0, limit);
}

export function compareHomepageWanted(a: CoverageRequest, b: CoverageRequest) {
  const gap = coverageGap(a.responseCount ?? 0) - coverageGap(b.responseCount ?? 0);
  if (gap !== 0) {
    return gap;
  }
  if (b.supporterCount !== a.supporterCount) {
    return b.supporterCount - a.supporterCount;
  }
  return b.createdAt.localeCompare(a.createdAt);
}

export function compareMostWanted(a: CoverageRequest, b: CoverageRequest) {
  if (b.supporterCount !== a.supporterCount) {
    return b.supporterCount - a.supporterCount;
  }
  return b.createdAt.localeCompare(a.createdAt);
}

export function distanceKm(
  origin: GeoOrigin,
  latitude: number | null | undefined,
  longitude: number | null | undefined,
) {
  if (latitude == null || longitude == null) {
    return null;
  }
  const earthKm = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(latitude - origin.latitude);
  const dLon = toRad(longitude - origin.longitude);
  const lat1 = toRad(origin.latitude);
  const lat2 = toRad(latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistanceKm(km: number) {
  if (km < 1) {
    return "Less than 1 km away";
  }
  return `${Math.round(km)} km away`;
}

export function filterWantedItems(
  items: CoverageRequest[],
  filters: {
    country?: string;
    city?: string;
    origin?: GeoOrigin | null;
    radiusKm?: WantedRadiusKm | null;
    sort: WantedSort;
  },
) {
  const country = filters.country?.trim();
  const city = filters.city?.trim();
  const filtered = items.filter((item) => {
    if (country && item.country !== country) {
      return false;
    }
    if (city && item.city !== city) {
      return false;
    }
    if (filters.radiusKm && filters.origin) {
      const km = distanceKm(filters.origin, item.latitude, item.longitude);
      if (km == null || km > filters.radiusKm) {
        return false;
      }
    }
    return true;
  });

  return [...filtered].sort((a, b) => {
    if (filters.sort === "newest") {
      return b.createdAt.localeCompare(a.createdAt);
    }
    if (filters.sort === "unanswered") {
      const aOpen = (a.responseCount ?? 0) === 0 ? 1 : 0;
      const bOpen = (b.responseCount ?? 0) === 0 ? 1 : 0;
      if (bOpen !== aOpen) {
        return bOpen - aOpen;
      }
      return compareMostWanted(a, b);
    }
    if (filters.sort === "hot") {
      return compareHomepageWanted(a, b);
    }
    if (filters.sort === "nearest" && filters.origin) {
      const aKm = distanceKm(filters.origin, a.latitude, a.longitude);
      const bKm = distanceKm(filters.origin, b.latitude, b.longitude);
      if (aKm == null && bKm == null) {
        return compareMostWanted(a, b);
      }
      if (aKm == null) {
        return 1;
      }
      if (bKm == null) {
        return -1;
      }
      if (aKm !== bKm) {
        return aKm - bKm;
      }
    }
    return compareMostWanted(a, b);
  });
}

export function nearbyWantedItems(
  items: CoverageRequest[],
  origin: GeoOrigin,
  radiusKm: WantedRadiusKm,
) {
  return items
    .map((item) => ({
      item,
      km: distanceKm(origin, item.latitude, item.longitude),
    }))
    .filter((row) => row.km != null && row.km <= radiusKm)
    .sort((a, b) => (a.km ?? 0) - (b.km ?? 0) || compareMostWanted(a.item, b.item))
    .map((row) => row.item);
}

export function wantedCountries(items: CoverageRequest[]) {
  return [...new Set(items.map((item) => item.country).filter((value): value is string => Boolean(value)))].sort();
}

export function wantedCities(items: CoverageRequest[], country?: string) {
  return [
    ...new Set(
      items
        .filter((item) => (country ? item.country === country : true))
        .map((item) => item.city)
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort();
}
