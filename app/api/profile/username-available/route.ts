import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isUsernameAvailable } from "@/lib/data";
import { normalizeUsername, usernameValidationError } from "@/lib/profile";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to check a username." }, { status: 401 });
  }

  const url = new URL(request.url);
  const username = normalizeUsername(url.searchParams.get("username") ?? "");
  const invalid = usernameValidationError(username);
  if (invalid) {
    return NextResponse.json({ valid: false, available: false, message: invalid });
  }

  const available = await isUsernameAvailable(username, user.id);
  return NextResponse.json({
    valid: true,
    available,
    message: available ? "This username is available." : "That username is already taken.",
  });
}
