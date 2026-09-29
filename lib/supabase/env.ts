export type SupabaseEnvSource = {
  NODE_ENV?: string;
  FIRSTHAND_USE_MOCK?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
};

export type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

function read(env: SupabaseEnvSource, key: keyof SupabaseEnvSource) {
  return env[key]?.trim() ?? "";
}

function publicSupabaseUrl(env: SupabaseEnvSource) {
  return read(env, "NEXT_PUBLIC_SUPABASE_URL");
}

function publicSupabaseKey(env: SupabaseEnvSource) {
  return read(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY") || read(env, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
}

export function isValidSupabaseUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function getSupabasePublicEnv(env: SupabaseEnvSource = process.env): SupabasePublicEnv | null {
  const url = publicSupabaseUrl(env);
  const anonKey = publicSupabaseKey(env);

  if (!url || !anonKey || !isValidSupabaseUrl(url)) {
    return null;
  }

  return { url, anonKey };
}

export function isSupabaseConfigured(env: SupabaseEnvSource = process.env): boolean {
  return getSupabasePublicEnv(env) !== null;
}

export function missingProductionSupabaseConfig(env: SupabaseEnvSource = process.env): string[] {
  const messages: string[] = [];
  const url = publicSupabaseUrl(env);
  const anonKey = publicSupabaseKey(env);

  if (!url) {
    messages.push("NEXT_PUBLIC_SUPABASE_URL is required.");
  } else if (!isValidSupabaseUrl(url)) {
    messages.push("NEXT_PUBLIC_SUPABASE_URL is invalid.");
  }

  if (!anonKey) {
    messages.push(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required.",
    );
  }

  return messages;
}

export function requireSupabasePublicEnv(env: SupabaseEnvSource = process.env): SupabasePublicEnv {
  if (env.NODE_ENV === "production") {
    const missing = missingProductionSupabaseConfig(env);
    if (missing.length > 0) {
      throw new Error(`Firsthand production configuration error: ${missing.join(" ")}`);
    }
  }

  const resolved = getSupabasePublicEnv(env);

  if (!resolved) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY), or set FIRSTHAND_USE_MOCK=1 in development.",
    );
  }

  return resolved;
}
