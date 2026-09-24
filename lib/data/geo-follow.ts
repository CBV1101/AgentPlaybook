import type { Location } from "@/lib/database.types";
import { countryHubSlug, isCountryHubLocation } from "@/lib/geo";
import type { GeoFollowTarget } from "@/lib/follows";
import { slugForLocation } from "@/lib/data/locations";

export function findGeoFollowLocation(locations: Location[], target: GeoFollowTarget): Location | undefined {
  if (target.kind === "place") {
    return locations.find((row) => row.id === target.locationId);
  }
  if (target.kind === "city") {
    if (!target.city) {
      return undefined;
    }
    return locations.find(
      (row) =>
        row.city === target.city &&
        row.country === target.country &&
        !row.place &&
        !isCountryHubLocation(row),
    );
  }
  return locations.find((row) => row.slug === countryHubSlug(target.country));
}

export function geoFollowSlugBase(target: GeoFollowTarget) {
  if (target.kind === "country") {
    return countryHubSlug(target.country);
  }
  if (!target.city) {
    throw new Error("city");
  }
  return slugForLocation({
    country: target.country,
    city: target.city,
    place: null,
    latitude: target.latitude ?? 0,
    longitude: target.longitude ?? 0,
  });
}

export function geoFollowInsertFields(target: GeoFollowTarget, slug: string) {
  if (target.kind === "place") {
    throw new Error("place");
  }
  if (target.kind === "city") {
    if (!target.city) {
      throw new Error("city");
    }
    return {
      country: target.country,
      city: target.city,
      place: null as string | null,
      latitude: target.latitude ?? null,
      longitude: target.longitude ?? null,
      slug,
    };
  }
  return {
    country: target.country,
    city: target.country,
    place: null as string | null,
    latitude: target.latitude ?? null,
    longitude: target.longitude ?? null,
    slug,
  };
}
