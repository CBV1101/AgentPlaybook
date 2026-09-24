import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthRequiredLink } from "@/components/auth-required-link";
import { LiveCard } from "@/components/live-card";
import { MapPreview } from "@/components/map-preview";
import { ReportCard } from "@/components/report-card";
import { RequestCard } from "@/components/request-card";
import { ReporterPreview } from "@/components/reporter-preview";
import { buttonClass } from "@/components/ui/button";
import { EmptyState, Page, Section } from "@/components/ui/page";
import { getCurrentUser } from "@/lib/auth";
import { getEventPage } from "@/lib/queries";
import { eventStatusLabel } from "@/lib/events";
import { formatWhen } from "@/lib/format";
import { cityHref, countryHref } from "@/lib/geo";

type EventPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  const page = await getEventPage(id, user?.id);

  if (!page) {
    notFound();
  }

  const { event, reports, requests, reporters, timeline, liveStreams } = page;

  return (
    <Page>
      <p className="fh-kicker">Event</p>
      <h1 className="mt-3 fh-hero">{event.title}</h1>
      <p className="mt-3 fh-meta">
        <Link href={event.location.href} className="underline">
          {event.location.label}
        </Link>
        {" · "}
        <Link href={cityHref(event.location.city, event.location.country)} className="underline">
          {event.location.city}
        </Link>
        {", "}
        <Link href={countryHref(event.location.country)} className="underline">
          {event.location.country}
        </Link>
      </p>
      <dl className="mt-6 grid max-w-xl grid-cols-2 gap-6 border-y border-line py-5">
        <div>
          <dt className="fh-label">Status</dt>
          <dd className="mt-1 text-ink">{eventStatusLabel(event.status)}</dd>
        </div>
        <div>
          <dt className="fh-label">Started</dt>
          <dd className="mt-1 text-ink">{formatWhen(event.startedAt)}</dd>
        </div>
      </dl>
      {event.description ? (
        <p className="mt-6 max-w-3xl whitespace-pre-wrap fh-body">{event.description}</p>
      ) : null}
      <p className="mt-4 max-w-3xl fh-meta">
        This event groups firsthand reporting about the same occurrence. Firsthand does not conclude
        what happened.
      </p>
      <div className="mt-6">
        <MapPreview
          latitude={event.location.latitude}
          longitude={event.location.longitude}
          label={event.location.label}
        />
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <AuthRequiredLink
          href="/reports/new"
          isAuthenticated={Boolean(user)}
          className={buttonClass("secondary")}
        >
          Publish a report
        </AuthRequiredLink>
        <AuthRequiredLink
          href="/requests/new"
          isAuthenticated={Boolean(user)}
          className={buttonClass("secondary")}
        >
          Request coverage
        </AuthRequiredLink>
        <AuthRequiredLink
          href={`/live/new?eventId=${event.id}`}
          isAuthenticated={Boolean(user)}
          className={buttonClass("live")}
        >
          Go live
        </AuthRequiredLink>
      </div>

      <Section kicker="Live" title="Live from this event">
        {liveStreams.length === 0 ? (
          <EmptyState title="No live firsthand reports from this event right now." />
        ) : (
          <div className="fh-grid">
            {liveStreams.map((stream) => (
              <LiveCard key={stream.id} stream={stream} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Latest firsthand reports">
        {reports.length === 0 ? (
          <EmptyState title="No firsthand reports are attached to this event yet." />
        ) : (
          <div className="fh-grid">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Coverage wanted">
        {requests.length === 0 ? (
          <EmptyState title="No open coverage requests are attached to this event." />
        ) : (
          <div className="fh-grid">
            {requests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Reporters covering this event">
        {reporters.length === 0 ? (
          <EmptyState title="No reporters have published a report on this event yet." />
        ) : (
          <ul className="mt-5">
            {reporters.map((reporter) => (
              <li key={reporter.id} className="fh-list-row">
                <ReporterPreview
                  name={reporter.displayName}
                  username={reporter.username}
                  avatarUrl={reporter.avatarUrl}
                  href={`/u/${reporter.username}`}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Timeline"
        description="Reports and coverage requests attached to this event, newest first. Capture time is used for reports."
      >
        {timeline.length === 0 ? (
          <EmptyState title="Nothing is on this timeline yet." />
        ) : (
          <ol className="mt-5">
            {timeline.map((item) => (
              <li
                key={`${item.kind}-${item.kind === "report" ? item.report.id : item.request.id}`}
                className="fh-list-row"
              >
                <p className="fh-label">
                  {item.kind === "report" ? "Firsthand report" : "Coverage request"} · {formatWhen(item.at)}
                </p>
                {item.kind === "report" ? (
                  <Link href={`/reports/${item.report.id}`} className="mt-2 block font-medium underline">
                    {item.report.title}
                  </Link>
                ) : (
                  <Link href={`/requests/${item.request.id}`} className="mt-2 block font-medium underline">
                    {item.request.title}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        )}
      </Section>
    </Page>
  );
}
