"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createEventRecord } from "@/lib/data";
import { parseCoordinate, type StructuredLocation } from "@/lib/location";
import { loginPath } from "@/lib/paths";

function formString(formData: FormData, key: string) {
  return typeof formData.get(key) === "string" ? String(formData.get(key)).trim() : "";
}

function locationFromForm(formData: FormData): StructuredLocation | null {
  const country = formString(formData, "location_country");
  const city = formString(formData, "location_city");
  const placeValue = formString(formData, "location_place");
  const latitude = parseCoordinate(formString(formData, "location_latitude"));
  const longitude = parseCoordinate(formString(formData, "location_longitude"));

  if (!country || !city || latitude === null || longitude === null) {
    return null;
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  return {
    country,
    city,
    place: placeValue || null,
    latitude,
    longitude,
  };
}

export async function createEvent(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(loginPath("/events/new"));
  }

  const title = formString(formData, "title");
  const description = formString(formData, "description");
  const startedAtRaw = formString(formData, "started_at");
  const location = locationFromForm(formData);

  if (!title) {
    redirect("/events/new?error=title");
  }
  if (!location) {
    redirect("/events/new?error=location");
  }
  const startedAt = startedAtRaw ? new Date(startedAtRaw).toISOString() : "";
  if (!startedAt || Number.isNaN(Date.parse(startedAt))) {
    redirect("/events/new?error=started");
  }

  try {
    const id = await createEventRecord({
      userId: user.id,
      title,
      description: description || null,
      startedAt,
      location,
    });
    redirect(`/events/${id}`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Could not create the event.";
    redirect(`/events/new?error=${encodeURIComponent(message)}`);
  }
}
