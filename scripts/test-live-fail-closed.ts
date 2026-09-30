import { readFileSync } from "node:fs";
import { join } from "node:path";
import { toLiveStreamSummary } from "../lib/data/live-map";
import { applyHomepageShowcase } from "../lib/homepage-showcase";
import { canUseShowcaseData, getDataSource, isExplicitMockEnabled, isMockMode } from "../lib/data/mode";
import { mockLiveBroadcastSession, mockMarkLiveStream } from "../lib/data/mock/live-repository";
import { isCloudflareLiveConfigured } from "../lib/media/cloudflare-live";
import {
  allowMockLiveProtocol,
  assertSupabaseCanMarkLive,
  assertSupabaseLiveCreateAllowed,
  assertSupabaseLiveSessionAllowed,
  isPlaceholderLiveInputId,
  LIVE_UNAVAILABLE_CODE,
  LIVE_UNAVAILABLE_USER_MESSAGE,
  liveUserFacingMessage,
  supabaseEndPublishesSampleVideo,
} from "../lib/live/fail-closed";
import { MOCK_LIVE_SAMPLE_VIDEO } from "../lib/live";
import type { LiveStreamRecord } from "../lib/database.types";
import type { LocationRow } from "../lib/data/mappers";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function throws(fn: () => unknown, code: string, message: string) {
  try {
    fn();
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    assert(text === code, `${message}: got ${text}`);
    return;
  }
  throw new Error(`${message}: expected throw`);
}

const location: LocationRow = {
  id: "loc-1",
  slug: "test-place",
  place: "Test Place",
  city: "Berlin",
  country: "Germany",
  latitude: 52.5,
  longitude: 13.4,
};

function row(overrides: Partial<LiveStreamRecord>): LiveStreamRecord {
  return {
    id: "stream-1",
    reporter_id: "user-1",
    location_id: location.id,
    event_id: null,
    coverage_request_id: null,
    report_id: null,
    cloudflare_live_input_id: null,
    recording_asset_id: null,
    status: "created",
    title: "Live firsthand report",
    started_at: null,
    ended_at: null,
    last_seen_at: null,
    created_at: "2026-09-29T09:00:00.000Z",
    sensitive_content: false,
    viewer_count: null,
    viewer_count_checked_at: null,
    ...overrides,
  };
}

function playback(overrides: Partial<LiveStreamRecord>) {
  return toLiveStreamSummary({
    row: row(overrides),
    location,
    reporterName: "Jordan",
    reporterUsername: "jordan",
  });
}

async function run() {
  const supabaseRepo = readFileSync(join(process.cwd(), "lib/data/supabase/live-repository.ts"), "utf8");
  assert(!supabaseRepo.includes("local-${"), "A/B: supabase live-repository must not synthesize local-* Cloudflare IDs");
  assert(!supabaseRepo.includes("mock:local"), "C: supabase live-repository must not return mock:local");
  assert(!supabaseRepo.includes("flower.mp4"), "G: supabase live-repository must not publish the MDN sample");
  assert(!supabaseRepo.includes("LIVE_HEARTBEAT_STALE_MS"), "public live GET must not fail on-air rows for a stale heartbeat");
  const observeStart = supabaseRepo.indexOf("async function observeCloudflareLiveInputs");
  const observeEnd = supabaseRepo.indexOf("const VIEWER_COUNT_TTL_MS");
  assert(observeStart >= 0 && observeEnd > observeStart, "P0 #4A: ingest observation helper must exist");
  const observeFn = supabaseRepo.slice(observeStart, observeEnd);
  assert(!observeFn.includes(".update("), "P0 #4A: Cloudflare observation must not mutate live_streams");

  const unconfigured = {
    CLOUDFLARE_ACCOUNT_ID: "",
    CLOUDFLARE_STREAM_API_TOKEN: "",
  };
  assert(!isCloudflareLiveConfigured(unconfigured), "A: missing Cloudflare must read as unconfigured");
  throws(
    () => assertSupabaseLiveCreateAllowed(isCloudflareLiveConfigured(unconfigured)),
    LIVE_UNAVAILABLE_CODE,
    "A: supabase create must fail closed when Cloudflare is missing",
  );
  throws(
    () => assertSupabaseLiveSessionAllowed(false, "cf-real-uid"),
    LIVE_UNAVAILABLE_CODE,
    "C: supabase session must fail when Cloudflare is missing even with a real-looking id",
  );
  throws(
    () => assertSupabaseLiveSessionAllowed(true, "local-abc"),
    LIVE_UNAVAILABLE_CODE,
    "C: supabase session must reject local-* ids",
  );
  assert(isPlaceholderLiveInputId("local-uuid"), "B: local-* is a placeholder identity");
  assert(!allowMockLiveProtocol("supabase"), "C: mock protocol is not allowed on the supabase data source");

  throws(() => assertSupabaseCanMarkLive("local-stream"), LIVE_UNAVAILABLE_CODE, "D: local-* cannot be marked LIVE");
  throws(() => assertSupabaseCanMarkLive("mock-live-x"), LIVE_UNAVAILABLE_CODE, "D: mock-* cannot be marked LIVE");
  throws(
    () => assertSupabaseCanMarkLive("dev-showcase-live-1"),
    LIVE_UNAVAILABLE_CODE,
    "D: showcase identities cannot be marked LIVE",
  );

  const liveLocal = playback({
    status: "live",
    cloudflare_live_input_id: "local-stream-1",
  });
  assert(liveLocal.playbackUrl === null, "live fallback: local-* supabase stream must not play sample video");

  const liveRealNoPlayer = playback({
    status: "live",
    cloudflare_live_input_id: "cf-real-live-input",
  });
  assert(liveRealNoPlayer.playbackKind === "whep", "real live input requests WHEP playback, not iframe");
  assert(liveRealNoPlayer.playbackUrl === null, "real live WHEP URL must be supplied from Cloudflare, not guessed");
  assert(
    !String(liveRealNoPlayer.playbackUrl ?? "").includes("iframe.cloudflarestream.com"),
    "real live must not use the generic iframe host",
  );

  const endedNoRecording = playback({
    status: "ended",
    cloudflare_live_input_id: "cf-real-uid",
    recording_asset_id: null,
  });
  assert(endedNoRecording.playbackUrl === null, "G: ended supabase stream without CF recording has no playback URL");
  assert(endedNoRecording.playbackUrl !== MOCK_LIVE_SAMPLE_VIDEO, "G: must not use MDN flower as a real archive");
  assert(!supabaseEndPublishesSampleVideo(), "G: supabase end never publishes sample video");

  const mockLive = playback({
    status: "live",
    cloudflare_live_input_id: "mock-live-alexanderplatz",
  });
  assert(mockLive.playbackUrl === MOCK_LIVE_SAMPLE_VIDEO, "E: explicit mock catalog streams may use the sample video");

  const session = await mockLiveBroadcastSession(
    "22222222-2222-4222-8222-222222222222",
    "13131313-1313-4131-8131-131313131311",
  );
  assert(allowMockLiveProtocol("mock"), "E: mock data source may use the mock live protocol");
  assert(session.protocol === "mock", "E: mock session protocol remains mock");
  assert(session.whipUrl === "mock:local", "E: mock session still returns mock:local");
  await mockMarkLiveStream("22222222-2222-4222-8222-222222222222", "13131313-1313-4131-8131-131313131311", "live");

  const production = {
    NODE_ENV: "production",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
    FIRSTHAND_USE_MOCK: "1",
  };
  assert(getDataSource(production) === "supabase", "F: production ignores FIRSTHAND_USE_MOCK");
  assert(!isMockMode(production), "F: production is not mock mode");
  assert(!allowMockLiveProtocol(getDataSource(production)), "F: production cannot use mock live protocol");
  assert(
    isExplicitMockEnabled({ FIRSTHAND_USE_MOCK: "1" }) && getDataSource(production) !== "mock",
    "F: explicit mock flag does not enable mock live in production",
  );

  const emptyHome = {
    liveStreams: [],
    requests: [],
    reports: [],
    places: [],
    events: [],
    cities: [],
  };
  const productionShowcase = applyHomepageShowcase(emptyHome, production);
  assert(!productionShowcase.usingShowcase, "H: homepage showcase is off in production");
  assert(productionShowcase.liveStreams.length === 0, "H: production does not inject showcase lives");
  assert(!canUseShowcaseData(production), "H: canUseShowcaseData is false in production");
  assert(canUseShowcaseData({ NODE_ENV: "development" }), "H: showcase remains available in development");

  const userMessage = liveUserFacingMessage(new Error("Cloudflare Stream is not configured."));
  assert(userMessage === LIVE_UNAVAILABLE_USER_MESSAGE, "user error is the generic unavailable copy");
  assert(!/CLOUDFLARE|token|account/i.test(userMessage), "user error must not leak configuration names");

  console.log("live fail-closed tests passed");
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
