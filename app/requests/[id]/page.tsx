import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthRequiredLink } from "@/components/auth-required-link";
import { InterestButton } from "@/components/interest-button";
import { LiveCard } from "@/components/live-card";
import { MapPreview } from "@/components/map-preview";
import { ReportCard } from "@/components/report-card";
import { ReportContentForm } from "@/components/report-content-form";
import { buttonClass } from "@/components/ui/button";
import { EmptyState, Notice, Page, Section } from "@/components/ui/page";
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
    <Page width="article">
      <p className="fh-kicker">Coverage request</p>
      {page.removedAt ? (
        <Notice tone="danger">This coverage request was removed from public view.</Notice>
      ) : null}
      <h1 className="mt-3 fh-hero">{page.request.title}</h1>

      <p className="mt-4 fh-body">
        <Link href={page.location.href} className="underline">
          {page.location.place || page.location.city}
        </Link>
        <span className="text-muted">
          {" "}
          · {page.location.city}, {page.location.country}
        </span>
      </p>

      {page.event ? (
        <p className="mt-4 border-y border-line py-4 fh-meta">
          Part of event{" "}
          <Link href={`/events/${page.event.id}`} className="font-medium text-ink underline">
            {page.event.title}
          </Link>
          . The event is a grouping, not a conclusion about what happened.
        </p>
      ) : null}

      <div className="mt-6">
        <MapPreview
          latitude={page.location.latitude}
          longitude={page.location.longitude}
          label={page.location.label}
        />
      </div>

      {page.request.description ? (
        <section className="mt-8">
          <h2 className="fh-label">Context</h2>
          <p className="mt-2 whitespace-pre-wrap fh-body">{page.request.description}</p>
        </section>
      ) : null}

      <dl className="mt-8 grid grid-cols-2 gap-6 border-y border-line py-5">
        <div>
          <dt className="fh-label">Date requested</dt>
          <dd className="mt-1 text-ink">{formatRequestedDate(page.request.createdAt)}</dd>
        </div>
        <div>
          <dt className="fh-label">People interested</dt>
          <dd className="mt-1 text-ink">{page.request.supporterCount}</dd>
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
          className={buttonClass("secondary")}
        >
          Report on this
        </AuthRequiredLink>
        <AuthRequiredLink
          href={`/live/new?requestId=${page.request.id}`}
          isAuthenticated={Boolean(user)}
          className={buttonClass("live")}
        >
          Go live
        </AuthRequiredLink>
      </div>

      {(page.liveStreams ?? []).length > 0 ? (
        <Section kicker="Live" title="Live now">
          <div className="mt-5 grid gap-4">
            {page.liveStreams.map((stream) => (
              <LiveCard key={stream.id} stream={stream} />
            ))}
          </div>
        </Section>
      ) : null}

      <Section title="Firsthand reports">
        {page.reports.length === 0 ? (
          <EmptyState title="No firsthand reports have answered this request yet." />
        ) : (
          <div className="mt-5 grid gap-4">
            {page.reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </Section>

      <ReportContentForm
        contentType="coverage_request"
        contentId={page.request.id}
        nextPath={`/requests/${page.request.id}`}
        isAuthenticated={Boolean(user)}
        notice={notice}
        error={error}
      />
    </Page>
  );
}
