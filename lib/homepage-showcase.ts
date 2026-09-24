/**
 * DEVELOPMENT-ONLY homepage presentation fallback.
 *
 * This module exists so the homepage can be designed when a real Supabase
 * project has no activity yet. It is NOT a data source.
 *
 * Hard rules:
 * - Never imported by repositories, mutations, auth, or RLS paths.
 * - Never writes to Supabase, mock JSON, or any database.
 * - Records are presentation objects only. IDs use the `dev-showcase-` prefix
 *   so they cannot be mistaken for persisted rows.
 * - `applyHomepageShowcase` returns the real homepage payload unchanged unless
 *   `process.env.NODE_ENV === "development"` AND the real payload has no
 *   meaningful activity.
 * - Production builds must never substitute this content. Next inlines
 *   NODE_ENV, so the showcase branch is dead in production.
 */

import type { DiscoveryPlace } from "@/lib/data/discovery";
import type { CityBrowse } from "@/lib/data/geography";
import { cityHref, citySlug, countrySlug } from "@/lib/geo";
import { MOCK_LIVE_SAMPLE_VIDEO, type LiveStreamSummary } from "@/lib/live";
import type { CoverageRequest, EventSummary, FirsthandReport, LocationSummary } from "@/lib/types";

export const HOMEPAGE_SHOWCASE_ID_PREFIX = "dev-showcase-";

export type HomepagePresentation = {
  liveStreams: LiveStreamSummary[];
  requests: CoverageRequest[];
  reports: FirsthandReport[];
  places: DiscoveryPlace[];
  events: EventSummary[];
  cities: CityBrowse[];
  usingShowcase: boolean;
};

export function isHomepageShowcaseId(id: string) {
  return id.startsWith(HOMEPAGE_SHOWCASE_ID_PREFIX);
}

export function isHomepageShowcaseAllowed() {
  return process.env.NODE_ENV === "development";
}

export function homepageHasMeaningfulActivity(input: {
  liveStreams: LiveStreamSummary[];
  requests: CoverageRequest[];
  reports: FirsthandReport[];
  cities: CityBrowse[];
}) {
  return (
    input.liveStreams.some((item) => item.status === "live") ||
    input.requests.length > 0 ||
    input.reports.length > 0 ||
    input.cities.some((city) => city.liveCount + city.reportCount + city.openRequestCount > 0)
  );
}

export function applyHomepageShowcase(input: {
  liveStreams: LiveStreamSummary[];
  requests: CoverageRequest[];
  reports: FirsthandReport[];
  places: DiscoveryPlace[];
  events: EventSummary[];
  cities: CityBrowse[];
}): HomepagePresentation {
  if (!isHomepageShowcaseAllowed()) {
    return { ...input, usingShowcase: false };
  }
  if (homepageHasMeaningfulActivity(input)) {
    return { ...input, usingShowcase: false };
  }
  return {
    ...buildHomepageShowcase(),
    usingShowcase: true,
  };
}

export function getHomepageShowcaseContent(): Omit<HomepagePresentation, "usingShowcase"> {
  return buildHomepageShowcase();
}

function buildHomepageShowcase(): Omit<HomepagePresentation, "usingShowcase"> {
  const now = Date.now();
  const berlin = place("Berlin", "Germany", 52.52, 13.405);
  const stockholm = place("Stockholm", "Sweden", 59.3293, 18.0686);
  const nairobi = place("Nairobi", "Kenya", -1.2921, 36.8219);
  const newYork = place("New York", "United States", 40.7128, -74.006);
  const saoPaulo = place("São Paulo", "Brazil", -23.5505, -46.6333);
  const seoul = place("Seoul", "South Korea", 37.5665, 126.978);
  const paris = place("Paris", "France", 48.8566, 2.3522);
  const madrid = place("Madrid", "Spain", 40.4168, -3.7038);
  const istanbul = place("Istanbul", "Türkiye", 41.0082, 28.9784);
  const mexicoCity = place("Mexico City", "Mexico", 19.4326, -99.1332);

  const requests: CoverageRequest[] = [
    request("berlin", berlin, "What is happening outside Hauptbahnhof?", 347, now, 40),
    request("paris", paris, "What is happening outside Gare du Nord?", 184, now, 90),
    request("nairobi", nairobi, "How crowded is Uhuru Park this morning?", 96, now, 120),
    request("newyork", newYork, "What does the Union Square subway entrance look like?", 211, now, 55),
    request("seoul", seoul, "Is Gwanghwamun Square busy after work?", 73, now, 200),
    request("stockholm", stockholm, "How crowded is Sergels torg this afternoon?", 58, now, 25),
    request("saopaulo", saoPaulo, "How busy is Praça da Sé right now?", 142, now, 70),
    request("madrid", madrid, "What does Puerta del Sol look like this evening?", 64, now, 15),
  ];

  const liveStreams: LiveStreamSummary[] = [
    live(berlin, "Demonstration outside Hauptbahnhof", "lena-k", "Lena Krüger", 18, requests[0]!.id),
    live(nairobi, "Morning paths in Uhuru Park", "daniel-o", "Daniel Otieno", 12, requests[2]!.id),
    live(newYork, "Lunch crowd at Union Square", "priya-n", "Priya Nair", 27, requests[3]!.id),
    live(stockholm, "Afternoon on Sergels torg", "maja-s", "Maja Söderberg", 41, requests[5]!.id),
    live(paris, "Outside Gare du Nord", "camille-l", "Camille Laurent", 7, requests[1]!.id),
    live(seoul, "Evening at Gwanghwamun Square", "jiwon-p", "Ji-won Park", 22, requests[4]!.id),
    live(saoPaulo, "Midday at Praça da Sé", "rafa-m", "Rafael Mendes", 9, requests[6]!.id),
    live(madrid, "Evening at Puerta del Sol", "ines-r", "Inés Romero", 33, requests[7]!.id),
    live(istanbul, "Ferry landing in Karaköy", "elif-a", "Elif Arslan", 14, null),
    live(mexicoCity, "Zócalo in late afternoon", "diego-r", "Diego Ramírez", 5, null),
  ];

  const reports: FirsthandReport[] = [
    report("seoul", seoul, "Evening light on Gwanghwamun", "Ji-won Park", "jiwon-p", true, now, 80),
    report("paris", paris, "Sidewalk after rain near Gare du Nord", "Camille Laurent", "camille-l", false, now, 110),
    report("madrid", madrid, "Street performers at Puerta del Sol", "Inés Romero", "ines-r", true, now, 150),
    report("berlin", berlin, "Tram stop on a weekday evening", "Jonas Weber", "jonas-w", false, now, 200),
    report("nairobi", nairobi, "Independent walk toward the park gate", "Amina Hassan", "amina-h", false, now, 240),
    report("newyork", newYork, "Market stall setup on the west side", "Chris Valle", "jordanm", true, now, 300),
  ];

  const cities = [berlin, stockholm, nairobi, newYork, saoPaulo, seoul, paris, madrid, istanbul, mexicoCity].map((location, index) =>
    cityRow(location, {
      liveCount: liveStreams.filter((item) => item.location.city === location.city).length,
      reportCount: 4 + index,
      openRequestCount: requests.filter((item) => item.city === location.city).length,
    }),
  );

  const places: DiscoveryPlace[] = [berlin, stockholm, nairobi, newYork, saoPaulo, seoul, paris, madrid, istanbul, mexicoCity].map(
    (location) => ({
      ...location,
      liveCount: liveStreams.filter((item) => item.location.city === location.city).length,
      reportCount: cities.find((city) => city.name === location.city)?.reportCount ?? 0,
      openRequestCount: requests.filter((item) => item.city === location.city).length,
    }),
  );

  return {
    liveStreams,
    requests,
    reports,
    places,
    events: [],
    cities,
  };
}

function place(city: string, country: string, latitude: number, longitude: number): LocationSummary {
  const slug = citySlug(city, country);
  return {
    id: `${HOMEPAGE_SHOWCASE_ID_PREFIX}loc-${slug}`,
    slug,
    place: null,
    city,
    country,
    latitude,
    longitude,
    label: `${city}, ${country}`,
    href: cityHref(city, country),
  };
}

function request(
  key: string,
  location: LocationSummary,
  title: string,
  supporterCount: number,
  now: number,
  minutesAgo: number,
): CoverageRequest {
  const createdAt = new Date(now - minutesAgo * 60_000).toISOString();
  return {
    id: `${HOMEPAGE_SHOWCASE_ID_PREFIX}req-${key}`,
    title,
    location: location.label,
    locationSlug: location.slug,
    locationHref: location.href,
    city: location.city,
    country: location.country,
    latitude: location.latitude,
    longitude: location.longitude,
    supporterCount,
    responseCount: 0,
    createdAt,
    requestedLabel: createdAt,
    status: "open",
  };
}

function live(
  location: LocationSummary,
  title: string,
  username: string,
  reporterName: string,
  minutesAgo: number,
  requestId: string | null,
): LiveStreamSummary {
  const startedAt = new Date(Date.now() - minutesAgo * 60_000).toISOString();
  const seed = location.city.toLowerCase().replace(/\s+/g, "-");
  return {
    id: `${HOMEPAGE_SHOWCASE_ID_PREFIX}live-${seed}`,
    title,
    status: "live",
    startedAt,
    endedAt: null,
    location,
    reporterId: `${HOMEPAGE_SHOWCASE_ID_PREFIX}user-${username}`,
    reporterName,
    reporterUsername: username,
    eventId: null,
    eventTitle: null,
    requestId,
    requestTitle: null,
    reportId: null,
    playbackKind: "file",
    playbackUrl: MOCK_LIVE_SAMPLE_VIDEO,
    thumbnailUrl: `https://picsum.photos/seed/${seed}-live/1200/750`,
    sensitiveContent: false,
    recordingAssetId: null,
  };
}

function report(
  key: string,
  location: LocationSummary,
  title: string,
  reporterName: string,
  username: string,
  video: boolean,
  now: number,
  minutesAgo: number,
): FirsthandReport {
  const capturedAt = new Date(now - minutesAgo * 60_000).toISOString();
  return {
    id: `${HOMEPAGE_SHOWCASE_ID_PREFIX}report-${key}`,
    title,
    location: location.label,
    locationId: location.id,
    locationSlug: location.slug,
    locationHref: location.href,
    city: location.city,
    country: location.country,
    excerpt: "On-the-ground look from public space.",
    mediaKind: video ? "video" : "photo",
    capturedAt,
    publishedAt: capturedAt,
    reporterName,
    reporterUsername: username,
    thumbnailUrl: `https://picsum.photos/seed/${key}-report/1200/800`,
    respondsToRequest: false,
  };
}

function cityRow(
  location: LocationSummary,
  counts: { liveCount: number; reportCount: number; openRequestCount: number },
): CityBrowse {
  return {
    name: location.city,
    country: location.country,
    countrySlug: countrySlug(location.country),
    slug: location.slug,
    href: location.href,
    reportCount: counts.reportCount,
    openRequestCount: counts.openRequestCount,
    liveCount: counts.liveCount,
    placeCount: 1,
    latitude: location.latitude,
    longitude: location.longitude,
  };
}
