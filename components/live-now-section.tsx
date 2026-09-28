import Link from "next/link";
import { AuthRequiredLink } from "@/components/auth-required-link";
import { LiveStreamGrid } from "@/components/live-stream-grid";
import { EmptyState } from "@/components/ui/page";
import type { RankedLiveStream } from "@/lib/live-rank";

export function LiveNowSection({
  ranked,
  signedIn,
}: {
  ranked: RankedLiveStream[];
  signedIn: boolean;
}) {
  return (
    <section className="fh-live-section mt-10" data-home-live="grid">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="fh-kicker text-live">Live now</p>
          <h2 className="mt-1 fh-section">
            {ranked[0] ? "People around the world are live right now." : "Nothing live right now"}
          </h2>
        </div>
        {ranked[0] ? (
          <Link href="/browse" className="shrink-0 text-sm font-medium text-ink underline underline-offset-2">
            View all live →
          </Link>
        ) : null}
      </div>
      {ranked[0] ? (
        <LiveStreamGrid streams={ranked} showMore={false} />
      ) : (
        <EmptyState title="No one is broadcasting a live firsthand report at this moment.">
          <p className="mt-2">
            <AuthRequiredLink href="/live/new" isAuthenticated={signedIn} className="text-sm text-ink underline underline-offset-2">
              Go live from where you are
            </AuthRequiredLink>
          </p>
        </EmptyState>
      )}
    </section>
  );
}
