import { AuthRequiredLink } from "@/components/auth-required-link";
import { CoverageWantedCard } from "@/components/coverage-wanted-card";
import { EmptyState, Section } from "@/components/ui/page";
import type { CoverageRequest } from "@/lib/types";
import Link from "next/link";

export function CoverageWantedSection({
  requests,
  signedIn,
}: {
  requests: CoverageRequest[];
  signedIn: boolean;
}) {
  return (
    <Section
      kicker="Coverage wanted"
      title="What people want to see right now"
      action={
        <Link href="/wanted" className="shrink-0 text-sm text-brand underline underline-offset-2">
          See all
        </Link>
      }
    >
      {requests.length === 0 ? (
        <EmptyState title="No open coverage requests yet.">
          <p className="mt-2">
            <AuthRequiredLink href="/requests/new" isAuthenticated={signedIn} className="text-sm text-ink underline underline-offset-2">
              Ask someone to cover a place
            </AuthRequiredLink>
          </p>
        </EmptyState>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {requests.slice(0, 6).map((request) => (
            <CoverageWantedCard key={request.id} request={request} isAuthenticated={signedIn} compact />
          ))}
        </div>
      )}
    </Section>
  );
}
