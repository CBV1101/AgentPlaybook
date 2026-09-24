import { redirect } from "next/navigation";
import { getProfileByUserId } from "@/lib/data";
import type { Profile } from "@/lib/database.types";
import { reporterProfileSetupPath } from "@/lib/paths";
import { isReporterProfileComplete } from "@/lib/profile";
import { requireUser } from "@/lib/require-user";

export async function requireCompleteReporterProfile(nextPath: string): Promise<{
  user: Awaited<ReturnType<typeof requireUser>>;
  profile: Profile;
}> {
  const user = await requireUser(nextPath);
  const profile = await getProfileByUserId(user.id);
  if (!profile || !isReporterProfileComplete(profile)) {
    redirect(reporterProfileSetupPath(nextPath));
  }
  return { user, profile };
}
