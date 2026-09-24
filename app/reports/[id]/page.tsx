import Link from "next/link";
import { notFound } from "next/navigation";
import { FollowButton } from "@/components/follow-button";
import { GeographyBreadcrumbs } from "@/components/geography-breadcrumbs";
import { LicensingInquiryForm } from "@/components/licensing-inquiry-form";
import { MapPreview } from "@/components/map-preview";
import { MediaProvenance } from "@/components/media-provenance";
import { RelativeTime } from "@/components/relative-time";
import { ReportContentForm } from "@/components/report-content-form";
import { ReportMediaGallery } from "@/components/report-media";
import { ReporterPreview } from "@/components/reporter-preview";
import { SensitiveContentAdminControl } from "@/components/sensitive-content-admin-control";
import { SensitiveContentGate } from "@/components/sensitive-content-gate";
import { SupportReportingControl } from "@/components/support-reporting-control";
import { Notice, Page, Section } from "@/components/ui/page";
import { getCurrentUser } from "@/lib/auth";
import { peopleWantedThisCovered } from "@/lib/coverage-wanted";
import { cityHref, countryHref } from "@/lib/geo";
import { formatDuration, formatWhen } from "@/lib/format";
import { getReportPage } from "@/lib/queries";
import { currentUserIsAdmin } from "@/lib/require-admin";

type ReportPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
};

export default async function ReportPage({ params, searchParams }: ReportPageProps) {
  const { id } = await params;
  const { notice, error } = await searchParams;
  const user = await getCurrentUser();
  const [page, isAdmin] = await Promise.all([getReportPage(id, user?.id), currentUserIsAdmin()]);

  if (!page) {
    notFound();
  }

  if (page.removedAt && !isAdmin) {
    notFound();
  }

  const licensingAvailable = page.licensingStatus === "licensing_available";
  const liveDuration =
    page.liveStartedAt && page.liveEndedAt ? formatDuration(page.liveStartedAt, page.liveEndedAt) : null;
  const isOwnReport = Boolean(user && page.reporterId === user.id);
  const demand =
    page.requestId && page.report.requestSupporterCount && page.report.requestSupporterCount > 0
      ? peopleWantedThisCovered(page.report.requestSupporterCount)
      : null;

  return (
    <Page>
      <p className="fh-kicker">Firsthand report</p>
      {notice === "sensitive-on" ? (
        <Notice>Viewers will see a warning before this media.</Notice>
      ) : null}
      {notice === "sensitive-off" ? (
        <Notice tone="ok">The sensitive content warning was removed.</Notice>
      ) : null}
      {page.removedAt ? (
        <Notice tone="danger">This report was removed from public view.</Notice>
      ) : null}
      {page.publishStatus === "draft" ? (
        <Notice>
          This report is still a draft. It is not public until every photo and video is ready.
        </Notice>
      ) : null}

      <h1 className="mt-3 fh-title">{page.report.title}</h1>
      <div className="mt-4">
        <ReporterPreview
          name={page.reporterDisplayName}
          username={page.reporterUsername}
          avatarUrl={page.reporterAvatarUrl}
          href={`/u/${page.reporterUsername}`}
        />
      </div>
      <div className="mt-4">
        <GeographyBreadcrumbs
          items={[
            { href: countryHref(page.location.country), label: page.location.country },
            { href: cityHref(page.location.city, page.location.country), label: page.location.city },
            ...(page.location.place
              ? [{ href: page.location.href, label: page.location.place }]
              : []),
          ]}
        />
      </div>
      <p className="mt-2">
        <RelativeTime value={page.capturedAt} prefix="Captured" />
        {page.recordedLive ? <span className="ml-2 fh-label">Recorded live</span> : null}
        {licensingAvailable ? <span className="ml-2 fh-label">Licensing available</span> : null}
      </p>

      {page.media.length > 0 ? (
        <div className="mt-6 -mx-4 w-[calc(100%+2rem)] sm:mx-0 sm:w-full sm:overflow-hidden sm:rounded-lg">
          <SensitiveContentGate active={Boolean(page.sensitiveContent)}>
            <ReportMediaGallery media={page.media} />
          </SensitiveContentGate>
        </div>
      ) : null}
      {page.media.length > 0 ? (
        <MediaProvenance media={page.media} reporterName={page.reporterDisplayName} />
      ) : null}

      {page.description ? (
        <section className="fh-section-block">
          <h2 className="fh-section">Report</h2>
          <p className="mt-3 whitespace-pre-wrap fh-body">{page.description}</p>
        </section>
      ) : null}

      {page.event || page.requestId ? (
        <section className="fh-section-block">
          <h2 className="fh-section">Story context</h2>
          {page.event ? (
            <p className="mt-3 fh-meta">
              Part of event{" "}
              <Link href={`/events/${page.event.id}`} className="font-medium text-ink underline">
                {page.event.title}
              </Link>
              . The event is a grouping, not a conclusion about what happened.
            </p>
          ) : null}
          {page.requestId ? (
            <p className="mt-3 fh-meta">
              Responding to:{" "}
              {page.requestTitle ? (
                <Link href={`/requests/${page.requestId}`} className="font-medium text-ink underline">
                  {page.requestTitle}
                </Link>
              ) : (
                <Link href={`/requests/${page.requestId}`} className="underline">
                  a coverage request
                </Link>
              )}
              {demand ? ` · ${demand}` : null}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="fh-section-block">
        <h2 className="fh-section">Actions</h2>
        <SupportReportingControl
          reportId={page.report.id}
          supportCount={page.supportCount}
          isAuthenticated={Boolean(user)}
          currentUserSupported={page.currentUserSupported}
          isOwnReport={isOwnReport}
          nextPath={`/reports/${page.report.id}`}
          compact
        />
        {!isOwnReport ? (
          <div className="mt-4">
            <FollowButton
              kind="reporter"
              reporterId={page.reporterId}
              isAuthenticated={Boolean(user)}
              following={Boolean(page.followingReporter)}
              nextPath={`/reports/${page.report.id}`}
              followLabel="Follow reporter"
              followingLabel="Following"
            />
          </div>
        ) : null}
        {licensingAvailable ? (
          <div className="mt-6">
            <LicensingInquiryForm
              reportId={page.report.id}
              media={page.media.flatMap((item) =>
                item.id
                  ? [
                      {
                        id: item.id,
                        media_type: item.media_type,
                        original_filename: item.original_filename,
                      },
                    ]
                  : [],
              )}
              isAuthenticated={Boolean(user)}
              isOwnReport={isOwnReport}
              nextPath={`/reports/${page.report.id}`}
              defaultEmail={user?.email}
              notice={notice}
              error={notice === "licensing-inquiry" ? undefined : error}
            />
          </div>
        ) : null}
      </section>

      <Section title="Details">
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="fh-label">Captured</dt>
            <dd className="mt-1 text-sm text-ink">{formatWhen(page.capturedAt)}</dd>
          </div>
          <div>
            <dt className="fh-label">Uploaded</dt>
            <dd className="mt-1 text-sm text-ink">{formatWhen(page.uploadedAt)}</dd>
          </div>
          {page.recordedLive && page.liveStartedAt ? (
            <div>
              <dt className="fh-label">Live started</dt>
              <dd className="mt-1 text-sm text-ink">{formatWhen(page.liveStartedAt)}</dd>
            </div>
          ) : null}
          {liveDuration ? (
            <div>
              <dt className="fh-label">Duration</dt>
              <dd className="mt-1 text-sm text-ink">{liveDuration}</dd>
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <dt className="fh-label">Location</dt>
            <dd className="mt-1">
              <Link href={page.location.href} className="text-sm text-ink underline">
                {page.location.label}
              </Link>
            </dd>
          </div>
        </dl>
        <div className="mt-4">
          <MapPreview
            latitude={page.location.latitude}
            longitude={page.location.longitude}
            label={page.location.label}
          />
        </div>
        <p className="mt-4 fh-meta">
          Firsthand does not determine whether this report is true. This is a firsthand account from
          the reporter, not a verified finding.
        </p>
      </Section>

      {isAdmin ? (
        <SensitiveContentAdminControl
          contentType="firsthand_report"
          contentId={page.report.id}
          sensitive={Boolean(page.sensitiveContent)}
          nextPath={`/reports/${page.report.id}`}
        />
      ) : null}

      <ReportContentForm
        contentType="firsthand_report"
        contentId={page.report.id}
        nextPath={`/reports/${page.report.id}`}
        isAuthenticated={Boolean(user)}
        notice={notice}
        error={error}
        compact
      />
    </Page>
  );
}
