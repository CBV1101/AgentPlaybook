import type { BoundingBox, GeoScope, GeocodeSuggestion } from "@/lib/location";
import { slugify } from "@/lib/location";

type NominatimAddress = {
  country?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  city_district?: string;
  county?: string;
  state?: string;
  attraction?: string;
  park?: string;
  leisure?: string;
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  pedestrian?: string;
};

type NominatimResult = {
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  addresstype?: string;
  type?: string;
  class?: string;
  boundingbox?: [string, string, string, string];
  address?: NominatimAddress;
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export async function searchPlaces(query: string): Promise<GeocodeSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "6");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "en",
      "User-Agent": "FirsthandMVP/0.1 (coverage-request geocoding)",
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error("Location search is temporarily unavailable.");
  }

  const results = (await response.json()) as NominatimResult[];
  const suggestions = results
    .map(toSuggestion)
    .filter((item): item is GeocodeSuggestion => item !== null);

  const seen = new Set<string>();
  return suggestions.filter((item) => {
    const key = `${item.place}|${item.city}|${item.country}|${item.latitude.toFixed(4)}|${item.longitude.toFixed(4)}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function parseBoundingBox(result: NominatimResult): BoundingBox | null {
  const box = result.boundingbox;
  if (!box || box.length < 4) {
    return null;
  }
  const south = Number(box[0]);
  const north = Number(box[1]);
  const west = Number(box[2]);
  const east = Number(box[3]);
  if (![south, north, west, east].every(Number.isFinite)) {
    return null;
  }
  return { south, north, west, east };
}

function inferGeoScope(result: NominatimResult, namedPlace: string | null, adminCity: string | undefined): GeoScope {
  const type = (result.addresstype || result.type || "").toLowerCase();
  if (type === "country") {
    return "country";
  }
  if (type === "state" || type === "state_district" || type === "region") {
    return "region";
  }
  if (
    type === "suburb" ||
    type === "neighbourhood" ||
    type === "neighborhood" ||
    type === "quarter" ||
    type === "city_district" ||
    type === "borough" ||
    type === "peak" ||
    type === "attraction" ||
    type === "building"
  ) {
    return "place";
  }
  if (namedPlace && adminCity && !isSamePlace(namedPlace, adminCity)) {
    return "place";
  }
  return "city";
}

function toSuggestion(result: NominatimResult): GeocodeSuggestion | null {
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);
  const address = result.address ?? {};
  const country = address.country?.trim();
  const adminCity =
    address.city?.trim() ||
    address.town?.trim() ||
    address.village?.trim() ||
    address.municipality?.trim() ||
    address.city_district?.trim() ||
    address.county?.trim() ||
    address.state?.trim();

  if (!country || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const namedPlace =
    result.name?.trim() ||
    address.park?.trim() ||
    address.attraction?.trim() ||
    address.leisure?.trim() ||
    address.pedestrian?.trim() ||
    address.road?.trim() ||
    address.suburb?.trim() ||
    address.neighbourhood?.trim() ||
    null;

  const scope = inferGeoScope(result, namedPlace, adminCity);
  const boundingBox = parseBoundingBox(result);

  if (scope === "country") {
    return {
      country: country.slice(0, 80),
      city: "",
      place: null,
      latitude,
      longitude,
      label: country,
      scope,
      boundingBox,
    };
  }

  const city =
    scope === "place" && namedPlace
      ? namedPlace
      : scope === "region"
        ? address.state?.trim() || adminCity
        : adminCity;

  if (!city) {
    return null;
  }

  const place =
    namedPlace && !isSamePlace(namedPlace, city) ? namedPlace : namedPlace && isSamePlace(namedPlace, city) ? null : namedPlace;

  return {
    country: country.slice(0, 80),
    city: city.slice(0, 120),
    place: place ? place.slice(0, 160) : null,
    latitude,
    longitude,
    label: [place, city, country].filter(Boolean).join(", "),
    scope,
    boundingBox,
  };
}

function isSamePlace(left: string, right: string) {
  return slugify(left) === slugify(right);
}
