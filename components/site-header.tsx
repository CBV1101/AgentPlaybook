import { ProfileSetupBanner } from "@/components/profile-setup-banner";
import { SiteNav } from "@/components/site-nav";
import { getCurrentUser } from "@/lib/auth";
import { unreadNotificationCount } from "@/lib/data";
import { getProfileByUserId } from "@/lib/queries";
import { isReporterProfileComplete } from "@/lib/profile";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const profile = user ? await getProfileByUserId(user.id) : null;
  const unread = user ? await unreadNotificationCount(user.id) : 0;

  return (
    <>
      <SiteNav
        isAuthenticated={Boolean(user)}
        isAdmin={profile?.role === "admin"}
        unread={unread}
        username={profile?.username ?? null}
        displayName={profile?.display_name ?? null}
        avatarUrl={profile?.avatar_url ?? null}
      />
      {user ? <ProfileSetupBanner show={!isReporterProfileComplete(profile)} /> : null}
    </>
  );
}
