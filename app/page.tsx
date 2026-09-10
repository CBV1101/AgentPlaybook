import { AuthRequiredLink } from "@/components/auth-required-link";
import { DiscoveryMap } from "@/components/discovery-map";
import { LocationSearch } from "@/components/location-search";
import { ReportCard } from "@/components/report-card";
import { RequestCard } from "@/components/request-card";
import { getCurrentUser } from "@/lib/auth";
import { getHomeFeed } from "@/lib/queries";

export default async function Home() {
  const [feed, user] = await Promise.all([getHomeFeed(), getCurrentUser()]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-16">
      <section className="text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-rose-800">Crowdsourced reporting</p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-stone-950 sm:text-6xl">
          What do you want to see firsthand?
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">
          Ask someone to go to a place and report what is happening, or look up what firsthand
          reporting already exists there.
        </p>
        <div className="mt-8">
          <LocationSearch />
        </div>
        <div className="mt-4 flex w-full flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <AuthRequiredLink
            href="/reports/new"
            isAuthenticated={Boolean(user)}
            className="rounded-full border border-stone-300 bg-white px-5 py-3 text-center text-sm font-medium text-stone-900 hover:bg-stone-50"
          >
            Publish firsthand report
          </AuthRequiredLink>
          <AuthRequiredLink
            href="/requests/new"
            isAuthenticated={Boolean(user)}
            className="rounded-full bg-rose-800 px-5 py-3 text-center text-sm font-medium text-rose-50 hover:bg-rose-700"
          >
            Request coverage
          </AuthRequiredLink>
        </div>
        <p className="mx-auto mt-6 max-w-xl text-sm text-stone-500">
          Firsthand does not decide whether a claim is true. Discovery is geographic, not an
          engagement ranking.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-stone-900">Places with coverage</h2>
        <p className="mt-2 text-sm text-stone-600">
          The map shows places that currently have firsthand reports or open coverage requests.
        </p>
        <div className="mt-5">
          <DiscoveryMap places={feed.places} />
        </div>
      </section>

      <section className="mt-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-stone-900">
            Most requested coverage
          </h2>
          <p className="text-sm text-stone-500">Open questions, by number of people who want them covered</p>
        </div>
        {feed.requests.length === 0 ? (
          <p className="mt-5 text-stone-600">No coverage requests yet. Be the first to ask.</p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {feed.requests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-14">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-stone-900">
            Latest firsthand reports
          </h2>
          <p className="text-sm text-stone-500">Newest uploads, not a quality score</p>
        </div>
        {feed.reports.length === 0 ? (
          <p className="mt-5 text-stone-600">No firsthand reports have been published yet.</p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {feed.reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
