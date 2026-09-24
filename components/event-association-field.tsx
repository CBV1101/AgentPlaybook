"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Field, Select } from "@/components/ui/field";
import type { GeocodeSuggestion } from "@/lib/location";
import type { EventSummary } from "@/lib/types";

type EventAssociationFieldProps = {
  locationId?: string;
  location?: GeocodeSuggestion | null;
  defaultEventId?: string | null;
};

function queryFor(locationId?: string, location?: GeocodeSuggestion | null) {
  const params = new URLSearchParams();
  if (locationId) {
    params.set("locationId", locationId);
    return params.toString();
  }
  if (location?.country && location.city) {
    params.set("country", location.country);
    params.set("city", location.city);
    if (location.place) {
      params.set("place", location.place);
    }
    params.set("latitude", String(location.latitude));
    params.set("longitude", String(location.longitude));
    return params.toString();
  }
  return null;
}

export function EventAssociationField({
  locationId,
  location,
  defaultEventId,
}: EventAssociationFieldProps) {
  const query = queryFor(locationId, location);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [fetchedQuery, setFetchedQuery] = useState<string | null>(null);
  const loading = Boolean(query) && fetchedQuery !== query;

  useEffect(() => {
    if (!query) {
      return;
    }
    const controller = new AbortController();
    fetch(`/api/events/active?${query}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as { events?: EventSummary[] };
        setEvents(payload.events ?? []);
        setFetchedQuery(query);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setEvents([]);
        setFetchedQuery(query);
      });

    return () => controller.abort();
  }, [query]);

  if (!query) {
    return (
      <p className="fh-meta">
        Choose a location first to optionally attach this to an active event there.
      </p>
    );
  }

  if (loading) {
    return <p className="fh-meta">Looking for active events at this location…</p>;
  }

  if (events.length === 0) {
    return (
      <p className="fh-meta">
        No active event at this location. You can still publish independently, or{" "}
        <Link href="/events/new" className="underline">
          create an event
        </Link>
        .
      </p>
    );
  }

  return (
    <Field
      label="Event (optional)"
      htmlFor="event_id"
      hint="An event groups firsthand reporting about the same occurrence. It is not a verdict about what happened."
    >
      <Select id="event_id" name="event_id" defaultValue={defaultEventId ?? ""}>
        <option value="">Not part of an event</option>
        {events.map((event) => (
          <option key={event.id} value={event.id}>
            {event.title}
          </option>
        ))}
      </Select>
    </Field>
  );
}
