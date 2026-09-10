import type { Location } from "@/lib/database.types";
import { buildLocationSlug, type StructuredLocation } from "@/lib/location";

export function findMatchingLocation(existing: Location[], input: StructuredLocation) {
  return existing.find((row) => {
    if (row.city !== input.city || row.country !== input.country) {
      return false;
    }
    if ((row.place ?? "") !== (input.place ?? "")) {
      return false;
    }
    if (row.latitude === null || row.longitude === null) {
      return false;
    }
    return (
      Math.abs(row.latitude - input.latitude) < 0.0008 &&
      Math.abs(row.longitude - input.longitude) < 0.0008
    );
  });
}

export function nextLocationSlug(base: string, taken: Set<string>) {
  const normalized = base || "place";
  if (!taken.has(normalized)) {
    return normalized;
  }

  for (let attempt = 2; attempt < 20; attempt += 1) {
    const slug = `${normalized}-${attempt}`.slice(0, 120);
    if (!taken.has(slug)) {
      return slug;
    }
  }

  return `${normalized}-${Date.now()}`.slice(0, 120);
}

export function slugForLocation(location: StructuredLocation) {
  return buildLocationSlug(location) || "place";
}
