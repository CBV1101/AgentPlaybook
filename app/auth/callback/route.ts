import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { loginPath, safeNextPath } from "@/lib/paths";

const OTP_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

function isOtpType(value: string | null): value is EmailOtpType {
  return Boolean(value && OTP_TYPES.includes(value as EmailOtpType));
}

function withAuthError(href: string, error: string) {
  return `${href}${href.includes("?") ? "&" : "?"}error=${encodeURIComponent(error)}`;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeNextPath(searchParams.get("next")) ?? "/profile?notice=setup";
  const providerError = searchParams.get("error_description") ?? searchParams.get("error");

  if (providerError) {
    return NextResponse.redirect(new URL(withAuthError(loginPath(next), providerError), origin));
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL(loginPath(next), origin));
  }

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL(withAuthError(loginPath(next), error.message), origin));
    }
    return NextResponse.redirect(new URL(next, origin));
  }

  if (tokenHash && isOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) {
      return NextResponse.redirect(new URL(withAuthError(loginPath(next), error.message), origin));
    }
    return NextResponse.redirect(new URL(next, origin));
  }

  return NextResponse.redirect(
    new URL(
      withAuthError(
        loginPath(next),
        "Could not complete email confirmation. Confirm the link, then log in.",
      ),
      origin,
    ),
  );
}
