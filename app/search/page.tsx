import Link from "next/link";
import { CoverageWantedCard } from "@/components/coverage-wanted-card";
import { EventCard } from "@/components/event-card";
import { ReportCard } from "@/components/report-card";
import { ReporterPreview } from "@/components/reporter-preview";
import { SearchBox } from "@/components/search-box";
import { EmptyState, Page, Section, TabLink, Tabs } from "@/components/ui/page";
import { getCurrentUser } from "@/lib/auth";
import { searchFirsthand } from "@/lib/queries";
import {
  parseSearchQuery,
  searchHref,
  searchResultCount,
  SEARCH_KINDS,
  SEARCH_RANGES,
  type SearchKind,
  type SearchResults,
} from "@/lib/search";

type SearchPageProps = {
  searchParams: Promise<{ q?: string; kind?: string; range?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const raw = await searchParams;
  const query = parseSearchQuery(raw);
  const user = await getCurrentUser();
  const results = query.q ? await searchFirsthand(query, user?.id) : null;
  const total = results ? searchResultCount(results) : 0;
  const showRange = query.kind === "all" || query.kind === "reports" || query.kind === "events";

  return (
    <Page>
      <p className="fh-kicker">Search</p>
      <h1 className="mt-3 fh-title">What firsthand information do we have about this?</h1>
      <p className="mt-2 max-w-2xl fh-lede">
        Search places, events, firsthand reports, coverage requests, and reporters. This is text
        search, not a judgment about what happened.
      </p>
      <div className="mt-6">
        <SearchBox initialValue={query.q} autoFocus={!query.q} />
      </div>

      <Tabs className="mt-8">
        {SEARCH_KINDS.map((item) => (
          <TabLink key={item.id} href={searchHref(query, { kind: item.id })} active={query.kind === item.id}>
            {item.label}
          </TabLink>
        ))}
      </Tabs>

      {showRange ? (
        <form action="/search" method="get" className="mt-4 flex flex-wrap items-center gap-2">
          {query.q ? <input type="hidden" name="q" value={query.q} /> : null}
          {query.kind !== "all" ? <input type="hidden" name="kind" value={query.kind} /> : null}
          <label htmlFor="search-range" className="fh-label">
            Time
          </label>
          <select id="search-range" name="range" defaultValue={query.timeRange} className="fh-select mt-0 h-10 w-auto">
            {SEARCH_RANGES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <button type="submit" className="fh-meta underline">
            Apply
          </button>
        </form>
      ) : null}

      {!query.q ? (
        <EmptyState title="Type a place, event, or question to see what Firsthand already has." />
      ) : total === 0 ? (
        <EmptyState title={`No firsthand results for “${query.q}” yet.`} />
      ) : (
        <div className="mt-2">
          <p className="mt-4 fh-meta">
            {total} {total === 1 ? "result" : "results"} for “{query.q}”
          </p>
          <SearchGroups results={results!} kind={query.kind} isAuthenticated={Boolean(user)} />
        </div>
      )}
    </Page>
  );
}

function SearchGroups({
  results,
  kind,
  isAuthenticated,
}: {
  results: SearchResults;
  kind: SearchKind;
  isAuthenticated: boolean;
}) {
  const show = (group: SearchKind) => kind === "all" || kind === group;

  return (
    <>
      {show("places") && results.places.length > 0 ? (
        <Section title="Places">
          <ul className="mt-4">
            {results.places.map((place) => (
              <li key={`${place.kind}-${place.id}`} className="fh-list-row">
                <Link href={place.href} className="block">
                  <p className="font-medium text-ink">{place.title}</p>
                  <p className="mt-1 fh-meta">
                    {place.kind === "country" ? "Country" : place.kind === "city" ? "City" : "Place"}
                    {place.subtitle ? ` · ${place.subtitle}` : ""}
                    {` · ${place.reportCount} firsthand ${place.reportCount === 1 ? "report" : "reports"} · ${place.openRequestCount} open ${place.openRequestCount === 1 ? "request" : "requests"}`}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {show("events") && results.events.length > 0 ? (
        <Section title="Events">
          <div className="fh-grid">
            {results.events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </Section>
      ) : null}

      {show("reports") && results.reports.length > 0 ? (
        <Section title="Firsthand reports">
          <div className="fh-grid">
            {results.reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        </Section>
      ) : null}

      {show("requests") && results.requests.length > 0 ? (
        <Section title="Coverage wanted">
          <div className="fh-grid">
            {results.requests.map((request) => (
              <CoverageWantedCard key={request.id} request={request} isAuthenticated={isAuthenticated} compact />
            ))}
          </div>
        </Section>
      ) : null}

      {show("reporters") && results.reporters.length > 0 ? (
        <Section title="Reporters">
          <ul className="mt-4 divide-y divide-line">
            {results.reporters.map((reporter) => (
              <li key={reporter.id} className="py-3">
                <ReporterPreview
                  name={reporter.displayName}
                  username={reporter.username}
                  avatarUrl={reporter.avatarUrl}
                  href={`/u/${reporter.username}`}
                  meta={`${reporter.context} · ${reporter.reportCount} ${reporter.reportCount === 1 ? "report" : "reports"}`}
                />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}
