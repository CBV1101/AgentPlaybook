import {
  allowMockFallbackOnFailure,
  assertProductionSupabaseConfig,
  canUseShowcaseData,
  getDataSource,
  isExplicitMockEnabled,
  isMockMode,
} from "../lib/data/mode";
import { applyExploreShowcase, applyWantedShowcase } from "../lib/discovery-showcase";
import { applyHomepageShowcase, countLiveNow, MIN_DEV_LIVE_GRID_STREAMS } from "../lib/homepage-showcase";
import {
  applyInvestigationShowcasePage,
  applyPublishedInvestigationsShowcase,
  applyShowcaseReporterProfile,
} from "../lib/investigation-showcase";
import { missingProductionSupabaseConfig } from "../lib/supabase/env";

const productionSupabase = {
  NODE_ENV: "production",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
};

const developmentSupabase = {
  NODE_ENV: "development",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
};

const emptyPresentation = {
  liveStreams: [],
  requests: [],
  reports: [],
  places: [],
  events: [],
  cities: [],
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function throws(fn: () => unknown, match: RegExp, message: string) {
  try {
    fn();
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    assert(match.test(text), `${message}: got ${text}`);
    assert(!/anon-key|secret|eyJ/i.test(text), "configuration errors must not include secret-like values");
    return;
  }
  throw new Error(`${message}: expected throw`);
}

function run() {
  assert(allowMockFallbackOnFailure() === false, "repository failures must never enable mock fallback");

  assert(getDataSource(productionSupabase) === "supabase", "production + valid Supabase must use supabase");
  assert(!isMockMode(productionSupabase), "production + valid Supabase must not be mock");
  assert(!canUseShowcaseData(productionSupabase), "showcase must be impossible in production");
  assert(
    getDataSource({ ...productionSupabase, FIRSTHAND_USE_MOCK: "1" }) === "supabase",
    "FIRSTHAND_USE_MOCK must be ignored in production",
  );

  throws(
    () => getDataSource({ NODE_ENV: "production" }),
    /Firsthand production configuration error: NEXT_PUBLIC_SUPABASE_URL is required/,
    "production + missing Supabase must fail closed",
  );
  throws(
    () =>
      getDataSource({
        NODE_ENV: "production",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      }),
    /NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required/,
    "production + missing public key must fail closed",
  );
  throws(
    () =>
      getDataSource({
        NODE_ENV: "production",
        NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
      }),
    /NEXT_PUBLIC_SUPABASE_URL is invalid/,
    "production + invalid URL must fail closed",
  );
  throws(
    () =>
      getDataSource({
        NODE_ENV: "production",
        FIRSTHAND_USE_MOCK: "1",
      }),
    /Firsthand production configuration error/,
    "production + mock flag + missing Supabase must still fail closed",
  );

  assertProductionSupabaseConfig(productionSupabase);
  throws(
    () => assertProductionSupabaseConfig({ NODE_ENV: "production" }),
    /Firsthand production configuration error/,
    "startup assertion must fail when production config is missing",
  );

  const missing = missingProductionSupabaseConfig({ NODE_ENV: "production" });
  assert(missing.some((item) => item.includes("NEXT_PUBLIC_SUPABASE_URL")), "missing list names the URL variable");

  const emptyHome = applyHomepageShowcase(emptyPresentation, { NODE_ENV: "production" });
  assert(emptyHome.usingShowcase === false, "production empty homepage must not use showcase");
  assert(emptyHome.liveStreams.length === 0, "production empty homepage must not invent streams");
  assert(emptyHome.reports.length === 0, "production empty homepage must not invent reports");
  assert(emptyHome.requests.length === 0, "production empty homepage must not invent coverage requests");

  const emptyWanted = applyWantedShowcase(
    { requests: [], reports: [], liveStreams: [], places: [] },
    { NODE_ENV: "production" },
  );
  assert(emptyWanted.usingShowcase === false, "production empty coverage wanted must not use showcase");
  assert(emptyWanted.requests.length === 0, "production must not invent coverage requests");

  const emptyExplore = applyExploreShowcase(
    { liveStreams: [], requests: [], reports: [], places: [] },
    { NODE_ENV: "production" },
  );
  assert(emptyExplore.usingShowcase === false, "production empty explore must not use showcase");
  assert(emptyExplore.liveStreams.length === 0, "production must not invent explore streams");

  const emptyInvestigations = applyPublishedInvestigationsShowcase([], { NODE_ENV: "production" });
  assert(emptyInvestigations.usingShowcase === false, "production empty investigations must not use showcase");
  assert(emptyInvestigations.investigations.length === 0, "production must not invent investigations");
  assert(
    applyInvestigationShowcasePage("amorgan", "fraud-investigation-minnesota", null, { NODE_ENV: "production" }) ===
      null,
    "production must not invent investigation pages",
  );
  assert(
    applyShowcaseReporterProfile("amorgan", null, { NODE_ENV: "production" }) === null,
    "production must not invent reporter profiles",
  );

  assert(getDataSource(developmentSupabase) === "supabase", "development + real Supabase must use supabase");
  assert(
    getDataSource({ NODE_ENV: "development", FIRSTHAND_USE_MOCK: "1" }) === "mock",
    "development + FIRSTHAND_USE_MOCK must use the mock store even without Supabase keys",
  );
  assert(
    getDataSource({
      ...developmentSupabase,
      FIRSTHAND_USE_MOCK: "1",
    }) === "mock",
    "explicit mock flag wins in development even when Supabase is configured",
  );
  assert(isExplicitMockEnabled({ FIRSTHAND_USE_MOCK: "true" }), "FIRSTHAND_USE_MOCK=true must be recognized");
  assert(canUseShowcaseData({ NODE_ENV: "development" }), "development may use showcase");
  assert(!canUseShowcaseData({ NODE_ENV: "test" }), "test NODE_ENV must not enable showcase overlays");
  assert(!canUseShowcaseData({ NODE_ENV: "production", FIRSTHAND_USE_MOCK: "1" }), "production cannot showcase");

  throws(
    () => getDataSource({ NODE_ENV: "development" }),
    /FIRSTHAND_USE_MOCK=1/,
    "development without Supabase and without mock flag must not silently become mock",
  );

  const showcaseHome = applyHomepageShowcase(emptyPresentation, { NODE_ENV: "development" });
  assert(showcaseHome.usingShowcase === true, "development empty homepage may use showcase");
  assert(
    countLiveNow(showcaseHome.liveStreams) >= MIN_DEV_LIVE_GRID_STREAMS,
    "development showcase home must include a multi-stream live grid",
  );
  assert(showcaseHome.requests.length > 0, "development showcase may include coverage requests");
  const showcaseExplore = applyExploreShowcase(
    { liveStreams: [], requests: [], reports: [], places: [] },
    { NODE_ENV: "development" },
  );
  assert(showcaseExplore.usingShowcase === true, "development empty explore may use showcase");
  assert(showcaseExplore.liveStreams.length > 1, "development showcase explore must include multiple streams");
  const showcaseInvestigations = applyPublishedInvestigationsShowcase([], { NODE_ENV: "development" });
  assert(showcaseInvestigations.usingShowcase === true, "development empty investigations may use showcase");
  assert(showcaseInvestigations.investigations.length > 0, "development showcase investigations must exist");

  assert(getDataSource({ NODE_ENV: "test" }) === "mock", "NODE_ENV=test may use mock without the flag");

  console.log("test-data-source: ok");
}

run();
