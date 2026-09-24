import { AuthRequiredLink } from "@/components/auth-required-link";
import { HeroGlobe } from "@/components/hero-globe";
import { LocationSearch } from "@/components/location-search";

export function HomeHero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="fh-hero-geo relative overflow-hidden rounded-2xl border border-geo/20 px-4 py-5 sm:px-8 sm:py-8">
      <div className="relative grid items-center lg:grid-cols-[minmax(0,1.2fr)_minmax(17rem,0.8fr)] lg:gap-12">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-start gap-3 lg:block">
            <div className="min-w-0 flex-1">
              <p className="fh-kicker">Firsthand</p>
              <h1 className="fh-slogan mt-2">The world, reported by you.</h1>
            </div>
            <div className="w-[5.75rem] shrink-0 sm:w-28 lg:hidden">
              <HeroGlobe id="hero-mobile" />
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted sm:text-base sm:leading-7">
            See what&apos;s happening around the world from the people who are actually there.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            What&apos;s actually happening there? Ask someone who&apos;s there.
          </p>
          <p className="mt-5 fh-kicker">What do you want to see firsthand?</p>
          <div className="mt-2">
            <LocationSearch />
          </div>
          <p className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <AuthRequiredLink href="/requests/new" isAuthenticated={signedIn} className="font-medium text-brand underline underline-offset-2">
              Request coverage
            </AuthRequiredLink>
            <AuthRequiredLink href="/live/new" isAuthenticated={signedIn} className="font-medium text-live underline underline-offset-2">
              Go live
            </AuthRequiredLink>
            <AuthRequiredLink href="/reports/new" isAuthenticated={signedIn} className="text-ink underline underline-offset-2">
              Publish a report
            </AuthRequiredLink>
          </p>
        </div>
        <div className="hidden lg:block">
          <HeroGlobe id="hero-desktop" />
        </div>
      </div>
    </section>
  );
}
