"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import {
  addInvestigationContentRecord,
  createInvestigationRecord,
  deleteInvestigationRecord,
  findOrCreateLocation,
  getProfileByUserId,
  removeInvestigationItemRecord,
  reorderInvestigationItemsRecord,
  updateInvestigationRecord,
} from "@/lib/data";
import type { InvestigationStatus } from "@/lib/database.types";
import { parseCoordinate, type StructuredLocation } from "@/lib/location";
import { loginPath, reporterProfileSetupPath } from "@/lib/paths";
import { isReporterProfileComplete } from "@/lib/profile";

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
  return {
    country,
    city,
    place: placeValue || null,
    latitude,
    longitude,
  };
}

async function requireReporter() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(loginPath("/profile/investigations"));
  }
  const profile = await getProfileByUserId(user.id);
  if (!profile || !isReporterProfileComplete(profile)) {
    redirect(reporterProfileSetupPath("/profile/investigations"));
  }
  return { user, profile };
}

export async function createInvestigation(formData: FormData) {
  const { user } = await requireReporter();
  const title = formString(formData, "title");
  const description = formString(formData, "description") || null;
  const status = formString(formData, "status") === "published" ? "published" : "draft";
  const attachReportId = formString(formData, "attach_report_id") || null;
  const location = locationFromForm(formData);
  if (!title) {
    redirect("/profile/investigations/new?error=title");
  }
  try {
    const locationId = location ? await findOrCreateLocation(location) : null;
    const created = await createInvestigationRecord({
      userId: user.id,
      title,
      description,
      locationId,
      status: status as InvestigationStatus,
    });
    if (attachReportId) {
      await addInvestigationContentRecord(user.id, created.id, { reportId: attachReportId });
    }
    revalidatePath("/profile/investigations");
    revalidatePath(`/u/${(await getProfileByUserId(user.id))?.username ?? ""}`);
    redirect(`/profile/investigations/${created.id}`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Could not create the investigation.";
    redirect(`/profile/investigations/new?error=${encodeURIComponent(message)}`);
  }
}

export async function updateInvestigation(formData: FormData) {
  const { user } = await requireReporter();
  const id = formString(formData, "investigation_id");
  const title = formString(formData, "title");
  const description = formString(formData, "description") || null;
  const statusRaw = formString(formData, "status");
  const status: InvestigationStatus | undefined =
    statusRaw === "published" || statusRaw === "draft" || statusRaw === "archived" ? statusRaw : undefined;
  const location = locationFromForm(formData);
  if (!id) {
    redirect("/profile/investigations");
  }
  try {
    const locationId = location ? await findOrCreateLocation(location) : undefined;
    await updateInvestigationRecord(user.id, id, {
      title: title || undefined,
      description,
      status,
      locationId,
    });
    revalidatePath(`/profile/investigations/${id}`);
    redirect(`/profile/investigations/${id}`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Could not update the investigation.";
    redirect(`/profile/investigations/${id}?error=${encodeURIComponent(message)}`);
  }
}

export async function deleteInvestigation(formData: FormData) {
  const { user, profile } = await requireReporter();
  const id = formString(formData, "investigation_id");
  if (!id) {
    redirect("/profile/investigations");
  }
  await deleteInvestigationRecord(user.id, id);
  revalidatePath("/profile/investigations");
  revalidatePath(`/u/${profile?.username ?? ""}`);
  redirect("/profile/investigations");
}

export async function addInvestigationPart(formData: FormData) {
  const { user } = await requireReporter();
  const investigationId = formString(formData, "investigation_id");
  const reportId = formString(formData, "report_id") || null;
  const liveStreamId = formString(formData, "live_stream_id") || null;
  if (!investigationId) {
    redirect("/profile/investigations");
  }
  try {
    await addInvestigationContentRecord(user.id, investigationId, { reportId, liveStreamId });
    revalidatePath(`/profile/investigations/${investigationId}`);
    redirect(`/profile/investigations/${investigationId}`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Could not add that reporting.";
    redirect(`/profile/investigations/${investigationId}?error=${encodeURIComponent(message)}`);
  }
}

export async function removeInvestigationPart(formData: FormData) {
  const { user } = await requireReporter();
  const investigationId = formString(formData, "investigation_id");
  const itemId = formString(formData, "item_id");
  await removeInvestigationItemRecord(user.id, itemId);
  revalidatePath(`/profile/investigations/${investigationId}`);
  redirect(`/profile/investigations/${investigationId}`);
}

export async function moveInvestigationPart(formData: FormData) {
  const { user } = await requireReporter();
  const investigationId = formString(formData, "investigation_id");
  const ordered = formString(formData, "ordered_ids")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  await reorderInvestigationItemsRecord(user.id, investigationId, ordered);
  revalidatePath(`/profile/investigations/${investigationId}`);
  redirect(`/profile/investigations/${investigationId}`);
}
