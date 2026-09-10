import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthRequiredLink } from "@/components/auth-required-link";
import { InterestButton } from "@/components/interest-button";
import { MapPreview } from "@/components/map-preview";
import { PlaceArchiveControls } from "@/components/place-archive-controls";
import { ReportCard } from "@/components/report-card";
import { RequestCard } from "@/components/request-card";
import { getCurrentUser } from "@/lib/auth";
import { filterAndSortPlaceReports, parsePlaceArchiveFilters } from "@/lib/data/discovery";
import { getPlacePageData } from "@/lib/queries";

type PlacePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string | string[]; kind?: string | string[]; usage?: string | string[] }>;
};

export default async function PlacePage({ params, searchParams }: PlacePageProps) {
  const { slug } = await params;
  const rawFilters = await searchParams;
  const filters = parsePlaceArchiveFilters(rawFilters);
  const user = await getCurrentUser();
  const page = await getPlacePageData(slug, user?.id);

  if (!page) {
    notFound();
  }

  const title = page.location.place || page.location.city;
  const latestReports = [...page.reports]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 3);
  const historicalReports = filterAndSortPlaceReports(page.reports, filters);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <p className="text-sm uppercase tracking-[0.2em] text-rose-800">Place archive</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-stone-950">
        {title}
        {page.location.place ? (
          <span className="block text-2xl font-normal text-stone-600 sm:inline sm:text-3xl">
            {", "}
            {page.location.city}
          </span>
        ) : null}
      </h1>
      <p className="mt-2 text-stone-600">
        {page.location.city}, {page.location.country}
      </p>

      <nav className="mt-6 flex gap-3 overflow-x-auto text-sm text-stone-700">
        <a href="#overview" className="whitespace-nowrap underline">
          Overview
        </a>
        <a href="#open-questions" className="whitespace-nowrap underline">
          Open questions
        </a>
        <a href="#latest" className="whitespace-nowrap underline">
          Latest reports
        </a>
        <a href="#archive" className="whitespace-nowrap underline">
          Historical reports
        </a>
      </nav>

      <section id="overview" className="mt-8 scroll-mt-24">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-stone-900">Overview</h2>
        <p className="mt-2 max-w-3xl text-stone-600">
          This is a permanent archive of firsthand reporting and coverage requests for {page.location.label}.
          It answers what reporting exists from this place, and what people are asking someone to cover
          here. Firsthand does not verify whether a report is true.
        </p>
        <div className="mt-6 max-w-3xl">
          <MapPreview
            latitude={page.location.latitude}
            longitude={page.location.longitude}
            label={page.location.label}
          />
        </div>
        <dl className="mt-8 grid max-w-xl gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <dt className="text-xs uppercase tracking-wide text-stone-500">Open coverage requests</dt>
            <dd className="mt-1 text-2xl text-stone-900">{page.openRequestCount}</dd>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <dt className="text-xs uppercase tracking-wide text-stone-500">Firsthand reports</dt>
            <dd className="mt-1 text-2xl text-stone-900">{page.reportCount}</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <AuthRequiredLink
            href="/reports/new"
            isAuthenticated={Boolean(user)}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
          >
            Report from this location
          </AuthRequiredLink>
          <AuthRequiredLink
            href="/requests/new"
            isAuthenticated={Boolean(user)}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-rose-800 px-4 py-2 text-sm font-medium text-rose-50 hover:bg-rose-700"
          >
            Request coverage here
          </AuthRequiredLink>
        </div>
      </section>

      <section id="open-questions" className="mt-12 scroll-mt-24">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-stone-900">Open questions</h2>
        <p className="mt-2 text-stone-600">What people are asking someone to cover here.</p>
        {page.openRequests.length === 0 ? (
          <p className="mt-4 text-stone-600">There are no open requests for this place.</p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {page.openRequests.map((request) => (
              <div key={request.id} className="space-y-3">
                <RequestCard request={request} />
                <InterestButton
                  requestId={request.id}
                  nextPath={`/requests/${request.id}`}
                  isAuthenticated={Boolean(user)}
                  alreadyInterested={Boolean(request.currentUserInterested)}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section id="latest" className="mt-12 scroll-mt-24">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-stone-900">
          Latest firsthand reports
        </h2>
        <p className="mt-2 text-stone-600">The most recently uploaded reports from this place.</p>
        {latestReports.length === 0 ? (
          <p className="mt-4 text-stone-600">No firsthand reports from this place yet.</p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {latestReports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </section>

      <section id="archive" className="mt-12 scroll-mt-24">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-stone-900">Historical reports</h2>
        <p className="mt-2 text-stone-600">
          The full reporting record for this place. Sort by time or by whether a report answered a
          highly requested question. There is no algorithmic ranking.
        </p>
        <div className="mt-5">
          <PlaceArchiveControls slug={slug} filters={filters} />
        </div>
        {historicalReports.length === 0 ? (
          <p className="mt-4 text-stone-600">No reports match these filters.</p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {historicalReports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </section>

      <p className="mt-10 text-sm text-stone-500">
        Looking for another place?{" "}
        <Link href="/browse" className="underline">
          Browse all locations
        </Link>
        .
      </p>
    </main>
  );
}
