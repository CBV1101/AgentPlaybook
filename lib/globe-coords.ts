/** Geographic helpers for the Three.js globe. Named latitude/longitude until the mesh boundary. */

import type { BoundingBox, GeoScope } from "@/lib/location";

export function latLngToVector(
  latitude: number,
  longitude: number,
  radius: number,
): { x: number; y: number; z: number } {
  const phi = ((90 - latitude) * Math.PI) / 180;
  const theta = ((longitude + 180) * Math.PI) / 180;
  return {
    x: -radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
  };
}

export const SEARCH_PLACE_MARKER_ID = "selected-place";

export type CanonicalPlace = {
  id: string;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  scope?: GeoScope;
  boundingBox?: BoundingBox | null;
};

export function canonicalPlaceFromSearch(input: {
  city: string;
  country: string;
  name?: string;
  latitude: number;
  longitude: number;
  scope?: GeoScope;
  boundingBox?: BoundingBox | null;
}): CanonicalPlace {
  return {
    id: SEARCH_PLACE_MARKER_ID,
    name: input.name ?? [input.city, input.country].filter(Boolean).join(", "),
    city: input.city,
    country: input.country,
    latitude: input.latitude,
    longitude: input.longitude,
    scope: input.scope,
    boundingBox: input.boundingBox ?? null,
  };
}

export function coordsAgree(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
  epsilon = 0.05,
) {
  return Math.abs(a.latitude - b.latitude) <= epsilon && Math.abs(a.longitude - b.longitude) <= epsilon;
}
