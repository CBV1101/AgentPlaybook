import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { requireSupabasePublicEnv } from "@/lib/supabase/env";

/** Cookie-free anon client for public reads. Session JWTs must not empty the live catalog. */
export function createPublicAnonClient() {
  const { url, anonKey } = requireSupabasePublicEnv();
  return createSupabaseJsClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function createClient() {
  const { url, anonKey } = requireSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component. Session refresh is handled in proxy.ts.
        }
      },
    },
  });
}
