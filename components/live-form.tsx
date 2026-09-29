"use client";

import { useState } from "react";
import { EventAssociationField } from "@/components/event-association-field";
import { GeocodedLocationField } from "@/components/geocoded-location-field";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { ErrorState, Notice } from "@/components/ui/page";
import { createLiveStream } from "@/lib/live-actions";
import { LIVE_UNAVAILABLE_USER_MESSAGE } from "@/lib/live/fail-closed";
import { LIVE_STREAM_PUBLISHING_RULES } from "@/lib/moderation";
import { InvestigationSelectField } from "@/components/investigation-select-field";
import type { ReporterInvestigationOption } from "@/lib/investigations";
import type { GeocodeSuggestion } from "@/lib/location";

const errorCopy: Record<string, string> = {
  title: "Add a title for this live firsthand report.",
  location: "Search for a place and choose a result before going live.",
  "live-unavailable": LIVE_UNAVAILABLE_USER_MESSAGE,
  "live-privilege": "Live streaming is temporarily disabled for this account.",
};

type LiveFormProps = {
  locationId?: string;
  locationLabel?: string;
  eventId?: string | null;
  requestId?: string | null;
  requestTitle?: string | null;
  error?: string;
  investigations?: ReporterInvestigationOption[];
};

export function LiveForm({
  locationId,
  locationLabel,
  eventId,
  requestId,
  requestTitle,
  error,
  investigations = [],
}: LiveFormProps) {
  const [pickedLocation, setPickedLocation] = useState<GeocodeSuggestion | null>(null);

  return (
    <form action={createLiveStream} className="space-y-5">
      {error ? <ErrorState>{errorCopy[error] ?? error}</ErrorState> : null}

      <Notice>
        You are starting a live firsthand report. Viewers will see what your camera captures. This is
        not a verified finding.
      </Notice>

      {requestId ? <input type="hidden" name="request_id" value={requestId} /> : null}
      {locationId ? <input type="hidden" name="location_id" value={locationId} /> : null}

      {requestTitle ? (
        <p className="fh-alert bg-canvas text-ink">
          Answering: <span className="font-medium">{requestTitle}</span>
        </p>
      ) : null}

      <Field label="Title" htmlFor="title">
        <TextInput
          id="title"
          name="title"
          required
          maxLength={200}
          placeholder="Live from the square"
        />
      </Field>

      {locationLabel ? (
        <div>
          <p className="text-sm font-medium text-ink">Location</p>
          <p className="mt-1 text-ink">{locationLabel}</p>
        </div>
      ) : (
        <GeocodedLocationField onSelectedChange={setPickedLocation} />
      )}

      <EventAssociationField locationId={locationId} location={pickedLocation} defaultEventId={eventId} />
      <InvestigationSelectField investigations={investigations} />

      <div className="fh-alert bg-warn-soft text-ink">
        <p className="font-medium">Live reporting rules</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {LIVE_STREAM_PUBLISHING_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>

      <Button type="submit" variant="live">
        Start live report
      </Button>
    </form>
  );
}
