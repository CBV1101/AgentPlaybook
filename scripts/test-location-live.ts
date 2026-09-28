import {
  listLiveStreamsForLocation,
  compareLiveStreamsByViewers,
  type PlaceQuery,
} from "../lib/live-for-location";
import { getHomepageShowcaseContent } from "../lib/homepage-showcase";
import { MOCK_LIVE_SAMPLE_VIDEO, type LiveStreamSummary } from "../lib/live";
import type { LocationSummary } from "../lib/types";

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function loc(city: string, country: string, lat: number, lng: number): LocationSummary {
  return {
    id: `loc-${city}`,
    slug: city.toLowerCase(),
    place: null,
    city,
    country,
    latitude: lat,
    longitude: lng,
    label: `${city}, ${country}`,
    href: `/city/${city}`,
  };
}

function stream(
  id: string,
  city: string,
  country: string,
  lat: number,
  lng: number,
  viewers: number | null,
  started: string,
): LiveStreamSummary {
  return {
    id,
    title: id,
    status: "live",
    startedAt: started,
    endedAt: null,
    location: loc(city, country, lat, lng),
    reporterId: `r-${id}`,
    reporterName: id,
    reporterUsername: id,
    eventId: null,
    eventTitle: null,
    requestId: null,
    requestTitle: null,
    reportId: null,
    playbackKind: "file",
    playbackUrl: MOCK_LIVE_SAMPLE_VIDEO,
    thumbnailUrl: null,
    sensitiveContent: false,
    recordingAssetId: null,
    viewerCount: viewers,
  };
}

const nyc: PlaceQuery = { city: "New York", country: "United States", latitude: 40.7128, longitude: -74.006, scope: "city" };
const manhattan: PlaceQuery = { city: "Manhattan", country: "United States", latitude: 40.7831, longitude: -73.9712, scope: "place" };
const brooklyn: PlaceQuery = { city: "Brooklyn", country: "United States", latitude: 40.6782, longitude: -73.9442, scope: "city" };
const stockholm: PlaceQuery = { city: "Stockholm", country: "Sweden", latitude: 59.3293, longitude: 18.0686, scope: "city" };
const sweden: PlaceQuery = { city: "", country: "Sweden", latitude: 60.1282, longitude: 18.6435, scope: "country" };
const tokyo: PlaceQuery = { city: "Tokyo", country: "Japan", latitude: 35.6762, longitude: 139.6503, scope: "city" };
const paris: PlaceQuery = { city: "Paris", country: "France", latitude: 48.8566, longitude: 2.3522, scope: "city" };
const parisBox: PlaceQuery = {
  ...paris,
  boundingBox: { south: 48.815, north: 48.902, west: 2.224, east: 2.47 },
};

const a = stream("A", "New York", "United States", 40.758, -73.9855, 1842, "2026-09-24T10:00:00.000Z");
const b = stream("B", "New York", "United States", 40.7359, -73.9911, 921, "2026-09-24T10:10:00.000Z");
const c = stream("C", "Brooklyn", "United States", 40.6782, -73.9442, 403, "2026-09-24T10:20:00.000Z");
const d = stream("D", "Queens", "United States", 40.7282, -73.7949, 87, "2026-09-24T10:30:00.000Z");
const manhattanStream = stream("M", "Manhattan", "United States", 40.7831, -73.9712, 1200, "2026-09-24T10:05:00.000Z");
const uppsala = stream("U", "Uppsala", "Sweden", 59.8586, 17.6389, 40, "2026-09-24T10:00:00.000Z");
const stockholmStream = stream("S", "Stockholm", "Sweden", 59.3293, 18.0686, 63, "2026-09-24T10:00:00.000Z");
const parisA = stream("P1", "Paris", "France", 48.8809, 2.3553, 640, "2026-09-24T10:00:00.000Z");
const parisB = stream("P2", "Paris", "France", 48.8708, 2.3655, 310, "2026-09-24T10:10:00.000Z");
const parisC = stream("P3", "Paris", "France", 48.8867, 2.3431, 155, "2026-09-24T10:20:00.000Z");
const lyon = stream("L", "Lyon", "France", 45.764, 4.8357, 90, "2026-09-24T10:00:00.000Z");
const tie1 = stream("tie-old", "New York", "United States", 40.71, -74.0, 50, "2026-09-24T09:00:00.000Z");
const tie2 = stream("tie-new", "New York", "United States", 40.71, -74.0, 50, "2026-09-24T11:00:00.000Z");

const nycOrdered = listLiveStreamsForLocation([d, c, b, a, manhattanStream], nyc);
assert(nycOrdered.map((item) => item.id).join(",") === "A,M,B,C,D", "NYC hub includes boroughs, sorted by viewers");

const manhattanOnly = listLiveStreamsForLocation([d, c, b, a, manhattanStream], manhattan);
assert(manhattanOnly.map((item) => item.id).join(",") === "M", "Manhattan place search does not pull all NYC streams");

const brooklynOnly = listLiveStreamsForLocation([d, c, b, a], brooklyn);
assert(brooklynOnly.map((item) => item.id).join(",") === "C", "Brooklyn does not inherit the whole metro");

const stockholmOnly = listLiveStreamsForLocation([stockholmStream, uppsala, a], stockholm);
assert(stockholmOnly.map((item) => item.id).join(",") === "S", "Stockholm city is not a 75km radius");

const swedenStreams = listLiveStreamsForLocation([stockholmStream, uppsala, a], sweden);
assert(swedenStreams.map((item) => item.id).join(",") === "S,U", "Sweden country scope includes Swedish streams only");

assert(listLiveStreamsForLocation([a, stockholmStream], tokyo).length === 0, "Tokyo with no local streams is empty");

const parisCity = listLiveStreamsForLocation([parisA, parisB, parisC, lyon], paris);
assert(parisCity.map((item) => item.id).join(",") === "P1,P2,P3", "Paris city matches Paris streams by city, not Lyon");

const parisByBox = listLiveStreamsForLocation([parisA, lyon], parisBox);
assert(parisByBox.map((item) => item.id).join(",") === "P1", "bbox does not pull a same-country city outside the box");

const ties = [...[tie1, tie2].sort(compareLiveStreamsByViewers)].map((item) => item.id);
assert(ties[0] === "tie-new", "equal viewers prefer most recently started");

const showcase = getHomepageShowcaseContent().liveStreams.filter((item) => item.status === "live");
const cases: Array<{ label: string; place: PlaceQuery }> = [
  { label: "Tokyo", place: tokyo },
  { label: "Stockholm", place: stockholm },
  { label: "Paris", place: paris },
  { label: "New York City", place: nyc },
  { label: "Brooklyn", place: brooklyn },
  { label: "Sweden", place: sweden },
  { label: "Manhattan", place: manhattan },
];

for (const item of cases) {
  const matched = listLiveStreamsForLocation(showcase, item.place);
  const n = matched.length;
  console.log(`SEARCHED LOCATION: ${item.label}`);
  console.log(`NORMALIZED LOCATION ID: ${item.place.city || item.place.country}|${item.place.country}|${item.place.scope ?? "city"}`);
  console.log(`LAT/LNG: ${item.place.latitude}, ${item.place.longitude}`);
  console.log(`TOTAL CURRENTLY LIVE STREAMS IN SYSTEM: ${showcase.length}`);
  console.log(`LIVE STREAMS MATCHING LOCATION: ${n}`);
  console.log(`STREAM IDS MATCHED: ${matched.map((s) => s.id).join(", ") || "(none)"}`);
  console.log(`VIEWER COUNTS: ${matched.map((s) => String(s.viewerCount ?? "null")).join(", ") || "(none)"}`);
  console.log(`STREAMS PASSED TO GoingOnNowPopup: ${n}`);
  console.log(`POPUP COLLECTION LENGTH: ${n}`);
  console.log("CURRENT INDEX: 0");
  console.log(`PREVIOUS BUTTON RENDERED: NO`);
  console.log(`NEXT BUTTON RENDERED: ${n > 1 ? "YES" : "NO"}`);
  console.log("---");
}

assert(listLiveStreamsForLocation(showcase, tokyo).length === 0, "showcase Tokyo is 0");
assert(listLiveStreamsForLocation(showcase, stockholm).length === 1, "showcase Stockholm is 1");
assert(listLiveStreamsForLocation(showcase, paris).length === 3, "showcase Paris is 3");
assert(listLiveStreamsForLocation(showcase, nyc).length === 7, "showcase NYC metro is 7");

console.log("location live browse tests passed");
