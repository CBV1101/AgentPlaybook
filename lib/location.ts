export type StructuredLocation = {
  country: string;
  city: string;
  place: string | null;
  latitude: number;
  longitude: number;
};

export type GeocodeSuggestion = StructuredLocation & {
  label: string;
};

export function slugify(value: string) {
  return value
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function buildLocationSlug(location: Pick<StructuredLocation, "place" | "city" | "country">) {
  const place = location.place?.trim() || null;
  const city = location.city.trim();
  const country = location.country.trim();

  if (place) {
    const parts = place.toLowerCase().includes(city.toLowerCase()) ? [place] : [place, city];
    return slugify(parts.join(" ")) || slugify(city);
  }

  return slugify(`${city} ${country}`) || slugify(city);
}

export function formatLocationLabel(location: {
  place?: string | null;
  city: string;
  country: string;
}) {
  return [location.place, location.city, location.country].filter(Boolean).join(", ");
}

export function parseCoordinate(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
