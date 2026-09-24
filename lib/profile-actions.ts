"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { setReporterAvatar, updateReporterProfile } from "@/lib/data";
import { loginPath, safeNextPath } from "@/lib/paths";
import {
  avatarValidationError,
  parseReporterTopics,
  validateReporterProfileFields,
} from "@/lib/profile";

function formString(formData: FormData, key: string) {
  return typeof formData.get(key) === "string" ? String(formData.get(key)).trim() : "";
}

function withProfileError(error: string, next?: string | null) {
  const safe = safeNextPath(next);
  return safe
    ? `/profile?error=${encodeURIComponent(error)}&next=${encodeURIComponent(safe)}`
    : `/profile?error=${encodeURIComponent(error)}`;
}

export async function saveReporterProfile(formData: FormData) {
  const next = safeNextPath(formString(formData, "next"));
  const user = await getCurrentUser();
  if (!user) {
    redirect(loginPath("/profile"));
  }

  const validated = validateReporterProfileFields({
    username: formString(formData, "username"),
    displayName: formString(formData, "display_name"),
    bio: formString(formData, "bio"),
    homeCity: formString(formData, "home_city"),
    homeCountry: formString(formData, "home_country"),
  });
  if (!validated.ok) {
    redirect(withProfileError(validated.error, next));
  }

  const avatar = formData.get("avatar");
  const removeAvatar = formString(formData, "remove_avatar") === "1";
  const file = avatar instanceof File && avatar.size > 0 ? avatar : null;
  if (file) {
    const invalid = avatarValidationError({
      type: file.type,
      size: file.size,
      name: file.name,
    });
    if (invalid) {
      redirect(withProfileError("avatar", next));
    }
  }

  try {
    if (file) {
      await setReporterAvatar(user.id, {
        bytes: new Uint8Array(await file.arrayBuffer()),
        filename: file.name,
        contentType: file.type || "image/jpeg",
        size: file.size,
      });
    } else if (removeAvatar) {
      await setReporterAvatar(user.id, null);
    }

    const profile = await updateReporterProfile(user.id, {
      username: validated.username,
      displayName: validated.displayName,
      bio: validated.bio,
      homeCity: validated.homeCity,
      homeCountry: validated.homeCountry,
      topics: parseReporterTopics(formData.getAll("topics").map(String)),
    });

    if (next) {
      redirect(next);
    }
    redirect(`/u/${profile.username}`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Could not save the profile.";
    const code = message === "username-taken" || message === "username" || message === "profile" ? message : "save";
    redirect(withProfileError(code, next));
  }
}
