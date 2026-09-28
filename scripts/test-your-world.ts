import type { FirsthandReport, LocationSummary } from "../lib/types";
import { assembleYourWorldFeed } from "../lib/your-world";

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function location(city: string, country: string, id: string): LocationSummary {
  return {
    id,
    slug: `${city}-${country}`.toLowerCase(),
    place: null,
    city,
    country,
    latitude: 1,
    longitude: 1,
    label: `${city}, ${country}`,
    href: `/city/${city}`,
  };
}

function report(id: string, city: string, country: string, minutes: number, title: string): FirsthandReport {
  const at = new Date(Date.parse("2026-09-24T12:00:00.000Z") - minutes * 60_000).toISOString();
  return {
    id,
    title,
    location: `${city}, ${country}`,
    locationId: `loc-${city}`,
    city,
    country,
    excerpt: title,
    mediaKind: "video",
    capturedAt: at,
    publishedAt: at,
    reporterName: "Reporter",
    reporterUsername: "reporter",
    thumbnailUrl: null,
    respondsToRequest: false,
  };
}

const minnesota = location("Minneapolis", "United States", "loc-mpls");
const berlin = location("Berlin", "Germany", "loc-berlin");
const nyc = location("New York", "United States", "loc-nyc");

const part7 = report("r-part7", "Minneapolis", "United States", 18, "Visited another location");
const berlin1 = report("r-b1", "Berlin", "Germany", 31, "One");
const berlin2 = report("r-b2", "Berlin", "Germany", 34, "Two");
const berlin3 = report("r-b3", "Berlin", "Germany", 38, "Three");
const nycVideo = report("r-nyc", "New York", "United States", 52, "Midtown");

const part8 = report("r-part8", "Berlin", "Germany", 9 * 60, "Neighborhood follow-up");
const liveDup = report("r-live-now", "New York", "United States", 5, "Still live");

const rows = [
  {
    report: part7,
    createdBy: "reporter-a",
    location: minnesota,
    investigation: {
      investigationId: "inv-a",
      title: "Minnesota Fraud Investigation",
      href: "/u/amorgan/investigations/fraud-investigation-minnesota",
      position: 7,
    },
  },
  {
    report: part8,
    createdBy: "reporter-a",
    location: berlin,
    investigation: {
      investigationId: "inv-a",
      title: "Minnesota Fraud Investigation",
      href: "/u/amorgan/investigations/fraud-investigation-minnesota",
      position: 8,
    },
  },
  { report: berlin1, createdBy: "other", location: berlin, investigation: null },
  { report: berlin2, createdBy: "other", location: berlin, investigation: null },
  { report: berlin3, createdBy: "other", location: berlin, investigation: null },
  { report: nycVideo, createdBy: "reporter-a", location: nyc, investigation: null },
  { report: liveDup, createdBy: "reporter-a", location: nyc, investigation: null },
];

const { items } = assembleYourWorldFeed({
  followedReporterIds: new Set(["reporter-a"]),
  followedLocations: [berlin, minnesota],
  followedInvestigationIds: new Set(["inv-a"]),
  rows,
  excludeReportIds: new Set(["r-live-now"]),
});

assert(items.filter((item) => item.id.includes("r-part7")).length === 1, "part 7 must appear once");
assert(items.filter((item) => item.id.includes("r-part8")).length === 1, "part 8 from Berlin must appear once");
const investigation = items.find((item) => item.kind === "investigation" && item.position === 7);
assert(investigation?.kind === "investigation" && investigation.position === 7, "investigation context required");
const part8Item = items.find((item) => item.kind === "investigation" && item.position === 8);
assert(part8Item?.kind === "investigation", "part 8 stays an investigation item, not three copies");
assert(items.some((item) => item.kind === "place-group" && item.city === "Berlin" && item.reports.length === 3), "Berlin grouping");
assert(items.some((item) => item.kind === "report" && item.report.id === "r-nyc"), "reporter activity");
assert(!items.some((item) => item.kind === "report" && item.report.id === "r-live-now"), "live duplicate omitted");
assert(
  !items.some((item) => item.kind === "place-group" && item.reports.some((report) => report.id === "r-live-now")),
  "live report must not appear inside a place group",
);
assert(
  !items.some((item) => item.kind === "place-group" && item.reports.some((report) => report.id === "r-part8")),
  "investigation part must not also sit in the Berlin group",
);
assert(items[0] && items[0].occurredAt >= items[items.length - 1]!.occurredAt, "chronological newest first");

console.log("your world tests passed");
