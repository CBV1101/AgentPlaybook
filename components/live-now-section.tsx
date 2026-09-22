import { AuthRequiredLink } from "@/components/auth-required-link";
import { FeaturedLiveStream, LiveStreamCard } from "@/components/featured-live-stream";
import { EmptyState, Section } from "@/components/ui/page";
import type { RankedLiveStream } from "@/lib/live-rank";

export function LiveNowSection({
  ranked,
  signedIn,
}: {
  ranked: RankedLiveStream[];
  signedIn: boolean;
}) {
  const featured = ranked[0];
  const secondary = ranked.slice(1, 5);

  return (
    <Section kicker="Live now" title={featured ? "Live firsthand reporting" : "Nothing live right now"}>
      {featured ? (
        <div className="mt-4 space-y-4">
          <FeaturedLiveStream stream={featured.stream} demandCount={featured.demandCount} />
          {secondary.length > 0 ? (
            <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
              {secondary.map((item) => (
                <LiveStreamCard
                  key={item.stream.id}
                  stream={item.stream}
                  demandCount={item.demandCount}
                  compact
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyState title="No one is broadcasting a live firsthand report at this moment.">
          <p className="mt-2">
            <AuthRequiredLink href="/live/new" isAuthenticated={signedIn} className="text-sm text-ink underline underline-offset-2">
              Go live from where you are
            </AuthRequiredLink>
          </p>
        </EmptyState>
      )}
    </Section>
  );
}
