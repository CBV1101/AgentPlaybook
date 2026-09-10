"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { removeReportedContent, submitModerationReport, updateModerationStatus } from "@/lib/data";
import { MODERATION_REASONS, type ModerationContentType } from "@/lib/moderation";
import { loginPath, safeNextPath } from "@/lib/paths";
import { requireAdmin } from "@/lib/require-admin";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function withNotice(path: string, notice: string) {
  return `${path}${path.includes("?") ? "&" : "?"}notice=${encodeURIComponent(notice)}`;
}

function withError(path: string, error: string) {
  return `${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(error)}`;
}

export async function submitContentReport(formData: FormData) {
  const contentType = formString(formData, "content_type") as ModerationContentType;
  const contentId = formString(formData, "content_id");
  const next = safeNextPath(formString(formData, "next")) ?? "/";
  const user = await getCurrentUser();

  if (!user) {
    redirect(loginPath(next));
  }

  if (contentType !== "firsthand_report" && contentType !== "coverage_request") {
    redirect(withError(next, "content"));
  }
  if (!contentId) {
    redirect(withError(next, "content"));
  }

  const reason = formString(formData, "reason");
  if (!MODERATION_REASONS.some((item) => item.id === reason)) {
    redirect(withError(next, "reason"));
  }

  const details = formString(formData, "details") || null;

  try {
    await submitModerationReport({
      userId: user.id,
      contentType,
      contentId,
      reason,
      details,
    });
    redirect(withNotice(next, "reported"));
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Could not submit the report.";
    redirect(withError(next, message));
  }
}

export async function dismissModerationReport(formData: FormData) {
  await requireAdmin();
  const id = formString(formData, "id");
  if (id) {
    await updateModerationStatus(id, "dismissed");
  }
  redirect("/admin/moderation?notice=dismissed");
}

export async function markModerationReviewed(formData: FormData) {
  await requireAdmin();
  const id = formString(formData, "id");
  if (id) {
    await updateModerationStatus(id, "reviewed");
  }
  redirect("/admin/moderation?notice=reviewed");
}

export async function removeReportedContentAction(formData: FormData) {
  await requireAdmin();
  const id = formString(formData, "id");
  if (id) {
    await removeReportedContent(id);
  }
  redirect("/admin/moderation?notice=removed");
}
