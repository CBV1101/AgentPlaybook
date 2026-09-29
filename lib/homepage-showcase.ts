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
 *   `canUseShowcaseData()` is true AND the real payload has fewer than
 *   MIN_DEV_LIVE_GRID_STREAMS live streams.
 * - Production builds must never substitute this content. Next inlines
 *   NODE_ENV, so the showcase branch is dead in production.
 */

import type { DiscoveryPlace } from "@/lib/data/discovery";
import { canUseShowcaseData, type DataSourceEnv } from "@/lib/data/mode";
import type { CityBrowse } from "@/lib/data/geography";
import { assembleReporterProfilePage, type ReporterProfilePage } from "@/lib/data/reporter";
import type { Profile } from "@/lib/database.types";
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

export function isHomepageShowcaseAllowed(env: DataSourceEnv = process.env) {
  return canUseShowcaseData(env);
}

export const MIN_DEV_LIVE_GRID_STREAMS = 6;

export function countLiveNow(streams: LiveStreamSummary[]) {
  return streams.filter((item) => item.status === "live").length;
}

export function homepageHasMeaningfulActivity(input: {
  liveStreams: LiveStreamSummary[];
  requests: CoverageRequest[];
  reports: FirsthandReport[];
  cities: CityBrowse[];
}) {
  return (
    countLiveNow(input.liveStreams) >= MIN_DEV_LIVE_GRID_STREAMS ||
    input.requests.length > 0 ||
    input.reports.length > 0 ||
    input.cities.some((city) => city.liveCount + city.reportCount + city.openRequestCount > 0)
  );
}

export function applyHomepageShowcase(
  input: {
    liveStreams: LiveStreamSummary[];
    requests: CoverageRequest[];
    reports: FirsthandReport[];
    places: DiscoveryPlace[];
    events: EventSummary[];
    cities: CityBrowse[];
  },
  env: DataSourceEnv = process.env,
): HomepagePresentation {
  if (!isHomepageShowcaseAllowed(env)) {
    return { ...input, usingShowcase: false };
  }
  const showcase = buildHomepageShowcase();
  const liveCount = countLiveNow(input.liveStreams);
  if (liveCount >= MIN_DEV_LIVE_GRID_STREAMS) {
    return { ...input, usingShowcase: false };
  }
  return {
    liveStreams: showcase.liveStreams,
    requests: input.requests.length > 0 ? input.requests : showcase.requests,
    reports: input.reports.length > 0 ? input.reports : showcase.reports,
    places: input.places.length > 0 ? input.places : showcase.places,
    events: input.events.length > 0 ? input.events : showcase.events,
    cities: input.cities.length > 0 ? input.cities : showcase.cities,
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

  const manhattan = place("Manhattan", "United States", 40.7831, -73.9712);
  const brooklyn = place("Brooklyn", "United States", 40.6782, -73.9442);
  const queens = place("Queens", "United States", 40.7282, -73.7949);
  const bronx = place("Bronx", "United States", 40.8448, -73.8648);
  const statenIsland = place("Staten Island", "United States", 40.5795, -74.1502);

  const liveStreams: LiveStreamSummary[] = [
    live(berlin, "Demonstration outside Hauptbahnhof", "lena-k", "Lena Krüger", 18, requests[0]!.id, 88),
    live(nairobi, "Morning paths in Uhuru Park", "daniel-o", "Daniel Otieno", 12, requests[2]!.id, 41),
    live(newYork, "Times Square crossing", "maya-c", "Maya Chen", 8, requests[3]!.id, 1842, "nyc-times-square"),
    live(manhattan, "Sidewalk along Central Park South", "noah-b", "Noah Brennan", 11, null, 1200, "nyc-manhattan"),
    live(newYork, "Lunch crowd at Union Square", "priya-n", "Priya Nair", 27, requests[3]!.id, 921, "nyc-union-square"),
    live(brooklyn, "Atlantic Terminal sidewalk", "luis-r", "Luis Romero", 19, null, 403, "nyc-brooklyn"),
    live(bronx, "Grand Concourse afternoon", "sofia-m", "Sofia Morales", 24, null, 210, "nyc-bronx"),
    live(queens, "Flushing Meadows paths", "hana-k", "Hana Kim", 36, null, 87, "nyc-queens"),
    live(statenIsland, "St. George ferry terminal", "owen-t", "Owen Trent", 44, null, 54, "nyc-staten"),
    live(stockholm, "Afternoon on Sergels torg", "maja-s", "Maja Söderberg", 41, requests[5]!.id, 63),
    live(paris, "Outside Gare du Nord", "camille-l", "Camille Laurent", 7, requests[1]!.id, 640, "paris-gare"),
    live(paris, "Canal Saint-Martin towpath", "luc-m", "Luc Moreau", 16, null, 310, "paris-canal"),
    live(paris, "Steps at the hill overlook", "elise-d", "Elise Durand", 29, null, 155, "paris-hill"),
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
  viewerCount: number | null = null,
  idKey?: string,
): LiveStreamSummary {
  const startedAt = new Date(Date.now() - minutesAgo * 60_000).toISOString();
  const seed = idKey ?? location.city.toLowerCase().replace(/\s+/g, "-");
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
    viewerCount,
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
    mediaUrl: video ? MOCK_LIVE_SAMPLE_VIDEO : null,
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

export function applyHomepageLiveReporterShowcase(
  username: string,
  real: ReporterProfilePage | null,
  env: DataSourceEnv = process.env,
): ReporterProfilePage | null {
  if (!isHomepageShowcaseAllowed(env)) {
    return real;
  }
  const content = getHomepageShowcaseContent();
  const streams = content.liveStreams.filter((item) => item.reporterUsername === username);
  const reports = content.reports.filter((item) => item.reporterUsername === username);
  if (streams.length === 0 && reports.length === 0) {
    return real;
  }
  if (real?.liveNow.length) {
    return real;
  }
  if (!real && process.env.NODE_ENV === "development") {
    console.warn(`[firsthand] Development showcase reporter profile for @${username}. Not stored in Supabase.`);
  }
  const seed = streams[0];
  const profile: Profile = real?.profile ?? {
    id: seed?.reporterId ?? `${HOMEPAGE_SHOWCASE_ID_PREFIX}user-${username}`,
    username,
    display_name: seed?.reporterName ?? username,
    bio: "Fictional development showcase reporter. Not a real person on Firsthand.",
    avatar_url: null,
    home_city: seed?.location.city ?? null,
    home_country: seed?.location.country ?? null,
    created_at: new Date().toISOString(),
    role: "member",
    can_live_stream: true,
    topics: [],
  };
  const liveNow = streams.filter((item) => item.status === "live");
  if (real) {
    return {
      ...real,
      liveNow,
      latestReports: real.latestReports.length > 0 ? real.latestReports : reports,
    };
  }
  return assembleReporterProfilePage(profile, reports, new Map(), {
    liveNow,
    pastLive: [],
    investigations: [],
  });
}
