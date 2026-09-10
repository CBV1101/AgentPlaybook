import Link from "next/link";
import { signOut } from "@/lib/auth-actions";
import { getCurrentUser } from "@/lib/auth";
import { isMockMode } from "@/lib/data/mode";
import { getProfileByUserId } from "@/lib/queries";
import { loginPath, safeNextPath, signupPath } from "@/lib/paths";

type ProfilePageProps = {
  searchParams: Promise<{ notice?: string; next?: string }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const { notice, next } = await searchParams;
  const user = await getCurrentUser();
  const returnTo = safeNextPath(next);
  const profile = user ? await getProfileByUserId(user.id) : null;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-stone-900">Account</h1>
      <p className="mt-2 text-stone-600">
        Manage your sign-in. Your public reporting portfolio is separate from this account page.
      </p>

      {isMockMode() ? (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          You are using a local mock account. Adding Supabase keys later will switch auth to the
          live project without changing these screens.
        </p>
      ) : null}

      {notice === "check-email" ? (
        <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Check your email to confirm the account if your Supabase project requires confirmation.
          {returnTo ? " After you confirm, you can continue where you left off." : null}
        </p>
      ) : null}

      {user && returnTo ? (
        <p className="mt-4 text-sm">
          <Link href={returnTo} className="underline">
            Continue where you left off
          </Link>
        </p>
      ) : null}

      <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        {user ? (
          <div className="space-y-4">
            <p className="text-stone-700">
              Signed in as <span className="font-medium">{user.email}</span>
            </p>
            {profile ? (
              <p className="text-sm text-stone-600">
                Public reporting page:{" "}
                <Link href={`/u/${profile.username}`} className="underline">
                  /u/{profile.username}
                </Link>
              </p>
            ) : null}
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-full border border-stone-300 px-4 py-2 text-sm hover:bg-stone-50"
              >
                Log out
              </button>
            </form>
          </div>
        ) : (
          <p className="text-stone-700">
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
        )}
      </section>
    </main>
  );
}
