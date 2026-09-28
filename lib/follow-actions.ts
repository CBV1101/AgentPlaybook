"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  followLocation as followLocationRecord,
  followReporter as followReporterRecord,
  followInvestigation as followInvestigationRecord,
  unfollowLocation as unfollowLocationRecord,
  unfollowReporter as unfollowReporterRecord,
  unfollowInvestigation as unfollowInvestigationRecord,
} from "@/lib/data";
import type { GeoFollowKind, GeoFollowTarget } from "@/lib/follows";
import { parseCoordinate } from "@/lib/location";
import { loginPath, safeNextPath } from "@/lib/paths";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nextFromForm(formData: FormData) {
  return safeNextPath(formString(formData, "next")) ?? "/following";
}

function withError(path: string, error: string) {
  return `${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(error)}`;
}

function geoTargetFromForm(formData: FormData): GeoFollowTarget | null {
  const kind = formString(formData, "kind") as GeoFollowKind;
  const country = formString(formData, "country");
  const city = formString(formData, "city");
  const locationId = formString(formData, "location_id");
  const latitude = parseCoordinate(formString(formData, "latitude"));
  const longitude = parseCoordinate(formString(formData, "longitude"));

  if (kind === "place") {
    if (!locationId || !country) {
      return null;
    }
    return { kind, label: formString(formData, "label"), country, locationId };
  }
  if (kind === "city") {
    if (!country || !city) {
      return null;
    }
    return { kind, label: city, country, city, latitude, longitude };
  }
  if (kind === "country") {
    if (!country) {
      return null;
    }
    return { kind, label: country, country, latitude, longitude };
  }
  return null;
}

function revalidateFollows(next: string) {
  revalidatePath(next);
  revalidatePath("/following");
}

export async function followReporter(formData: FormData) {
  const next = nextFromForm(formData);
  const reporterId = formString(formData, "reporter_id");
  const user = await getCurrentUser();
  if (!user) {
    redirect(loginPath(next));
  }
  if (!reporterId) {
    redirect(withError(next, "reporter"));
  }
  try {
    await followReporterRecord(user.id, reporterId);
    revalidateFollows(next);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Could not follow this reporter.";
    redirect(withError(next, message));
  }
  redirect(next);
}

export async function unfollowReporter(formData: FormData) {
  const next = nextFromForm(formData);
  const reporterId = formString(formData, "reporter_id");
  const user = await getCurrentUser();
  if (!user) {
    redirect(loginPath(next));
  }
  if (!reporterId) {
    redirect(withError(next, "reporter"));
  }
  try {
    await unfollowReporterRecord(user.id, reporterId);
    revalidateFollows(next);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Could not unfollow this reporter.";
    redirect(withError(next, message));
  }
  redirect(next);
}

export async function followInvestigation(formData: FormData) {
  const next = nextFromForm(formData);
  const investigationId = formString(formData, "investigation_id");
  const user = await getCurrentUser();
  if (!user) {
    redirect(loginPath(next));
  }
  if (!investigationId) {
    redirect(withError(next, "investigation"));
  }
  try {
    await followInvestigationRecord(user.id, investigationId);
    revalidateFollows(next);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Could not follow this investigation.";
    redirect(withError(next, message));
  }
  redirect(next);
}

export async function unfollowInvestigation(formData: FormData) {
  const next = nextFromForm(formData);
  const investigationId = formString(formData, "investigation_id");
  const user = await getCurrentUser();
  if (!user) {
    redirect(loginPath(next));
  }
  if (!investigationId) {
    redirect(withError(next, "investigation"));
  }
  try {
    await unfollowInvestigationRecord(user.id, investigationId);
    revalidateFollows(next);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Could not unfollow this investigation.";
    redirect(withError(next, message));
  }
  redirect(next);
}

export async function followLocation(formData: FormData) {
  const next = nextFromForm(formData);
  const user = await getCurrentUser();
  if (!user) {
    redirect(loginPath(next));
  }
  const target = geoTargetFromForm(formData);
  if (!target) {
    redirect(withError(next, "location"));
  }
  try {
    await followLocationRecord(user.id, target);
    revalidateFollows(next);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Could not follow this location.";
    redirect(withError(next, message));
  }
  redirect(next);
}

export async function unfollowLocation(formData: FormData) {
  const next = nextFromForm(formData);
  const user = await getCurrentUser();
  if (!user) {
    redirect(loginPath(next));
  }
  const target = geoTargetFromForm(formData);
  if (!target) {
    redirect(withError(next, "location"));
  }
  try {
    await unfollowLocationRecord(user.id, target);
    revalidateFollows(next);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Could not unfollow this location.";
    redirect(withError(next, message));
  }
  redirect(next);
}
