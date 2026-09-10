"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/data/mode";
import { mockSignIn, mockSignUp } from "@/lib/data/mock/repository";
import { clearMockUser, setMockUser } from "@/lib/data/mock/session";
import { loginPath, safeNextPath, signupPath } from "@/lib/paths";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function withAuthError(href: string, error: string) {
  return `${href}${href.includes("?") ? "&" : "?"}error=${encodeURIComponent(error)}`;
}

async function siteOrigin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

export async function signUp(formData: FormData) {
  const next = safeNextPath(formString(formData, "next"));
  const email = formString(formData, "email");
  const password = formString(formData, "password");

  if (!email || !password) {
    redirect(withAuthError(signupPath(next), "missing"));
  }

  if (isMockMode()) {
    try {
      const user = await mockSignUp(email, password);
      await setMockUser(user.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create the account.";
      redirect(withAuthError(signupPath(next), message));
    }
    redirect(next ?? "/");
  }

  if (!isSupabaseConfigured()) {
    redirect(withAuthError(signupPath(next), "supabase"));
  }

  const origin = await siteOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`,
    },
  });

  if (error) {
    redirect(withAuthError(signupPath(next), error.message));
  }

  if (data.session) {
    redirect(next ?? "/");
  }

  redirect(next ? `/profile?notice=check-email&next=${encodeURIComponent(next)}` : "/profile?notice=check-email");
}

export async function signIn(formData: FormData) {
  const next = safeNextPath(formString(formData, "next"));
  const email = formString(formData, "email");
  const password = formString(formData, "password");

  if (!email || !password) {
    redirect(withAuthError(loginPath(next), "missing"));
  }

  if (isMockMode()) {
    try {
      const user = await mockSignIn(email, password);
      await setMockUser(user.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not log in.";
      redirect(withAuthError(loginPath(next), message));
    }
    redirect(next ?? "/");
  }

  if (!isSupabaseConfigured()) {
    redirect(withAuthError(loginPath(next), "supabase"));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(withAuthError(loginPath(next), error.message));
  }

  redirect(next ?? "/");
}

export async function signOut() {
  if (isMockMode()) {
    await clearMockUser();
    redirect("/");
  }

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/");
}
