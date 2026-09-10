import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportCard } from "@/components/report-card";
import { ReporterAvatar } from "@/components/reporter-avatar";
import { ReporterStatsHeader } from "@/components/reporter-stats";
import { getCurrentUser } from "@/lib/auth";
import { countLabel } from "@/lib/data/reporter";
import { formatDate } from "@/lib/format";
import { getProfileByUserId, getProfilePage } from "@/lib/queries";

type PublicProfilePageProps = {
  params: Promise<{ username: string }>;
};

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params;
  const page = await getProfilePage(username);

  if (!page) {
    notFound();
  }

  const user = await getCurrentUser();
  const ownProfile = user ? await getProfileByUserId(user.id) : null;
  const isOwner = ownProfile?.id === page.profile.id;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <p className="text-sm uppercase tracking-[0.2em] text-rose-800">Reporter portfolio</p>

      <header className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
        <ReporterAvatar
          name={page.profile.display_name}
          username={page.profile.username}
          avatarUrl={page.profile.avatar_url}
        />
        <div className="min-w-0 flex-1">
          <h1 className="font-[family-name:var(--font-display)] text-4xl text-stone-950">
            {page.profile.display_name}
          </h1>
          <p className="mt-1 text-stone-500">@{page.profile.username}</p>
          {page.profile.bio ? (
            <p className="mt-4 max-w-2xl text-base leading-7 text-stone-700">{page.profile.bio}</p>
          ) : null}
          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-600">
            {page.profile.home_city || page.profile.home_country ? (
              <div>
                <dt className="sr-only">Home</dt>
                <dd>
                  {[page.profile.home_city, page.profile.home_country].filter(Boolean).join(", ")}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="sr-only">Reporting since</dt>
              <dd>Reporting since {formatDate(page.profile.created_at)}</dd>
            </div>
          </dl>
          {isOwner ? (
            <p className="mt-3 text-sm">
              <Link href="/profile" className="underline">
                Account settings
              </Link>
            </p>
          ) : null}
        </div>
      </header>

      <ReporterStatsHeader stats={page.stats} />

      <section className="mt-12">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-stone-900">Latest reporting</h2>
        {page.latestReports.length === 0 ? (
          <p className="mt-4 text-stone-600">This reporter has not published a firsthand report yet.</p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {page.latestReports.map((report) => (
              <ReportCard key={report.id} report={report} variant="portfolio" />
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-stone-900">Places covered</h2>
        {page.placesCovered.length === 0 ? (
          <p className="mt-4 text-stone-600">No places on record yet.</p>
        ) : (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {page.placesCovered.map((place) => (
              <li key={place.location.id}>
                <Link
                  href={`/place/${place.location.slug}`}
                  className="block rounded-2xl border border-stone-200 bg-white p-4 hover:border-stone-400"
                >
                  <p className="font-medium text-stone-900">
                    {place.location.place || place.location.city}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    {place.location.city}, {place.location.country}
                  </p>
                  <p className="mt-2 text-sm text-stone-500">
                    {countLabel(place.reportCount, "firsthand report", "firsthand reports")}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-stone-900">
          Available for licensing
        </h2>
        <p className="mt-2 text-sm text-stone-500">
          The creator is open to commercial licensing requests for this media. Licensing transactions
          are not available yet.
        </p>
        {page.licensingReports.length === 0 ? (
          <p className="mt-4 text-stone-600">No reports from this creator are offered for licensing.</p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {page.licensingReports.map((report) => (
              <ReportCard key={report.id} report={report} variant="portfolio" />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
