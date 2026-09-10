import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthRequiredLink } from "@/components/auth-required-link";
import { InterestButton } from "@/components/interest-button";
import { MapPreview } from "@/components/map-preview";
import { ReportCard } from "@/components/report-card";
import { ReportContentForm } from "@/components/report-content-form";
import { getCurrentUser } from "@/lib/auth";
import { getCoverageRequestPage } from "@/lib/queries";
import { currentUserIsAdmin } from "@/lib/require-admin";

type RequestPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
};

function formatRequestedDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function CoverageRequestPage({ params, searchParams }: RequestPageProps) {
  const { id } = await params;
  const { notice, error } = await searchParams;
  const user = await getCurrentUser();
  const [page, isAdmin] = await Promise.all([getCoverageRequestPage(id, user?.id), currentUserIsAdmin()]);

  if (!page) {
    notFound();
  }

  if (page.removedAt && !isAdmin) {
    notFound();
  }

  const interested = Boolean(user && page.interestedUserIds.includes(user.id));
  const reportHref = `/reports/new?requestId=${page.request.id}`;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <p className="text-sm uppercase tracking-[0.2em] text-rose-800">Coverage request</p>
      {page.removedAt ? (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-900">
          This coverage request was removed from public view.
        </p>
      ) : null}
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-stone-950">
        {page.request.title}
      </h1>

      <p className="mt-4 text-stone-700">
        <Link href={`/place/${page.location.slug}`} className="underline">
          {page.location.place || page.location.city}
        </Link>
        <span className="text-stone-500">
          {" "}
          · {page.location.city}, {page.location.country}
        </span>
      </p>

      <div className="mt-6">
        <MapPreview
          latitude={page.location.latitude}
          longitude={page.location.longitude}
          label={page.location.label}
        />
      </div>

      {page.request.description ? (
        <section className="mt-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">Context</h2>
          <p className="mt-2 whitespace-pre-wrap text-stone-700">{page.request.description}</p>
        </section>
      ) : null}

      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <dt className="text-xs uppercase tracking-wide text-stone-500">Date requested</dt>
          <dd className="mt-1 text-stone-900">{formatRequestedDate(page.request.createdAt)}</dd>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <dt className="text-xs uppercase tracking-wide text-stone-500">People interested</dt>
          <dd className="mt-1 text-stone-900">{page.request.supporterCount}</dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        <InterestButton
          requestId={page.request.id}
          nextPath={`/requests/${page.request.id}`}
          isAuthenticated={Boolean(user)}
          alreadyInterested={interested}
        />
        <AuthRequiredLink
          href={reportHref}
          isAuthenticated={Boolean(user)}
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
        >
          Report from this location
        </AuthRequiredLink>
      </div>

      <section className="mt-12">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-stone-900">
          Firsthand reports
        </h2>
        {page.reports.length === 0 ? (
          <p className="mt-4 text-stone-600">No firsthand reports have answered this request yet.</p>
        ) : (
          <div className="mt-5 grid gap-4">
            {page.reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </section>

      <ReportContentForm
        contentType="coverage_request"
        contentId={page.request.id}
        nextPath={`/requests/${page.request.id}`}
        isAuthenticated={Boolean(user)}
        notice={notice}
        error={error}
      />
    </main>
  );
}
