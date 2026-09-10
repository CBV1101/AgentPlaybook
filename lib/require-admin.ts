import { getCurrentUser } from "@/lib/auth";
import { getProfileByUserId } from "@/lib/data";
import { loginPath } from "@/lib/paths";
import { redirect } from "next/navigation";

export async function requireAdmin(nextPath = "/admin/moderation") {
  const user = await getCurrentUser();
  if (!user) {
    redirect(loginPath(nextPath));
  }

  const profile = await getProfileByUserId(user.id);
  if (profile?.role !== "admin") {
    redirect("/");
  }

  return { user, profile };
}

export async function currentUserIsAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    return false;
  }
  const profile = await getProfileByUserId(user.id);
  return profile?.role === "admin";
}
