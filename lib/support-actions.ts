"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { removeReportSupport, supportReport } from "@/lib/data";
import { loginPath, safeNextPath } from "@/lib/paths";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nextFromForm(formData: FormData) {
  return safeNextPath(formString(formData, "next")) ?? "/";
}

function withError(path: string, error: string) {
  return `${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(error)}`;
}

export async function addReportSupport(formData: FormData) {
  const next = nextFromForm(formData);
  const reportId = formString(formData, "report_id");
  const user = await getCurrentUser();
  if (!user) {
    redirect(loginPath(next));
  }
  if (!reportId) {
    redirect(withError(next, "report"));
  }
  try {
    await supportReport(reportId, user.id);
    revalidatePath(next);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Could not support this reporting.";
    redirect(withError(next, message));
  }
  redirect(next);
}

export async function withdrawReportSupport(formData: FormData) {
  const next = nextFromForm(formData);
  const reportId = formString(formData, "report_id");
  const user = await getCurrentUser();
  if (!user) {
    redirect(loginPath(next));
  }
  if (!reportId) {
    redirect(withError(next, "report"));
  }
  try {
    await removeReportSupport(reportId, user.id);
    revalidatePath(next);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Could not remove support.";
    redirect(withError(next, message));
  }
  redirect(next);
}
