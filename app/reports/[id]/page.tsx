import Link from "next/link";
import { notFound } from "next/navigation";
import { LicensingRequestPlaceholder } from "@/components/licensing-request-placeholder";
import { MapPreview } from "@/components/map-preview";
import { ReportContentForm } from "@/components/report-content-form";
import { ReportMediaGallery } from "@/components/report-media";
import { getCurrentUser } from "@/lib/auth";
import { formatWhen } from "@/lib/format";
import { getReportPage } from "@/lib/queries";
import { currentUserIsAdmin } from "@/lib/require-admin";

type ReportPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
};

export default async function ReportPage({ params, searchParams }: ReportPageProps) {
  const { id } = await params;
  const { notice, error } = await searchParams;
  const [page, user, isAdmin] = await Promise.all([getReportPage(id), getCurrentUser(), currentUserIsAdmin()]);

  if (!page) {
    notFound();
  }

  if (page.removedAt && !isAdmin) {
    notFound();
  }

  const viewOnly = page.licensingStatus === "view_only";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <p className="text-sm uppercase tracking-[0.2em] text-rose-800">Firsthand report</p>
      {page.removedAt ? (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-900">
          This report was removed from public view.
        </p>
      ) : null}
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-stone-950">{page.report.title}</h1>
      <p className="mt-3 text-stone-600">
        Reported by{" "}
        <Link href={`/u/${page.reporterUsername}`} className="font-medium underline">
          {page.reporterDisplayName}
        </Link>
      </p>

      <dl className="mt-6 grid gap-3 text-sm text-stone-700">
        {page.location.place ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-stone-500">Place</dt>
            <dd>
              <Link href={`/place/${page.location.slug}`} className="underline">
                {page.location.place}
              </Link>
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs uppercase tracking-wide text-stone-500">City</dt>
          <dd>{page.location.city}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-stone-500">Country</dt>
          <dd>{page.location.country}</dd>
        </div>
      </dl>

      <div className="mt-6">
        <MapPreview
          latitude={page.location.latitude}
          longitude={page.location.longitude}
          label={page.location.label}
        />
      </div>

      <ReportMediaGallery media={page.media} />

      {page.description ? (
        <p className="mt-8 whitespace-pre-wrap text-lg leading-8 text-stone-800">{page.description}</p>
      ) : null}

      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <dt className="text-xs uppercase tracking-wide text-stone-500">Captured</dt>
          <dd className="mt-1 text-stone-900">{formatWhen(page.capturedAt)}</dd>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <dt className="text-xs uppercase tracking-wide text-stone-500">Uploaded</dt>
          <dd className="mt-1 text-stone-900">{formatWhen(page.uploadedAt)}</dd>
        </div>
      </dl>

      {page.requestId ? (
        <p className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
          This report responds to a coverage request
          {page.requestTitle ? (
            <>
              {": "}
              <Link href={`/requests/${page.requestId}`} className="font-medium underline">
                {page.requestTitle}
              </Link>
            </>
          ) : (
            <>
              {". "}
              <Link href={`/requests/${page.requestId}`} className="underline">
                View the request
              </Link>
            </>
          )}
          .
        </p>
      ) : (
        <p className="mt-6 text-sm text-stone-500">This report was published independently.</p>
      )}

      <section className="mt-6 space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">Media usage</h2>
        {viewOnly ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <p className="text-sm font-medium text-stone-900">View only</p>
            <p className="mt-1 text-sm text-stone-600">
              People can watch this report on the platform, but the creator is not offering commercial
              licensing.
            </p>
          </div>
        ) : (
          <LicensingRequestPlaceholder />
        )}
      </section>

      <p className="mt-8 text-sm text-stone-500">
        Firsthand does not determine whether this report is true. This is a firsthand account from
        the reporter, not a verified finding.
      </p>

      <ReportContentForm
        contentType="firsthand_report"
        contentId={page.report.id}
        nextPath={`/reports/${page.report.id}`}
        isAuthenticated={Boolean(user)}
        notice={notice}
        error={error}
      />
    </main>
  );
}
