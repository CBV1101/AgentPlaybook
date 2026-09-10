import Link from "next/link";
import { LocationSearch } from "@/components/location-search";
import { ReportCard } from "@/components/report-card";
import { RequestCard } from "@/components/request-card";
import { searchCoverage } from "@/lib/queries";

type BrowsePageProps = {
  searchParams: Promise<{ location?: string }>;
};

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const { location = "" } = await searchParams;
  const query = location.trim();
  const feed = await searchCoverage(query);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-stone-900">
        Browse by location
      </h1>
      <p className="mt-2 max-w-2xl text-stone-600">
        Look through open requests and published reports by place, city, or country.
      </p>
      <div className="mt-6">
        <LocationSearch initialValue={query} />
      </div>
      {query ? (
        <p className="mt-6 text-sm text-stone-500">Showing matches for “{query}”.</p>
      ) : (
        <p className="mt-6 text-sm text-stone-500">
          Places, open questions, and reports currently on Firsthand.
        </p>
      )}

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-stone-900">Places</h2>
        {feed.places.length === 0 ? (
          <p className="mt-4 text-stone-600">No place archives match that search yet.</p>
        ) : (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {feed.places.map((place) => (
              <li key={place.id}>
                <Link
                  href={`/place/${place.slug}`}
                  className="block rounded-2xl border border-stone-200 bg-white p-4 hover:border-stone-400"
                >
                  <p className="font-medium text-stone-900">{place.label}</p>
                  <p className="mt-1 text-sm text-stone-600">
                    {place.reportCount} firsthand reports · {place.openRequestCount} open requests
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-stone-900">Open questions</h2>
        {feed.requests.length === 0 ? (
          <p className="mt-4 text-stone-600">No requests match that location yet.</p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {feed.requests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-stone-900">Reports</h2>
        {feed.reports.length === 0 ? (
          <p className="mt-4 text-stone-600">No reports match that location yet.</p>
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
