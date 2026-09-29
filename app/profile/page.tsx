import Link from "next/link";
import { signOut } from "@/lib/auth-actions";
import { getCurrentUser } from "@/lib/auth";
import { ReporterProfileForm } from "@/components/reporter-profile-form";
import { Button, buttonClass } from "@/components/ui/button";
import { Notice, Page, Section } from "@/components/ui/page";
import { isMockMode } from "@/lib/data/mode";
import { getProfileByUserId } from "@/lib/queries";
import { loginPath, safeNextPath, signupPath } from "@/lib/paths";
import { isReporterProfileComplete, type ReporterTopic } from "@/lib/profile";

type ProfilePageProps = {
  searchParams: Promise<{ notice?: string; next?: string; error?: string }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const { notice, next, error } = await searchParams;
  const user = await getCurrentUser();
  const returnTo = safeNextPath(next);
  const profile = user ? await getProfileByUserId(user.id) : null;
  const setup = Boolean(profile && !isReporterProfileComplete(profile));

  return (
    <Page width="narrow">
      <h1 className="fh-title">
        {user && setup ? "Set up your reporter profile" : "Profile"}
      </h1>
      <p className="mt-2 fh-lede">
        {user && setup
          ? "About a minute. Add a name, username, and home place so people can find your public reporter page."
          : "Your public reporter page is separate from account settings."}
      </p>

      {isMockMode() ? (
        <Notice>
          You are using a local mock account (FIRSTHAND_USE_MOCK). Production never uses this store.
        </Notice>
      ) : null}

      {notice === "check-email" ? (
        <Notice>
          Check your email and open the confirmation link in this browser. After you confirm, you
          should land on this profile page to finish setup.
          {returnTo ? " You can then continue where you left off." : null}
        </Notice>
      ) : null}

      {notice === "setup" ? (
        <Notice tone="ok">
          Account created. Finish the public reporter details below, then you can publish or go live.
        </Notice>
      ) : null}

      {notice === "incomplete" ? (
        <Notice>
          Add a display name, username, home city, and home country before publishing a report or going
          live. You can keep browsing in the meantime.
        </Notice>
      ) : null}

      {user && returnTo && notice !== "incomplete" ? (
        <p className="mt-4 text-sm">
          <Link href={returnTo} className="underline">
            Continue where you left off
          </Link>
        </p>
      ) : null}

      {user && !profile ? (
        <Section>
          <p className="fh-body">
            You are signed in as <span className="font-medium">{user.email || "this account"}</span>,
            but a reporter profile has not been created yet. Refresh this page. If it still fails,
            sign out and sign in once more before creating coverage or reports.
          </p>
        </Section>
      ) : user && profile ? (
        <>
          <Section kicker="Public profile" title={setup ? "Reporter details" : "Edit public profile"}>
            <p className="mt-2 fh-meta">
              This appears on{" "}
              <Link href={`/u/${profile.username}`} className="underline">
                /u/{profile.username}
              </Link>
              . Report counts, places covered, followers, and support stay activity-based.
            </p>
            <div className="mt-6">
              <ReporterProfileForm
                username={profile.username}
                displayName={profile.display_name}
                bio={profile.bio ?? ""}
                homeCity={profile.home_city ?? ""}
                homeCountry={profile.home_country ?? ""}
                avatarUrl={profile.avatar_url}
                topics={(profile.topics ?? []) as ReporterTopic[]}
                nextPath={returnTo}
                error={error}
              />
            </div>
          </Section>

          <Section kicker="Account & settings" title="Signed in">
            <p className="mt-2 fh-body">
              Email: <span className="font-medium">{user.email}</span>
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/profile/investigations" className={buttonClass("secondary")}>
                Investigations
              </Link>
              <Link href="/notifications" className={buttonClass("secondary")}>
                Notifications
              </Link>
              <Link href="/profile/licensing" className={buttonClass("secondary")}>
                Licensing
              </Link>
            </div>
            <form action={signOut} className="mt-6">
              <Button type="submit" variant="secondary">
                Log out
              </Button>
            </form>
          </Section>
        </>
      ) : (
        <Section>
          <p className="fh-body">
            You are not signed in.{" "}
            <Link href={loginPath(returnTo)} className="underline">
              Log in
            </Link>{" "}
            or{" "}
            <Link href={signupPath(returnTo)} className="underline">
              create an account
            </Link>
            .
          </p>
        </Section>
      )}
    </Page>
  );
}
