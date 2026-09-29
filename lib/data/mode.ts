import {
  isSupabaseConfigured,
  missingProductionSupabaseConfig,
  type SupabaseEnvSource,
} from "@/lib/supabase/env";

export type DataSource = "mock" | "supabase";
export type DataSourceEnv = SupabaseEnvSource;

function nodeEnv(env: DataSourceEnv) {
  return env.NODE_ENV?.trim() ?? "";
}

export function isProductionEnv(env: DataSourceEnv = process.env) {
  return nodeEnv(env) === "production";
}

export function isExplicitMockEnabled(env: DataSourceEnv = process.env) {
  const value = env.FIRSTHAND_USE_MOCK?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

/**
 * Presentation showcase (fictional live grids, investigations, coverage) is
 * development-only. Production, test, and missing-Supabase states never qualify.
 */
export function canUseShowcaseData(env: DataSourceEnv = process.env) {
  if (isProductionEnv(env)) {
    return false;
  }
  return nodeEnv(env) === "development";
}

/**
 * Fail closed: a production process without public Supabase configuration must
 * not start, render, or serve mock/showcase data.
 */
export function assertProductionSupabaseConfig(env: DataSourceEnv = process.env) {
  if (!isProductionEnv(env)) {
    return;
  }

  const missing = missingProductionSupabaseConfig(env);
  if (missing.length === 0) {
    return;
  }

  throw new Error(
    `Firsthand production configuration error: ${missing.join(" ")}`,
  );
}

/**
 * Repository/network failures must never switch the data source to mock.
 * Callers should surface an error or empty state from the real repository.
 */
export function allowMockFallbackOnFailure() {
  return false;
}

export function getDataSource(env: DataSourceEnv = process.env): DataSource {
  assertProductionSupabaseConfig(env);

  if (isProductionEnv(env)) {
    return "supabase";
  }

  if (isExplicitMockEnabled(env)) {
    return "mock";
  }

  if (isSupabaseConfigured(env)) {
    return "supabase";
  }

  if (nodeEnv(env) === "test") {
    return "mock";
  }

  throw new Error(
    "Firsthand development configuration error: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY), or set FIRSTHAND_USE_MOCK=1 to use the local mock store. Missing Supabase configuration does not enable mock mode by itself.",
  );
}

export function isMockMode(env: DataSourceEnv = process.env) {
  return getDataSource(env) === "mock";
}
