import { AuthRequiredLink } from "@/components/auth-required-link";
import { LocationSearch } from "@/components/location-search";

export function HomeHero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="fh-geo-wash -mx-4 rounded-lg px-4 py-5 sm:-mx-0 sm:px-5 sm:py-6">
      <h1 className="fh-hero">What do you want to see firsthand?</h1>
      <p className="mt-2 max-w-xl text-sm text-muted sm:text-base">
        See what&apos;s happening from people who are actually there.
      </p>
      <div className="mt-4 max-w-2xl">
        <LocationSearch />
      </div>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <AuthRequiredLink href="/requests/new" isAuthenticated={signedIn} className="text-ink underline underline-offset-2">
          Request coverage
        </AuthRequiredLink>
        <AuthRequiredLink href="/live/new" isAuthenticated={signedIn} className="text-ink underline underline-offset-2">
          Go live
        </AuthRequiredLink>
        <AuthRequiredLink href="/reports/new" isAuthenticated={signedIn} className="text-ink underline underline-offset-2">
          Publish a report
        </AuthRequiredLink>
      </p>
    </section>
  );
}
