import { getCurrentUser } from "@/lib/auth";
import type { AppUser } from "@/lib/auth-user";
import { loginPath } from "@/lib/paths";
import { redirect } from "next/navigation";

export async function requireUser(nextPath: string): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(loginPath(nextPath));
  }
  return user;
}
