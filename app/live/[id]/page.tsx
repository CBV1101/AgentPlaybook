import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LivePlayer } from "@/components/live-player";
import { ReportContentForm } from "@/components/report-content-form";
import { SensitiveContentAdminControl } from "@/components/sensitive-content-admin-control";
import { SensitiveContentGate } from "@/components/sensitive-content-gate";
import { LiveBadge } from "@/components/ui/badge";
import { Notice, Page } from "@/components/ui/page";
import { getCurrentUser } from "@/lib/auth";
import { getLiveStreamPage } from "@/lib/queries";
import { formatWhen } from "@/lib/format";
import { cityHref, countryHref } from "@/lib/geo";
import { isPubliclyLive, liveBroadcastHref } from "@/lib/live";
import { currentUserIsAdmin } from "@/lib/require-admin";

type LivePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
};

export default async function LivePage({ params, searchParams }: LivePageProps) {
  const { id } = await params;
  if (process.env.NODE_ENV === "development" && id.startsWith("dev-showcase-")) {
    const { getHomepageShowcaseContent } = await import("@/lib/homepage-showcase");
    const { showcaseInvestigationPage } = await import("@/lib/investigation-showcase");
    const stream =
      getHomepageShowcaseContent().liveStreams.find((item) => item.id === id) ??
      showcaseInvestigationPage().livePart?.liveStream ??
      null;
    if (stream?.reporterUsername) {
      redirect(`/u/${stream.reporterUsername}`);
    }
  }
  const { notice, error } = await searchParams;
  const user = await getCurrentUser();
  const [stream, isAdmin] = await Promise.all([getLiveStreamPage(id, user?.id), currentUserIsAdmin()]);

  if (!stream) {
    notFound();
  }

  const isOwner = user?.id === stream.reporterId;
  const live = isPubliclyLive(stream);
  const terminated = stream.status === "terminated";
  const sensitive = stream.sensitiveContent;

  return (
    <Page width="article">
      <p className="fh-kicker">LIVE FIRSTHAND REPORT</p>
      {notice === "sensitive-on" ? (
        <Notice>Viewers will see a warning before this livestream.</Notice>
      ) : null}
      {notice === "sensitive-off" ? (
        <Notice tone="ok">The sensitive content warning was removed.</Notice>
      ) : null}
      {live ? (
        <p className="mt-3">
          <LiveBadge />
        </p>
      ) : terminated ? (
        <Notice tone="danger">
          This livestream was removed from public view. It is not a live broadcast.
        </Notice>
      ) : stream.status === "live" ? (
        <p className="mt-3 fh-meta">This broadcast is not currently on air.</p>
      ) : (
        <p className="mt-3 fh-meta">This live report has ended. The recording stays in the archive.</p>
      )}
      <h1 className="mt-3 fh-hero">{stream.title}</h1>
      <p className="mt-3 fh-meta">
        Reported by{" "}
        <Link href={`/u/${stream.reporterUsername}`} className="font-medium text-ink underline">
          {stream.reporterName}
        </Link>
      </p>

      <dl className="mt-6 grid gap-3 text-sm text-muted">
        <div>
          <dt className="fh-label">Location</dt>
          <dd>
            <Link href={stream.location.href} className="underline">
              {stream.location.label}
            </Link>
            {" · "}
            <Link href={cityHref(stream.location.city, stream.location.country)} className="underline">
              {stream.location.city}
            </Link>
            {", "}
            <Link href={countryHref(stream.location.country)} className="underline">
              {stream.location.country}
            </Link>
          </dd>
        </div>
        {stream.eventId && stream.eventTitle ? (
          <div>
            <dt className="fh-label">Event</dt>
            <dd>
              <Link href={`/events/${stream.eventId}`} className="underline">
                {stream.eventTitle}
              </Link>
            </dd>
          </div>
        ) : null}
        {stream.startedAt ? (
          <div>
            <dt className="fh-label">Started</dt>
            <dd>{formatWhen(stream.startedAt)}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-6">
        <SensitiveContentGate active={sensitive && Boolean(stream.playbackUrl)}>
          <LivePlayer stream={stream} allowAutoplay={live && !sensitive} />
        </SensitiveContentGate>
      </div>

      {isAdmin && terminated ? (
        <p className="mt-4 fh-meta">
          Admin view: a recording may be kept for review. It is not published as a public report.
        </p>
      ) : null}

      <p className="mt-4 fh-meta">
        This is a live firsthand report. Firsthand does not determine whether it is true or complete.
      </p>

      {isOwner && !terminated ? (
        <p className="mt-4 text-sm">
          <Link href={liveBroadcastHref(stream.id)} className="underline">
            Open broadcast controls
          </Link>
        </p>
      ) : null}

      {stream.reportId && !terminated ? (
        <p className="mt-4 text-sm">
          Recording saved as{" "}
          <Link href={`/reports/${stream.reportId}`} className="underline">
            a firsthand report
          </Link>
          .
        </p>
      ) : null}

      {isAdmin ? (
        <SensitiveContentAdminControl
          contentType="live_stream"
          contentId={stream.id}
          sensitive={sensitive}
          nextPath={`/live/${stream.id}`}
        />
      ) : null}

      <ReportContentForm
        contentType="live_stream"
        contentId={stream.id}
        nextPath={`/live/${stream.id}`}
        isAuthenticated={Boolean(user)}
        notice={notice}
        error={error}
      />
    </Page>
  );
}
