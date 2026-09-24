import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function requireUploadUser() {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, response: NextResponse.json({ error: "Sign in to upload media." }, { status: 401 }) };
  }
  return { user, response: null };
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
