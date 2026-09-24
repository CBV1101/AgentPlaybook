import { slugify } from "@/lib/location";

export function countrySlug(country: string) {
  return slugify(country) || "country";
}

export function citySlug(city: string, country: string) {
  return slugify(`${city} ${country}`) || slugify(city) || "city";
}

export function foldSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

export function locationArchiveHref(location: {
  place?: string | null;
  slug: string;
  city: string;
  country: string;
}) {
  if (isCountryHubLocation(location)) {
    return countryHref(location.country);
  }
  if (location.place) {
    return `/place/${location.slug}`;
  }
  return `/city/${citySlug(location.city, location.country)}`;
}

export function countryHref(country: string) {
  return `/country/${countrySlug(country)}`;
}

export function cityHref(city: string, country: string) {
  return `/city/${citySlug(city, country)}`;
}

export function countryHubSlug(country: string) {
  return `country-${countrySlug(country)}`;
}

export function isCountryHubLocation(location: { slug: string }) {
  return location.slug.startsWith("country-");
}
