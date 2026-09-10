"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createCoverageRequestRecord, createReportRecord, expressInterestRecord } from "@/lib/data";
import { parseCoordinate, type StructuredLocation } from "@/lib/location";
import { loginPath, safeNextPath } from "@/lib/paths";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
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

function withError(path: string, error: string) {
  return `${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(error)}`;
}

export async function createCoverageRequest(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(loginPath("/requests/new"));
  }

  const title = formString(formData, "title");
  const description = formString(formData, "description");
  const location = locationFromForm(formData);

  if (!title) {
    redirect("/requests/new?error=title");
  }
  if (!location) {
    redirect("/requests/new?error=location");
  }

  try {
    const id = await createCoverageRequestRecord({
      userId: user.id,
      title,
      description: description || null,
      location,
    });
    redirect(`/requests/${id}`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Could not create the request.";
    redirect(`/requests/new?error=${encodeURIComponent(message)}`);
  }
}

export async function expressInterest(formData: FormData) {
  const requestId = formString(formData, "request_id");
  const next = safeNextPath(formString(formData, "next")) ?? (requestId ? `/requests/${requestId}` : "/");
  const user = await getCurrentUser();

  if (!user) {
    redirect(loginPath(next));
  }
  if (!requestId) {
    redirect(next);
  }

  try {
    await expressInterestRecord(requestId, user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save interest.";
    redirect(withError(next, message));
  }

  redirect(next);
}

export async function createReport(formData: FormData) {
  const requestId = formString(formData, "request_id") || null;
  const fallbackNext = requestId ? `/reports/new?requestId=${requestId}` : "/reports/new";
  const user = await getCurrentUser();

  if (!user) {
    redirect(loginPath(fallbackNext));
  }

  const title = formString(formData, "title");
  const description = formString(formData, "description");
  const capturedAt = formString(formData, "captured_at");
  const locationId = formString(formData, "location_id");
  const location = locationFromForm(formData);
  const confirmation = formString(formData, "firsthand_attestation");
  const licensingStatus = formString(formData, "licensing_status");
  const files = formData
    .getAll("media")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (confirmation !== "on") {
    redirect(withError(fallbackNext, "attestation"));
  }
  if (formString(formData, "allegation_acknowledged") !== "on") {
    redirect(withError(fallbackNext, "allegation"));
  }
  if (licensingStatus !== "view_only" && licensingStatus !== "licensing_available") {
    redirect(withError(fallbackNext, "licensing"));
  }
  if (!title || !description) {
    redirect(withError(fallbackNext, "missing"));
  }
  if (files.length === 0) {
    redirect(withError(fallbackNext, "media"));
  }

  try {
    const created = await createReportRecord({
      userId: user.id,
      title,
      description,
      capturedAt: capturedAt ? new Date(capturedAt).toISOString() : new Date().toISOString(),
      requestId,
      locationId: locationId || undefined,
      location,
      files,
      licensingStatus,
    });

    redirect(`/reports/${created.id}`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Could not publish the report.";
    redirect(withError(fallbackNext, message === "location" ? "location" : message));
  }
}
