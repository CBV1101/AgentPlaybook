import { aggregateDiscoveryPlaces, type DiscoveryPlace } from "@/lib/data/discovery";
import { cityHref, citySlug, countryHref, countrySlug, foldSearchText, isCountryHubLocation } from "@/lib/geo";
import type { CoverageRequest, EventSummary, FirsthandReport, LocationSummary } from "@/lib/types";

export type CountryBrowse = {
  name: string;
  slug: string;
  href: string;
  reportCount: number;
  openRequestCount: number;
  cityCount: number;
  latitude: number | null;
  longitude: number | null;
};

export type CityBrowse = {
  name: string;
  country: string;
  countrySlug: string;
  slug: string;
  href: string;
  reportCount: number;
  openRequestCount: number;
  liveCount: number;
  placeCount: number;
  latitude: number | null;
  longitude: number | null;
};

export type GeographySearchHit = {
  id: string;
  kind: "country" | "city" | "place";
  href: string;
  title: string;
  subtitle: string;
  reportCount: number;
  openRequestCount: number;
};

export type CountryPageData = {
  country: CountryBrowse;
  cities: CityBrowse[];
  latestReports: FirsthandReport[];
  mostRequested: CoverageRequest[];
  activeEvents: EventSummary[];
  liveStreams: import("@/lib/live").LiveStreamSummary[];
};

export type CityPageData = {
  city: CityBrowse;
  places: DiscoveryPlace[];
  mapPlaces: DiscoveryPlace[];
  latestReports: FirsthandReport[];
  mostRequested: CoverageRequest[];
  openRequests: CoverageRequest[];
  activeEvents: EventSummary[];
  liveStreams: import("@/lib/live").LiveStreamSummary[];
};

export function buildGeographyIndex(input: {
  locations: LocationSummary[];
  reports: Array<{ locationId?: string }>;
  openRequestLocationIds: string[];
  liveLocationIds?: string[];
}) {
  const places = aggregateDiscoveryPlaces({
    locations: input.locations,
    reports: input.reports,
    openRequests: [],
    openRequestLocationIds: input.openRequestLocationIds,
    liveLocationIds: input.liveLocationIds,
  });
  const activityIds = new Set(places.map((place) => place.id));
  const activeLocations = input.locations.filter((location) => activityIds.has(location.id));

  const cities = aggregateCities(activeLocations, places);
  const countries = aggregateCountries(cities, places);

  return { places, cities, countries };
}

export function searchGeographyHits(
  index: ReturnType<typeof buildGeographyIndex>,
  query: string,
): GeographySearchHit[] {
  const needle = foldSearchText(query.trim());
  const hits: GeographySearchHit[] = [];

  if (!needle) {
    return [
      ...index.countries.map(countryHit),
      ...index.cities.map(cityHit),
      ...index.places.filter((place) => place.place).map(placeHit),
    ];
  }

  for (const country of index.countries) {
    if (foldSearchText(country.name).includes(needle)) {
      hits.push(countryHit(country));
    }
  }
  for (const city of index.cities) {
    if (
      foldSearchText(city.name).includes(needle) ||
      foldSearchText(city.country).includes(needle) ||
      foldSearchText(`${city.name} ${city.country}`).includes(needle)
    ) {
      hits.push(cityHit(city));
    }
  }
  for (const place of index.places) {
    if (!place.place) {
      continue;
    }
    const haystack = foldSearchText([place.place, place.city, place.country, place.label].join(" "));
    if (haystack.includes(needle)) {
      hits.push(placeHit(place));
    }
  }

  return hits;
}

export function locationsInCountry(locations: LocationSummary[], slug: string) {
  return locations.filter(
    (location) => countrySlug(location.country) === slug && !isCountryHubLocation(location),
  );
}

export function locationsInCity(locations: LocationSummary[], slug: string) {
  return locations.filter(
    (location) => citySlug(location.city, location.country) === slug && !isCountryHubLocation(location),
  );
}

function aggregateCities(activeLocations: LocationSummary[], places: DiscoveryPlace[]): CityBrowse[] {
  const grouped = new Map<string, LocationSummary[]>();
  for (const location of activeLocations) {
    const slug = citySlug(location.city, location.country);
    if (isCountryHubLocation(location)) {
      continue;
    }
    const list = grouped.get(slug) ?? [];
    list.push(location);
    grouped.set(slug, list);
  }

  const counts = countByLocation(places);

  return [...grouped.entries()]
    .map(([slug, rows]) => {
      const sample = rows[0]!;
      const ids = new Set(rows.map((row) => row.id));
      const reportCount = sumCounts(ids, counts.reports);
      const openRequestCount = sumCounts(ids, counts.requests);
      const liveCount = sumCounts(ids, counts.live);
      const placeCount = rows.filter((row) => row.place && (counts.reports.get(row.id) || counts.requests.get(row.id))).length;
      const center = centroid(rows);
      return {
        name: sample.city,
        country: sample.country,
        countrySlug: countrySlug(sample.country),
        slug,
        href: cityHref(sample.city, sample.country),
        reportCount,
        openRequestCount,
        liveCount,
        placeCount,
        latitude: center.latitude,
        longitude: center.longitude,
      };
    })
    .sort(
      (a, b) =>
        b.liveCount - a.liveCount ||
        b.reportCount + b.openRequestCount - (a.reportCount + a.openRequestCount) ||
        a.name.localeCompare(b.name),
    );
}

function aggregateCountries(cities: CityBrowse[], places: DiscoveryPlace[]): CountryBrowse[] {
  const grouped = new Map<string, CityBrowse[]>();
  for (const city of cities) {
    const list = grouped.get(city.countrySlug) ?? [];
    list.push(city);
    grouped.set(city.countrySlug, list);
  }

  return [...grouped.entries()]
    .map(([slug, rows]) => {
      const sample = rows[0]!;
      const countryPlaces = places.filter((place) => countrySlug(place.country) === slug);
      const center = centroid(countryPlaces);
      return {
        name: sample.country,
        slug,
        href: countryHref(sample.country),
        reportCount: rows.reduce((sum, city) => sum + city.reportCount, 0),
        openRequestCount: rows.reduce((sum, city) => sum + city.openRequestCount, 0),
        cityCount: rows.length,
        latitude: center.latitude,
        longitude: center.longitude,
      };
    })
    .sort((a, b) => b.reportCount + b.openRequestCount - (a.reportCount + a.openRequestCount) || a.name.localeCompare(b.name));
}

function countByLocation(places: DiscoveryPlace[]) {
  const reports = new Map<string, number>();
  const requests = new Map<string, number>();
  const live = new Map<string, number>();
  for (const place of places) {
    reports.set(place.id, place.reportCount);
    requests.set(place.id, place.openRequestCount);
    live.set(place.id, place.liveCount);
  }
  return { reports, requests, live };
}

function sumCounts(ids: Set<string>, counts: Map<string, number>) {
  let total = 0;
  for (const id of ids) {
    total += counts.get(id) ?? 0;
  }
  return total;
}

function centroid(locations: Array<{ latitude: number | null; longitude: number | null }>) {
  const points = locations.filter(
    (item): item is { latitude: number; longitude: number } =>
      item.latitude !== null && item.longitude !== null,
  );
  if (points.length === 0) {
    return { latitude: null, longitude: null };
  }
  return {
    latitude: points.reduce((sum, item) => sum + item.latitude, 0) / points.length,
    longitude: points.reduce((sum, item) => sum + item.longitude, 0) / points.length,
  };
}

function countryHit(country: CountryBrowse): GeographySearchHit {
  return {
    id: `country:${country.slug}`,
    kind: "country",
    href: country.href,
    title: country.name,
    subtitle: "Country",
    reportCount: country.reportCount,
    openRequestCount: country.openRequestCount,
  };
}

function cityHit(city: CityBrowse): GeographySearchHit {
  return {
    id: `city:${city.slug}`,
    kind: "city",
    href: city.href,
    title: city.name,
    subtitle: city.country,
    reportCount: city.reportCount,
    openRequestCount: city.openRequestCount,
  };
}

function placeHit(place: DiscoveryPlace): GeographySearchHit {
  return {
    id: place.id,
    kind: "place",
    href: `/place/${place.slug}`,
    title: place.place || place.city,
    subtitle: `${place.city}, ${place.country}`,
    reportCount: place.reportCount,
    openRequestCount: place.openRequestCount,
  };
}
