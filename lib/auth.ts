import type { AppUser } from "@/lib/auth-user";
import { isMockMode } from "@/lib/data/mode";
import { getMockUser } from "@/lib/data/mock/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentUser(): Promise<AppUser | null> {
  if (isMockMode()) {
    return getMockUser();
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user?.email) {
    return user ? { id: user.id, email: "" } : null;
  }
  return { id: user.id, email: user.email };
}
