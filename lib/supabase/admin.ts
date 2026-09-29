import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/database.types";

export function getSupabaseServiceRoleKey(env: Record<string, string | undefined> = process.env) {
  return env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
}

export function createServiceRoleClient() {
  const publicEnv = getSupabasePublicEnv();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!publicEnv || !serviceRoleKey) {
    throw new Error(
      "Firsthand configuration error: SUPABASE_SERVICE_ROLE_KEY is required on the server to deliver private report photos.",
    );
  }
  return createClient<Database>(publicEnv.url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
