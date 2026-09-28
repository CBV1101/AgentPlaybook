import Link from "next/link";
import { InvestigationCard } from "@/components/investigation-card";
import { LocationLabel } from "@/components/ui/badge";
import { EmptyState, Page } from "@/components/ui/page";
import { RelativeTime } from "@/components/relative-time";
import { listPublishedInvestigations } from "@/lib/queries";
import { applyPublishedInvestigationsShowcase } from "@/lib/investigation-showcase";

export default async function InvestigationsIndexPage() {
  const real = await listPublishedInvestigations();
  const { investigations, usingShowcase } = applyPublishedInvestigationsShowcase(real);
  const latest = investigations;

  return (
    <Page>
      {usingShowcase ? (
        <p className="mb-4 text-xs font-medium text-geo">
          Development showcase — fictional investigations for layout evaluation. Not stored in Supabase
          and never shown in production.
        </p>
      ) : null}
      <p className="fh-kicker">Investigations</p>
      <h1 className="mt-2 fh-title">Stories unfolding firsthand.</h1>
      <p className="mt-3 max-w-2xl fh-lede">
        Follow ongoing reporting from people documenting a story over time.
      </p>

      {investigations.length === 0 ? (
        <EmptyState title="No published investigations yet.">
          <p className="mt-2 fh-body">
            As reporters organize ongoing coverage into investigations, they&apos;ll appear here.
          </p>
        </EmptyState>
      ) : (
        <>
          <section className="mt-10">
            <p className="fh-kicker">Featured / active investigations</p>
            <h2 className="mt-1 fh-section">Recently updated</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {investigations.map((investigation) => (
                <InvestigationCard key={investigation.id} investigation={investigation} />
              ))}
            </div>
          </section>

          <section className="mt-12">
            <p className="fh-kicker">Latest updates</p>
            <h2 className="mt-1 fh-section">Newest parts in ongoing stories</h2>
            <ul className="mt-5 divide-y divide-line">
              {latest.map((investigation) => (
                <li key={`update-${investigation.id}`} className="py-4">
                  <Link href={investigation.href} className="flex gap-4 hover:bg-canvas fh-focus">
                    {investigation.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={investigation.coverUrl}
                        alt=""
                        className="h-20 w-32 shrink-0 object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-32 shrink-0 items-center justify-center bg-canvas">
                        <span className="fh-label">Investigation</span>
                      </div>
                    )}
                    <span className="min-w-0">
                      <span className="block font-medium text-ink">{investigation.title}</span>
                      <span className="mt-1 block fh-kicker">Part {investigation.partCount}</span>
                      <span className="mt-1 block fh-meta">
                        Updated <RelativeTime value={investigation.updatedAt} className="inline fh-meta" />
                      </span>
                      <span className="mt-1 block fh-meta">
                        {investigation.reporterName}
                        {investigation.location ? (
                          <>
                            {" · "}
                            <LocationLabel
                              city={investigation.location.city}
                              country={investigation.location.country}
                              size="inline"
                            />
                          </>
                        ) : null}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </Page>
  );
}
