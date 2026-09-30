import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { toLiveStreamSummary } from "../lib/data/live-map";
import { mockListPublicLiveStreams } from "../lib/data/mock/live-repository";
import { createSeedDatabase } from "../lib/data/mock/seed";
import { readMockDatabase, writeMockDatabase } from "../lib/data/mock/store";
import { isOccupyingBroadcastSlot, isPubliclyLive, LIVE_CREATED_TIMEOUT_MS, LIVE_HEARTBEAT_STALE_MS, type LiveStreamSummary } from "../lib/live";
import { liveStreamMatchesPlace, listLiveStreamsForLocation } from "../lib/live-for-location";
import { rankLiveNow } from "../lib/live-rank";
import { liveViewerSelectedRenderer } from "../lib/live/viewer-render";
import { cloudflareIngestFromLiveInputStatus } from "../lib/media/cloudflare-live";
import type { LiveStreamRecord } from "../lib/database.types";
import type { LocationRow } from "../lib/data/mappers";
import type { LocationSummary } from "../lib/types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const location: LocationSummary = {
  id: "loc",
  slug: "karlstad-sweden",
  href: "/place/karlstad-sweden",
  label: "Karlstad",
  place: null,
  city: "Karlstad",
  country: "Sweden",
  latitude: 59.4,
  longitude: 13.5,
};

const WHEP = "https://customer-examplecode.cloudflarestream.com/live-input-uid/webRTC/play";

function stream(overrides: Partial<LiveStreamSummary>): LiveStreamSummary {
  return {
    id: "real-live-1",
    title: "Karlstad live",
    status: "live",
    startedAt: "2026-09-29T11:00:00.000Z",
    endedAt: null,
    location,
    reporterId: "user-1",
    reporterName: "Chris",
    reporterUsername: "chris",
    eventId: null,
    eventTitle: null,
    requestId: null,
    requestTitle: null,
    reportId: null,
    playbackKind: "whep",
    playbackUrl: WHEP,
    thumbnailUrl: null,
    sensitiveContent: false,
    recordingAssetId: null,
    viewerCount: null,
    cloudflareIngest: "unknown",
    ...overrides,
  };
}

const karlstad = { city: "Karlstad", country: "Sweden", latitude: 59.4, longitude: 13.5, scope: "city" as const };

const connected = stream({ id: "connected", cloudflareIngest: "connected" });
const disconnected = stream({
  id: "disconnected",
  cloudflareIngest: "disconnected",
  playbackUrl: WHEP,
});
const unknown = stream({ id: "unknown", cloudflareIngest: "unknown" });
const staleHeartbeatConnected = stream({
  id: "stale-hb",
  cloudflareIngest: "connected",
  startedAt: "2026-01-01T00:00:00.000Z",
});

assert(isPubliclyLive(connected), "DB live + CF connected is publicly live");
assert(
  listLiveStreamsForLocation([connected, disconnected, unknown], karlstad).map((item) => item.id).join(",") ===
    "connected,unknown",
  "disconnected is excluded from public LIVE location lists; unknown remains fail-open",
);
assert(!liveStreamMatchesPlace(disconnected, karlstad), "disconnected does not match public live place lists");
assert(!isPubliclyLive(disconnected), "DB live + CF disconnected is not publicly live");
assert(disconnected.status === "live", "disconnected display rule does not change DB status on the summary");
assert(
  isOccupyingBroadcastSlot(disconnected.status),
  "hiding a disconnected live row from the public catalog must not free the reporter slot",
);
assert(isOccupyingBroadcastSlot("created"), "created occupies the reporter broadcast slot");
assert(!isOccupyingBroadcastSlot("ended"), "ended does not occupy the reporter broadcast slot");
assert(!isOccupyingBroadcastSlot("failed"), "failed does not occupy the reporter broadcast slot");
assert(!isOccupyingBroadcastSlot("terminated"), "terminated does not occupy the reporter broadcast slot");
assert(isPubliclyLive(unknown), "DB live + CF unknown stays publicly live");
assert(isPubliclyLive(staleHeartbeatConnected), "stale heartbeat alone does not hide a connected live stream");
const rankedIds = rankLiveNow([disconnected, connected, unknown], [], []).map((item) => item.stream.id);
assert(rankedIds.includes("connected") && rankedIds.includes("unknown") && !rankedIds.includes("disconnected"), "homepage ranking excludes disconnected and keeps unknown fail-open");
assert(
  liveViewerSelectedRenderer(disconnected) !== "whep",
  "disconnected streams must not use WHEP even when a playback URL exists",
);
assert(liveViewerSelectedRenderer(connected) === "whep", "connected live still uses WHEP");

assert(cloudflareIngestFromLiveInputStatus("connected") === "connected", "string connected is connected");
assert(
  cloudflareIngestFromLiveInputStatus({ current: { state: "connected" } }) === "connected",
  "nested current.state connected is connected",
);
assert(
  cloudflareIngestFromLiveInputStatus({ current: { state: "disconnected" } }) === "disconnected",
  "nested disconnected is disconnected",
);
assert(cloudflareIngestFromLiveInputStatus(null) === "unknown", "missing status is unknown, not disconnected");
assert(
  cloudflareIngestFromLiveInputStatus({ current: { state: "disconnected" } }) === "disconnected",
  "WHEP URL is not consulted; ingest comes from connection state",
);

const rowLocation: LocationRow = {
  id: location.id,
  slug: location.slug,
  place: location.place,
  city: location.city,
  country: location.country,
  latitude: location.latitude,
  longitude: location.longitude,
};

const mappedDisconnected = toLiveStreamSummary({
  row: {
    id: "mapped-disconnected",
    reporter_id: "user-1",
    location_id: location.id,
    event_id: null,
    coverage_request_id: null,
    report_id: null,
    cloudflare_live_input_id: "live-input-uid",
    recording_asset_id: null,
    status: "live",
    title: "Old Karlstad input",
    started_at: "2026-09-01T11:00:00.000Z",
    ended_at: null,
    last_seen_at: "2026-09-01T11:00:00.000Z",
    created_at: "2026-09-01T11:00:00.000Z",
    sensitive_content: false,
    viewer_count: null,
    viewer_count_checked_at: null,
  } as LiveStreamRecord,
  location: rowLocation,
  reporterName: "Chris",
  reporterUsername: "chris",
  liveWhepUrl: WHEP,
  cloudflareIngest: "disconnected",
});
assert(mappedDisconnected.status === "live", "mapping a disconnected ingest must keep DB status live");
assert(mappedDisconnected.playbackUrl === WHEP, "WHEP URL may still exist on a disconnected input");
assert(!isPubliclyLive(mappedDisconnected), "mapped disconnected ingest is not publicly live");

const supabaseRepo = readFileSync(join(process.cwd(), "lib/data/supabase/live-repository.ts"), "utf8");
const observeStart = supabaseRepo.indexOf("async function observeCloudflareLiveInputs");
const observeEnd = supabaseRepo.indexOf("const VIEWER_COUNT_TTL_MS");
assert(observeStart >= 0 && observeEnd > observeStart, "observeCloudflareLiveInputs must exist");
const observeFn = supabaseRepo.slice(observeStart, observeEnd);
assert(!observeFn.includes(".update("), "Cloudflare ingest observation must not update live_streams");
assert(!observeFn.includes('status: "failed"'), "Cloudflare ingest observation must not write live → failed");
assert(
  supabaseRepo.includes("item.status !== \"live\" || isPubliclyLive(item)"),
  "public live list must filter disconnected ingest without mutating status",
);
assert(
  !supabaseRepo.includes("LIVE_HEARTBEAT_STALE_MS"),
  "public live GET must not fail on-air rows for a stale heartbeat",
);
const getPageFn = supabaseRepo.slice(
  supabaseRepo.indexOf("export async function supabaseGetLiveStreamPage"),
  supabaseRepo.indexOf("export async function supabaseCreateLiveStream"),
);
assert(
  !getPageFn.includes("isPubliclyLive"),
  "owner/studio GET must not drop a DB-live row just because ingest is disconnected",
);
const createFn = supabaseRepo.slice(supabaseRepo.indexOf("export async function supabaseCreateLiveStream"));
assert(
  !createFn.includes("isOccupyingBroadcastSlot"),
  "P0 #4B occupancy must not be enforced during #4A create",
);

const mockRepo = readFileSync(join(process.cwd(), "lib/data/mock/live-repository.ts"), "utf8");
assert(!mockRepo.includes("LIVE_HEARTBEAT_STALE_MS"), "mock sweep must not fail live rows for a stale heartbeat");
assert(mockRepo.includes("LIVE_CREATED_TIMEOUT_MS"), "mock created timeout cleanup must remain");

const dbPath = join(process.cwd(), ".local", "mock-db.json");
let previous: string | null = null;
try {
  previous = readFileSync(dbPath, "utf8");
} catch {
  previous = null;
}

try {
  writeMockDatabase(createSeedDatabase());
  const liveId = "13131313-1313-4131-8131-131313131311";
  const stale = new Date(Date.now() - LIVE_HEARTBEAT_STALE_MS - 60_000).toISOString();
  const database = readMockDatabase();
  const liveRow = database.live_streams.find((item) => item.id === liveId);
  assert(liveRow, "seed includes alexanderplatz live row");
  liveRow!.last_seen_at = stale;
  writeMockDatabase(database);

  const listed = mockListPublicLiveStreams();
  const stillLive = listed.find((item) => item.id === liveId);
  assert(stillLive?.status === "live", "stale heartbeat must not hide or fail a mock live row");
  assert(
    readMockDatabase().live_streams.find((item) => item.id === liveId)?.status === "live",
    "stale heartbeat must not persist live → failed",
  );

  const createdId = "created-timeout-test";
  const expired = new Date(Date.now() - LIVE_CREATED_TIMEOUT_MS - 1_000).toISOString();
  const withCreated = readMockDatabase();
  withCreated.live_streams.push({
    ...liveRow!,
    id: createdId,
    status: "created",
    started_at: null,
    ended_at: null,
    last_seen_at: null,
    created_at: expired,
    cloudflare_live_input_id: "mock-created-timeout",
  });
  writeMockDatabase(withCreated);
  mockListPublicLiveStreams();
  assert(
    readMockDatabase().live_streams.find((item) => item.id === createdId)?.status === "failed",
    "created timeout cleanup must still fail expired created rows",
  );
} finally {
  if (previous) {
    writeFileSync(dbPath, previous);
  } else {
    writeMockDatabase(createSeedDatabase());
  }
}

console.log("live public ingest tests passed");
