/**
 * DEVELOPMENT-ONLY investigation / reporter-profile presentation.
 * Never imported by mutations, auth, or RLS. Never writes to Supabase.
 */

import { assembleReporterProfilePage, type ReporterProfilePage } from "@/lib/data/reporter";
import type { Profile } from "@/lib/database.types";
import { cityHref } from "@/lib/geo";
import {
  assembleInvestigationPage,
  investigationHref,
  type InvestigationPageData,
  type InvestigationPart,
  type InvestigationSummary,
} from "@/lib/investigations";
import { MOCK_LIVE_SAMPLE_VIDEO, type LiveStreamSummary } from "@/lib/live";
import type { FirsthandReport, LocationSummary } from "@/lib/types";

export const INVESTIGATION_SHOWCASE_PREFIX = "dev-showcase-";
export const SHOWCASE_REPORTER_USERNAME = "amorgan";

export function isInvestigationShowcaseAllowed() {
  return process.env.NODE_ENV === "development";
}

function loc(city: string, country: string, lat: number, lng: number, place?: string): LocationSummary {
  const slug = `${city.toLowerCase().replace(/\s+/g, "-")}-${country.toLowerCase().replace(/\s+/g, "-")}`;
  return {
    id: `${INVESTIGATION_SHOWCASE_PREFIX}loc-${slug}-${place ?? "city"}`,
    slug,
    place: place ?? null,
    city,
    country,
    latitude: lat,
    longitude: lng,
    label: place ? `${place}, ${city}` : `${city}, ${country}`,
    href: cityHref(city, country),
  };
}

function hoursAgo(hours: number) {
  return new Date(Date.parse("2026-09-24T08:00:00.000Z") - hours * 60 * 60 * 1000).toISOString();
}

export function showcaseReporterProfile(): Profile {
  return {
    id: `${INVESTIGATION_SHOWCASE_PREFIX}reporter-amorgan`,
    username: SHOWCASE_REPORTER_USERNAME,
    display_name: "Alex Morgan",
    bio: "Independent firsthand reporting. This is fictional development-only content so the investigation layout can be evaluated.",
    avatar_url: "https://picsum.photos/seed/amorgan-avatar/256/256",
    home_city: "Minneapolis",
    home_country: "United States",
    created_at: hoursAgo(400),
    role: "member",
    can_live_stream: true,
    topics: ["local_news", "public_safety"],
  };
}

function minneapolis() {
  return loc("Minneapolis", "United States", 44.9778, -93.265);
}
function stPaul() {
  return loc("St. Paul", "United States", 44.9537, -93.09);
}
function mankato() {
  return loc("Mankato", "United States", 44.1636, -93.9994);
}

function report(
  id: string,
  title: string,
  location: LocationSummary,
  kind: "video" | "photo",
  hours: number,
  recordedLive = false,
): FirsthandReport {
  return {
    id: `${INVESTIGATION_SHOWCASE_PREFIX}${id}`,
    title,
    location: location.label,
    locationId: location.id,
    locationSlug: location.slug,
    locationHref: location.href,
    city: location.city,
    country: location.country,
    excerpt: "Fictional development showcase. Not a real report.",
    mediaKind: kind,
    capturedAt: hoursAgo(hours),
    publishedAt: hoursAgo(hours - 1),
    reporterName: "Alex Morgan",
    reporterUsername: SHOWCASE_REPORTER_USERNAME,
    reporterAvatarUrl: "https://picsum.photos/seed/amorgan-avatar/256/256",
    thumbnailUrl: `https://picsum.photos/seed/${id}/960/540`,
    mediaUrl: kind === "video" ? MOCK_LIVE_SAMPLE_VIDEO : null,
    licensingStatus: "view_only",
    requestId: null,
    requestTitle: null,
    respondsToRequest: false,
    recordedLive,
  };
}

function liveNow(): LiveStreamSummary {
  const location = minneapolis();
  return {
    id: `${INVESTIGATION_SHOWCASE_PREFIX}live-mpls`,
    title: "Live from Minneapolis",
    status: "live",
    startedAt: hoursAgo(1),
    endedAt: null,
    location,
    reporterId: `${INVESTIGATION_SHOWCASE_PREFIX}reporter-amorgan`,
    reporterName: "Alex Morgan",
    reporterUsername: SHOWCASE_REPORTER_USERNAME,
    eventId: null,
    eventTitle: null,
    requestId: null,
    requestTitle: null,
    reportId: null,
    playbackKind: "file",
    playbackUrl: MOCK_LIVE_SAMPLE_VIDEO,
    thumbnailUrl: "https://picsum.photos/seed/live-mpls/960/540",
    sensitiveContent: false,
    recordingAssetId: null,
    viewerCount: null,
  };
}

export function showcaseInvestigation(): InvestigationSummary {
  const location = loc("Minnesota", "United States", 46.7296, -94.6859);
  const slug = "fraud-investigation-minnesota";
  return {
    id: `${INVESTIGATION_SHOWCASE_PREFIX}inv-minnesota`,
    title: "Fraud Investigation — Minnesota",
    slug,
    description:
      "I'm traveling across Minnesota documenting what I see at public facilities and talking with residents. These are firsthand accounts from specific places and times. Firsthand does not verify my conclusions.",
    status: "published",
    coverUrl: "https://picsum.photos/seed/minnesota-cover/1280/720",
    partCount: 8,
    liveNow: true,
    updatedAt: hoursAgo(1),
    publishedAt: hoursAgo(90),
    location,
    reporterId: `${INVESTIGATION_SHOWCASE_PREFIX}reporter-amorgan`,
    reporterName: "Alex Morgan",
    reporterUsername: SHOWCASE_REPORTER_USERNAME,
    href: investigationHref(SHOWCASE_REPORTER_USERNAME, slug),
  };
}

export function showcaseInvestigationPage(): InvestigationPageData {
  const investigation = showcaseInvestigation();
  const stream = liveNow();
  const titles: Array<{ id: string; title: string; location: LocationSummary; kind: "video" | "photo" | "live"; hours: number; live?: boolean }> = [
    { id: "p1", title: "Why I'm investigating this", location: minneapolis(), kind: "video", hours: 80 },
    { id: "p2", title: "Visiting the first location", location: minneapolis(), kind: "video", hours: 70 },
    { id: "p3", title: "Interview with residents", location: stPaul(), kind: "video", hours: 55 },
    { id: "p4", title: "Following the money", location: stPaul(), kind: "photo", hours: 40 },
    { id: "p5", title: "Live from Minneapolis", location: minneapolis(), kind: "live", hours: 1, live: true },
    { id: "p6", title: "What we found", location: mankato(), kind: "video", hours: 20 },
    { id: "p7", title: "City records walk-through", location: mankato(), kind: "photo", hours: 12 },
    { id: "p8", title: "Neighborhood follow-up", location: minneapolis(), kind: "video", hours: 6 },
  ];

  const parts: InvestigationPart[] = titles.map((item, index) => {
    if (item.live) {
      return {
        id: `${INVESTIGATION_SHOWCASE_PREFIX}item-${item.id}`,
        position: index + 1,
        title: item.title,
        locationLabel: item.location.label,
        city: item.location.city,
        country: item.location.country,
        capturedAt: stream.startedAt,
        durationLabel: null,
        thumbnailUrl: stream.thumbnailUrl,
        mediaKind: "live",
        liveNow: true,
        recordedLive: false,
        href: `/live/${stream.id}`,
        report: null,
        liveStream: stream,
        public: true,
      };
    }
    const fh = report(item.id, item.title, item.location, item.kind === "photo" ? "photo" : "video", item.hours);
    return {
      id: `${INVESTIGATION_SHOWCASE_PREFIX}item-${item.id}`,
      position: index + 1,
      title: item.title,
      locationLabel: item.location.label,
      city: item.location.city,
      country: item.location.country,
      capturedAt: fh.capturedAt,
      durationLabel: item.kind === "video" ? "12:42" : null,
      thumbnailUrl: fh.thumbnailUrl ?? null,
      mediaKind: item.kind === "photo" ? "photo" : "video",
      liveNow: false,
      recordedLive: index === 1,
      href: `/reports/${fh.id}`,
      report: fh,
      liveStream: null,
      public: true,
    };
  });

  return assembleInvestigationPage(investigation, parts);
}

function extraReporter(input: {
  key: string;
  username: string;
  name: string;
  bio: string;
  city: string;
  country: string;
}): Profile {
  return {
    id: `${INVESTIGATION_SHOWCASE_PREFIX}reporter-${input.key}`,
    username: input.username,
    display_name: input.name,
    bio: input.bio,
    avatar_url: `https://picsum.photos/seed/${input.key}-avatar/256/256`,
    home_city: input.city,
    home_country: input.country,
    created_at: hoursAgo(300),
    role: "member",
    can_live_stream: true,
    topics: ["local_news"],
  };
}

function extraPage(input: {
  reporter: Profile;
  slug: string;
  title: string;
  description: string;
  location: LocationSummary;
  coverSeed: string;
  updatedHours: number;
  parts: Array<{ title: string; location: LocationSummary; kind: "video" | "photo"; hours: number }>;
}): InvestigationPageData {
  const investigation: InvestigationSummary = {
    id: `${INVESTIGATION_SHOWCASE_PREFIX}inv-${input.slug}`,
    title: input.title,
    slug: input.slug,
    description: input.description,
    status: "published",
    coverUrl: `https://picsum.photos/seed/${input.coverSeed}/1280/720`,
    partCount: input.parts.length,
    liveNow: false,
    updatedAt: hoursAgo(input.updatedHours),
    publishedAt: hoursAgo(input.parts[input.parts.length - 1]!.hours),
    location: input.location,
    reporterId: input.reporter.id,
    reporterName: input.reporter.display_name,
    reporterUsername: input.reporter.username,
    href: investigationHref(input.reporter.username, input.slug),
  };
  const parts: InvestigationPart[] = input.parts.map((item, index) => {
    const fh: FirsthandReport = {
      id: `${INVESTIGATION_SHOWCASE_PREFIX}${input.slug}-p${index + 1}`,
      title: item.title,
      location: item.location.label,
      locationId: item.location.id,
      locationSlug: item.location.slug,
      locationHref: item.location.href,
      city: item.location.city,
      country: item.location.country,
      excerpt: "Fictional development showcase. Not a real report.",
      mediaKind: item.kind,
      capturedAt: hoursAgo(item.hours),
      publishedAt: hoursAgo(item.hours),
      reporterName: input.reporter.display_name,
      reporterUsername: input.reporter.username,
      reporterAvatarUrl: input.reporter.avatar_url,
      thumbnailUrl: `https://picsum.photos/seed/${input.slug}-p${index + 1}/960/540`,
      mediaUrl: item.kind === "video" ? MOCK_LIVE_SAMPLE_VIDEO : null,
      licensingStatus: "view_only",
      requestId: null,
      requestTitle: null,
      respondsToRequest: false,
      recordedLive: false,
    };
    return {
      id: `${INVESTIGATION_SHOWCASE_PREFIX}item-${input.slug}-${index + 1}`,
      position: index + 1,
      title: item.title,
      locationLabel: item.location.label,
      city: item.location.city,
      country: item.location.country,
      capturedAt: fh.capturedAt,
      durationLabel: item.kind === "video" ? "08:14" : null,
      thumbnailUrl: fh.thumbnailUrl ?? null,
      mediaKind: item.kind,
      liveNow: false,
      recordedLive: false,
      href: `/reports/${fh.id}`,
      report: fh,
      liveStream: null,
      public: true,
    };
  });
  return assembleInvestigationPage(investigation, parts);
}

const nora = extraReporter({
  key: "nellison",
  username: "nellison",
  name: "Nora Ellison",
  bio: "Independent firsthand reporting on housing and street-level change. Fictional development showcase.",
  city: "Berlin",
  country: "Germany",
});
const kenji = extraReporter({
  key: "ksato",
  username: "ksato",
  name: "Kenji Sato",
  bio: "Documents public works from the sidewalk. Fictional development showcase.",
  city: "Osaka",
  country: "Japan",
});
const amira = extraReporter({
  key: "asolano",
  username: "asolano",
  name: "Amira Solano",
  bio: "Walks flood-affected neighborhoods after storms. Fictional development showcase.",
  city: "Valencia",
  country: "Spain",
});
const theo = extraReporter({
  key: "tbrennan",
  username: "tbrennan",
  name: "Theo Brennan",
  bio: "Follows waterfront cleanup from public paths. Fictional development showcase.",
  city: "Albany",
  country: "United States",
});

function extraShowcasePages(): InvestigationPageData[] {
  const berlin = loc("Berlin", "Germany", 52.52, 13.405);
  const osaka = loc("Osaka", "Japan", 34.6937, 135.5023);
  const valencia = loc("Valencia", "Spain", 39.4699, -0.3763);
  const albany = loc("Albany", "United States", 42.6526, -73.7562);
  return [
    extraPage({
      reporter: nora,
      slug: "housing-along-the-canal",
      title: "Housing along the canal",
      description:
        "I'm walking the canal week by week, recording what construction sites and sidewalks look like. These are firsthand observations from public space, not conclusions about any company or official.",
      location: berlin,
      coverSeed: "berlin-housing",
      updatedHours: 5,
      parts: [
        { title: "First walk along the towpath", location: berlin, kind: "video", hours: 40 },
        { title: "Scaffolding on a weekday morning", location: berlin, kind: "photo", hours: 22 },
        { title: "Neighbors on the bridge", location: berlin, kind: "video", hours: 12 },
        { title: "What the site looks like now", location: berlin, kind: "video", hours: 5 },
      ],
    }),
    extraPage({
      reporter: kenji,
      slug: "riverside-tram-extension",
      title: "Riverside tram extension",
      description:
        "Public construction along the river, filmed from sidewalks and stations. This is a record of what I saw on specific days.",
      location: osaka,
      coverSeed: "osaka-tram",
      updatedHours: 8,
      parts: [
        { title: "Fence line at the river park", location: osaka, kind: "video", hours: 30 },
        { title: "Station entrance at dusk", location: osaka, kind: "photo", hours: 16 },
        { title: "Weekend pedestrian detour", location: osaka, kind: "video", hours: 8 },
      ],
    }),
    extraPage({
      reporter: amira,
      slug: "after-the-floodwaters",
      title: "After the floodwaters",
      description:
        "Neighborhood streets after the water receded. I'm documenting cleanup visible from public roads, not assigning blame.",
      location: valencia,
      coverSeed: "valencia-storm",
      updatedHours: 3,
      parts: [
        { title: "First morning after the water dropped", location: valencia, kind: "video", hours: 28 },
        { title: "Sandbags still on the curb", location: valencia, kind: "photo", hours: 18 },
        { title: "Schoolyard being cleared", location: valencia, kind: "video", hours: 9 },
        { title: "Shopfronts reopening on the avenue", location: valencia, kind: "video", hours: 3 },
      ],
    }),
    extraPage({
      reporter: theo,
      slug: "river-cleanup-from-the-path",
      title: "River cleanup from the path",
      description:
        "Weekly walks along the public river path during a cleanup season. Fictional development material so the layout can be evaluated.",
      location: albany,
      coverSeed: "albany-river",
      updatedHours: 14,
      parts: [
        { title: "Starting at the boat launch", location: albany, kind: "video", hours: 36 },
        { title: "Boom line in the current", location: albany, kind: "photo", hours: 20 },
        { title: "Path after a work day", location: albany, kind: "video", hours: 14 },
      ],
    }),
  ];
}

export function showcasePublishedInvestigations(): InvestigationSummary[] {
  return [showcaseInvestigation(), ...extraShowcasePages().map((page) => page.investigation)].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export function showcaseInvestigationLatestUpdates() {
  return showcasePublishedInvestigations().map((investigation) => ({
    investigation,
    partLabel: `Part ${investigation.partCount}`,
  }));
}

export function applyPublishedInvestigationsShowcase(real: InvestigationSummary[]) {
  if (!isInvestigationShowcaseAllowed()) {
    return { investigations: real, usingShowcase: false };
  }
  if (real.length > 0) {
    return { investigations: real, usingShowcase: false };
  }
  return { investigations: showcasePublishedInvestigations(), usingShowcase: true };
}

export function applyInvestigationShowcasePage(
  username: string,
  slug: string,
  real: InvestigationPageData | null,
): InvestigationPageData | null {
  if (real) {
    return real;
  }
  if (!isInvestigationShowcaseAllowed()) {
    return null;
  }
  if (username === SHOWCASE_REPORTER_USERNAME && slug === "fraud-investigation-minnesota") {
    return showcaseInvestigationPage();
  }
  return extraShowcasePages().find((page) => page.investigation.reporterUsername === username && page.investigation.slug === slug) ?? null;
}

function showcaseInvestigationsForUsername(username: string) {
  return showcasePublishedInvestigations().filter((item) => item.reporterUsername === username);
}

function showcaseProfileForUsername(username: string): Profile | null {
  if (username === SHOWCASE_REPORTER_USERNAME) {
    return showcaseReporterProfile();
  }
  const reporters = [nora, kenji, amira, theo];
  return reporters.find((item) => item.username === username) ?? null;
}

export function applyShowcaseReporterProfile(username: string, real: ReporterProfilePage | null): ReporterProfilePage | null {
  const extras = showcaseInvestigationsForUsername(username);
  if (real) {
    if (isInvestigationShowcaseAllowed() && extras.length > 0 && real.investigations.length === 0) {
      return { ...real, investigations: extras };
    }
    return real;
  }
  if (!isInvestigationShowcaseAllowed()) {
    return null;
  }
  const profile = showcaseProfileForUsername(username);
  if (!profile || extras.length === 0) {
    return null;
  }
  const page =
    username === SHOWCASE_REPORTER_USERNAME
      ? showcaseInvestigationPage()
      : extraShowcasePages().find((item) => item.investigation.reporterUsername === username) ?? null;
  const reports = page?.parts.flatMap((part) => (part.report ? [part.report] : [])) ?? [];
  return assembleReporterProfilePage(profile, reports, new Map(), {
    liveNow: page?.livePart?.liveStream ? [page.livePart.liveStream] : [],
    pastLive: [],
    investigations: extras,
  });
}
