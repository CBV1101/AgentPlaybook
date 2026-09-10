import type { GeocodeSuggestion } from "@/lib/location";
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

function toSuggestion(result: NominatimResult): GeocodeSuggestion | null {
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);
  const address = result.address ?? {};
  const country = address.country?.trim();
  const city =
    address.city?.trim() ||
    address.town?.trim() ||
    address.village?.trim() ||
    address.municipality?.trim() ||
    address.city_district?.trim() ||
    address.county?.trim() ||
    address.state?.trim();

  if (!country || !city || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
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

  const place = namedPlace && !isSamePlace(namedPlace, city) ? namedPlace : namedPlace || null;

  return {
    country: country.slice(0, 80),
    city: city.slice(0, 120),
    place: place ? place.slice(0, 160) : null,
    latitude,
    longitude,
    label: [place, city, country].filter(Boolean).join(", "),
  };
}

function isSamePlace(left: string, right: string) {
  return slugify(left) === slugify(right);
}
