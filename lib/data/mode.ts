import { isSupabaseConfigured } from "@/lib/supabase/env";

export type DataSource = "mock" | "supabase";

export function getDataSource(): DataSource {
  return isSupabaseConfigured() ? "supabase" : "mock";
}

export function isMockMode() {
  return getDataSource() === "mock";
}
