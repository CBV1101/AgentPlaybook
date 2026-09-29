import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { getCloudflareLiveInput, isCloudflareLiveConfigured } from "../lib/media/cloudflare-live";
import { isTracedLiveTitle } from "../lib/live/public-trace";
import { getSupabasePublicEnv } from "../lib/supabase/env";

loadEnvConfig(process.cwd());

function log(line: string) {
  console.info(`[Firsthand Live probe] ${line}`);
}

async function run() {
  const publicEnv = getSupabasePublicEnv();
  if (!publicEnv) {
    throw new Error("Supabase public env missing");
  }
  const anon = createClient(publicEnv.url, publicEnv.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: liveRows, error } = await anon
    .from("live_streams")
    .select("id, title, status, created_at, started_at, cloudflare_live_input_id")
    .eq("status", "live")
    .order("started_at", { ascending: false });
  log(`live query error: ${error ? error.message : "none"}`);
  const tests = (liveRows ?? []).filter((row) => isTracedLiveTitle(row.title));
  log(`LIVE test DB rows: ${tests.length}`);
  for (const row of tests) {
    log(`stream.id: ${row.id}`);
    log(`created_at: ${row.created_at}`);
    log(`started_at: ${row.started_at ?? "none"}`);
    log(`status: ${row.status}`);
    log(`cloudflare_live_input_id: ${row.cloudflare_live_input_id ?? "none"}`);
  }
  if (!isCloudflareLiveConfigured()) {
    log("CURRENT Cloudflare input mapping: Cloudflare not configured");
    return;
  }
  const ids = [...new Set(tests.map((row) => row.cloudflare_live_input_id).filter(Boolean))] as string[];
  for (const id of ids) {
    try {
      const input = await getCloudflareLiveInput(id);
      const owners = tests.filter((row) => row.cloudflare_live_input_id === id).map((row) => row.id);
      log(`Cloudflare input connected: ${input.connected ? "yes" : "no"}`);
      log(`Cloudflare input enabled: ${input.enabled ? "yes" : "no"}`);
      log(`mapped stream.id count: ${owners.length}`);
      for (const streamId of owners) {
        log(`mapped stream.id: ${streamId}`);
      }
    } catch {
      log("Cloudflare input lookup: fail");
    }
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : "probe failed");
  process.exit(1);
});
