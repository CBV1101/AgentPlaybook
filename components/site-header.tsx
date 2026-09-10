import Link from "next/link";
import { AuthRequiredLink } from "@/components/auth-required-link";
import { getCurrentUser } from "@/lib/auth";
import { getProfileByUserId } from "@/lib/queries";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const profile = user ? await getProfileByUserId(user.id) : null;
  const profileHref = profile ? `/u/${profile.username}` : "/profile";

  return (
    <header className="border-b border-stone-200 bg-[#fbf8f2]/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="font-[family-name:var(--font-display)] text-xl tracking-tight text-stone-900">
          Firsthand
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-3 text-sm text-stone-700 sm:gap-4">
          <Link href="/" className="hover:text-stone-950">
            Home
          </Link>
          <Link href="/browse" className="hover:text-stone-950">
            Browse
          </Link>
          <AuthRequiredLink
            href="/reports/new"
            isAuthenticated={Boolean(user)}
            className="rounded-full border border-stone-300 px-3 py-1.5 hover:bg-stone-50"
          >
            Publish firsthand report
          </AuthRequiredLink>
          <AuthRequiredLink
            href="/requests/new"
            isAuthenticated={Boolean(user)}
            className="rounded-full bg-rose-800 px-3 py-1.5 text-rose-50 hover:bg-rose-700"
          >
            Request coverage
          </AuthRequiredLink>
          {user ? (
            <>
              {profile?.role === "admin" ? (
                <Link href="/admin/moderation" className="hover:text-stone-950">
                  Moderation
                </Link>
              ) : null}
              <Link
                href={profileHref}
                className="rounded-full bg-stone-900 px-3 py-1.5 text-stone-50 hover:bg-stone-800"
              >
                Profile
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-stone-950">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-stone-900 px-3 py-1.5 text-stone-50 hover:bg-stone-800"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
