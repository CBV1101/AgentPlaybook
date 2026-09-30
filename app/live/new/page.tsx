import { notFound, redirect } from "next/navigation";
import { LiveForm } from "@/components/live-form";
import { Page } from "@/components/ui/page";
import { resumableBroadcastId } from "@/lib/data";
import { requireCompleteReporterProfile } from "@/lib/require-profile";
import { getEventPage, getLocationById, getRequestComposeContext, listInvestigationOptions } from "@/lib/queries";

type NewLivePageProps = {
  searchParams: Promise<{
    requestId?: string;
    eventId?: string;
    locationId?: string;
    error?: string;
  }>;
};

export default async function NewLivePage({ searchParams }: NewLivePageProps) {
  const { requestId, eventId, locationId, error } = await searchParams;
  const nextPath = "/live/new";
  const { profile } = await requireCompleteReporterProfile(
    requestId
      ? `/live/new?requestId=${requestId}`
      : eventId
        ? `/live/new?eventId=${eventId}`
        : locationId
          ? `/live/new?locationId=${locationId}`
          : nextPath,
  );
  const canLive = profile.can_live_stream !== false;
  if (canLive) {
    const existing = await resumableBroadcastId(profile.id);
    if (existing) {
      redirect(`/live/${existing}/broadcast`);
    }
  }
  const investigations = await listInvestigationOptions(profile.id);

  let requestTitle: string | undefined;
  let resolvedLocationId = locationId ?? "";
  let locationLabel = "";
  let resolvedEventId = eventId ?? null;

  if (requestId) {
    const context = await getRequestComposeContext(requestId);
    if (!context) {
      notFound();
    }
    requestTitle = context.title;
    resolvedLocationId = context.locationId;
    locationLabel = context.locationLabel;
    resolvedEventId = context.eventId ?? resolvedEventId;
  } else if (eventId) {
    const eventPage = await getEventPage(eventId);
    if (!eventPage) {
      notFound();
    }
    resolvedLocationId = eventPage.event.location.id;
    locationLabel = eventPage.event.location.label;
    resolvedEventId = eventPage.event.id;
  } else if (locationId) {
    const location = await getLocationById(locationId);
    if (!location) {
      notFound();
    }
    resolvedLocationId = location.id;
    locationLabel = location.label;
  }

  return (
    <Page width="narrow">
      <h1 className="fh-title">Go live</h1>
      <p className="mt-2 fh-lede">
        Start a live firsthand report from a place. Viewers can watch inside Firsthand. This is not a
        verified finding.
      </p>
      <div className="mt-8">
        {canLive ? (
          <LiveForm
            locationId={resolvedLocationId || undefined}
            locationLabel={locationLabel || undefined}
            eventId={resolvedEventId}
            requestId={requestId}
            requestTitle={requestTitle}
            error={error}
            investigations={investigations}
          />
        ) : (
          <p className="fh-body">
            Live streaming is temporarily disabled for this account. You can still publish recorded
            firsthand reports.
          </p>
        )}
      </div>
    </Page>
  );
}
