"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createLiveStreamRecord, findOrCreateLocation, getProfileByUserId } from "@/lib/data";
import { parseCoordinate, type StructuredLocation } from "@/lib/location";
import { loginPath, reporterProfileSetupPath } from "@/lib/paths";
import { isReporterProfileComplete } from "@/lib/profile";

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

export async function createLiveStream(formData: FormData) {
  const requestId = formString(formData, "request_id") || null;
  const eventId = formString(formData, "event_id") || null;
  const locationIdFromForm = formString(formData, "location_id");
  const fallback = `/live/new${requestId ? `?requestId=${requestId}` : eventId ? `?eventId=${eventId}` : locationIdFromForm ? `?locationId=${locationIdFromForm}` : ""}`;
  const user = await getCurrentUser();
  if (!user) {
    redirect(loginPath(fallback));
  }
  const profile = await getProfileByUserId(user.id);
  if (!isReporterProfileComplete(profile)) {
    redirect(reporterProfileSetupPath(fallback));
  }

  const title = formString(formData, "title");
  if (!title) {
    redirect(`${fallback}${fallback.includes("?") ? "&" : "?"}error=title`);
  }

  try {
    let locationId = locationIdFromForm;
    if (!locationId) {
      const location = locationFromForm(formData);
      if (!location) {
        redirect(`${fallback}${fallback.includes("?") ? "&" : "?"}error=location`);
      }
      locationId = await findOrCreateLocation(location);
    }
    const created = await createLiveStreamRecord({
      userId: user.id,
      title,
      locationId,
      eventId,
      requestId,
      investigationId: (() => {
        const value = formString(formData, "investigation_id");
        return value && value !== "__create__" ? value : null;
      })(),
    });
    redirect(`/live/${created.id}/broadcast`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Could not start a live report.";
    if (message === "live-privilege") {
      redirect(`${fallback}${fallback.includes("?") ? "&" : "?"}error=live-privilege`);
    }
    redirect(`${fallback}${fallback.includes("?") ? "&" : "?"}error=${encodeURIComponent(message === "location" ? "location" : message)}`);
  }
}
