"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createLicensingInquiry, updateLicensingInquiryStatus } from "@/lib/data";
import { isLicensingInquiryStatus, isLicensingIntendedUse } from "@/lib/licensing";
import { loginPath, safeNextPath } from "@/lib/paths";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function withError(path: string, error: string) {
  return `${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(error)}`;
}

export async function submitLicensingInquiry(formData: FormData) {
  const reportId = formString(formData, "report_id");
  const next = safeNextPath(formString(formData, "next")) ?? (reportId ? `/reports/${reportId}` : "/");
  const user = await getCurrentUser();
  if (!user) {
    redirect(loginPath(next));
  }

  const organizationName = formString(formData, "organization_name");
  const contactEmail = formString(formData, "contact_email");
  const intendedUse = formString(formData, "intended_use");
  const message = formString(formData, "message");
  const mediaId = formString(formData, "media_id") || null;

  if (!reportId || !organizationName || !contactEmail || !message || !isLicensingIntendedUse(intendedUse)) {
    redirect(withError(next, "Please complete every licensing field."));
  }
  if (!contactEmail.includes("@")) {
    redirect(withError(next, "Enter a valid email."));
  }

  try {
    await createLicensingInquiry({
      userId: user.id,
      reportId,
      mediaId,
      organizationName,
      contactEmail,
      intendedUse,
      message,
    });
    revalidatePath(next);
    revalidatePath("/profile/licensing");
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    const text = error instanceof Error ? error.message : "Could not submit this inquiry.";
    redirect(withError(next, text));
  }
  redirect(`${next}${next.includes("?") ? "&" : "?"}notice=licensing-inquiry`);
}

export async function setLicensingInquiryStatus(formData: FormData) {
  const inquiryId = formString(formData, "inquiry_id");
  const status = formString(formData, "status");
  const user = await getCurrentUser();
  if (!user) {
    redirect(loginPath("/profile/licensing"));
  }
  if (!inquiryId || !isLicensingInquiryStatus(status)) {
    redirect("/profile/licensing?error=status");
  }
  try {
    await updateLicensingInquiryStatus(user.id, inquiryId, status);
    revalidatePath("/profile/licensing");
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    const text = error instanceof Error ? error.message : "Could not update this inquiry.";
    redirect(`/profile/licensing?error=${encodeURIComponent(text)}`);
  }
  redirect("/profile/licensing");
}
