import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { getDataSource, isMockMode } from "../lib/data/mode";
import { isTracedLiveTitle } from "../lib/live/public-trace";
import { LIVE_HEARTBEAT_STALE_MS } from "../lib/live";
import { getSupabasePublicEnv } from "../lib/supabase/env";
import { getSupabaseServiceRoleKey } from "../lib/supabase/admin";
import { applyHomepageShowcase } from "../lib/homepage-showcase";
import { toLiveStreamSummary } from "../lib/data/live-map";
import type { LiveStreamRecord, Location } from "../lib/database.types";

loadEnvConfig(process.cwd());

function log(line: string) {
  console.info(`[Firsthand Live probe] ${line}`);
}

async function run() {
  log(`data source: ${getDataSource()}`);
  log(`mock mode: ${isMockMode() ? "yes" : "no"}`);
  log(`FIRSTHAND_USE_MOCK set: ${process.env.FIRSTHAND_USE_MOCK ? "yes" : "no"}`);
  const publicEnv = getSupabasePublicEnv();
  if (!publicEnv) {
    throw new Error("Supabase public env missing");
  }
  const anon = createClient(publicEnv.url, publicEnv.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: liveRows, error: liveError } = await anon
    .from("live_streams")
    .select("*")
    .eq("status", "live")
    .order("started_at", { ascending: false });
  log(`anon live query error: ${liveError ? liveError.message : "none"}`);
  log(`anon live row count: ${liveRows?.length ?? 0}`);
  const titles = (liveRows ?? []).map((row) => row.title).join(" | ") || "(none)";
  log(`anon live titles: ${titles}`);
  const test = (liveRows ?? []).find((row) => isTracedLiveTitle(row.title)) as LiveStreamRecord | undefined;
  log(`RAW QUERY test: ${test ? "yes" : "no"}`);
  if (!test) {
    const serviceKey = getSupabaseServiceRoleKey();
    if (serviceKey) {
      const admin = createClient(publicEnv.url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: adminRows, error: adminError } = await admin
        .from("live_streams")
        .select("id, title, status")
        .eq("title", "test")
        .order("created_at", { ascending: false })
        .limit(5);
      log(`admin title=test error: ${adminError ? adminError.message : "none"}`);
      log(`admin title=test count: ${adminRows?.length ?? 0}`);
      for (const row of adminRows ?? []) {
        log(`admin status: ${row.status}`);
      }
    }
    return;
  }
  log(`stream id: ${test.id}`);
  log(`title: ${test.title}`);
  log(`status: ${test.status}`);
  log(`cloudflare_live_input_id: ${test.cloudflare_live_input_id ?? "none"}`);
  log(`reporter id: ${test.reporter_id}`);
  log(`location id: ${test.location_id}`);
  if (test.last_seen_at) {
    const age = Date.now() - new Date(test.last_seen_at).getTime();
    log(`last_seen age ms: ${age}`);
    log(`heartbeat stale vs sweep: ${age > LIVE_HEARTBEAT_STALE_MS ? "yes" : "no"}`);
  } else {
    log("last_seen: none");
  }

  const locationIds = [...new Set((liveRows ?? []).map((item) => item.location_id))];
  const reporterIds = [...new Set((liveRows ?? []).map((item) => item.reporter_id))];
  const [{ data: locations, error: locationsError }, { data: profiles, error: profilesError }] = await Promise.all([
    anon.from("locations").select("*").in("id", locationIds),
    anon.from("profiles").select("id, display_name, username").in("id", reporterIds),
  ]);
  log(`hydrate locations error: ${locationsError ? locationsError.message : "none"}`);
  log(`hydrate profiles error: ${profilesError ? profilesError.message : "none"}`);
  const location = (locations ?? []).find((item) => item.id === test.location_id);
  const profile = (profiles ?? []).find((item) => item.id === test.reporter_id);
  log(`REPORTER RESOLVED: ${profile ? "yes" : "no"}`);
  log(`LOCATION RESOLVED: ${location ? "yes" : "no"}`);
  if (!location || !profile) {
    return;
  }
  const summary = toLiveStreamSummary({
    row: test,
    location: location as Location,
    reporterName: profile.display_name,
    reporterUsername: profile.username,
  });
  log(`SUMMARY test: yes`);
  log(`summary status: ${summary.status}`);
  log(`summary playback kind: ${summary.playbackKind}`);
  log(`summary WHEP: ${summary.playbackKind === "whep" && summary.playbackUrl ? "yes" : "no"}`);
  const presentation = applyHomepageShowcase({
    liveStreams: [summary],
    requests: [],
    reports: [],
    places: [],
    events: [],
    cities: [],
  });
  log(`PRE-MERGE test: yes`);
  log(`POST-MERGE test: ${presentation.liveStreams.some((item) => isTracedLiveTitle(item.title)) ? "yes" : "no"}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : "probe failed");
  process.exit(1);
});
