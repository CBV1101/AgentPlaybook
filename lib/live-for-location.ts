import { isPubliclyLive, type LiveStreamSummary } from "@/lib/live";
import type { BoundingBox, GeoScope } from "@/lib/location";
import type { FirsthandReport } from "@/lib/types";

export type { BoundingBox, GeoScope };

export type PlaceQuery = {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  scope?: GeoScope;
  boundingBox?: BoundingBox | null;
};

/**
 * Metro hubs whose named boroughs/districts are the same city in our location model.
 * Applied only when the searched place IS the hub (New York), not a child (Brooklyn).
 */
const METRO_MEMBERS: Record<string, string[]> = {
  "newyork|unitedstates": ["newyork", "manhattan", "brooklyn", "queens", "bronx", "statenisland"],
};

export function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function normalizeCityName(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\bcity\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function sameCity(a: string, b: string) {
  const left = normalizeCityName(a);
  const right = normalizeCityName(b);
  return Boolean(left) && left === right;
}

function sameCountry(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function metroKey(city: string, country: string) {
  return `${normalizeCityName(city)}|${country.trim().toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
}

function streamInMetroHub(place: PlaceQuery, streamCity: string, streamCountry: string) {
  if (!sameCountry(place.country, streamCountry)) {
    return false;
  }
  const members = METRO_MEMBERS[metroKey(place.city, place.country)];
  if (!members) {
    return false;
  }
  return members.includes(normalizeCityName(streamCity));
}

export function pointInBoundingBox(latitude: number, longitude: number, box: BoundingBox) {
  if (latitude < box.south || latitude > box.north) {
    return false;
  }
  if (box.west <= box.east) {
    return longitude >= box.west && longitude <= box.east;
  }
  return longitude >= box.west || longitude <= box.east;
}

export function compareLiveStreamsByViewers(a: LiveStreamSummary, b: LiveStreamSummary) {
  const viewersA = a.viewerCount ?? -1;
  const viewersB = b.viewerCount ?? -1;
  if (viewersA !== viewersB) {
    return viewersB - viewersA;
  }
  const started = (b.startedAt ?? "").localeCompare(a.startedAt ?? "");
  if (started !== 0) {
    return started;
  }
  return a.id.localeCompare(b.id);
}

export function liveStreamMatchesPlace(stream: LiveStreamSummary, place: PlaceQuery) {
  if (!isPubliclyLive(stream)) {
    return false;
  }
  const scope = place.scope ?? "city";
  if (scope === "country") {
    return sameCountry(stream.location.country, place.country);
  }
  if (sameCity(stream.location.city, place.city) && sameCountry(stream.location.country, place.country)) {
    return true;
  }
  if (scope === "place") {
    return false;
  }
  if (scope === "city" && streamInMetroHub(place, stream.location.city, stream.location.country)) {
    return true;
  }
  if (place.boundingBox && stream.location.latitude != null && stream.location.longitude != null) {
    if (!sameCountry(stream.location.country, place.country)) {
      return false;
    }
    return pointInBoundingBox(stream.location.latitude, stream.location.longitude, place.boundingBox);
  }
  return false;
}

export function listLiveStreamsForLocation(
  streams: LiveStreamSummary[],
  place: PlaceQuery,
): LiveStreamSummary[] {
  const matched = streams.filter((item) => liveStreamMatchesPlace(item, place));
  const unique = new Map(matched.map((item) => [item.id, item]));
  return [...unique.values()].sort(compareLiveStreamsByViewers);
}

export function selectLiveStreamForLocation(
  streams: LiveStreamSummary[],
  place: PlaceQuery,
): LiveStreamSummary | null {
  return listLiveStreamsForLocation(streams, place)[0] ?? null;
}

export function selectRecentReportForLocation(
  reports: FirsthandReport[],
  place: PlaceQuery,
): FirsthandReport | null {
  const matches = reports.filter((report) => {
    const city = report.city ?? report.location;
    const country = report.country ?? "";
    if (place.scope === "country") {
      return !country || sameCountry(country, place.country);
    }
    return sameCity(city, place.city) && (!country || sameCountry(country, place.country));
  });
  return [...matches].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0] ?? null;
}
