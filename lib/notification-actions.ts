"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  listNotifications,
  markAllNotificationsRead as markAllReadRecord,
  markNotificationRead as markReadRecord,
  updateNotificationPreferences as updatePreferencesRecord,
} from "@/lib/data";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  notificationHref,
  type NotificationPreferenceKey,
  type NotificationPreferences,
} from "@/lib/notifications";
import { loginPath } from "@/lib/paths";

function revalidateInbox() {
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

export async function markNotificationReadAction(formData: FormData) {
  const user = await getCurrentUser();
  const id = String(formData.get("notification_id") ?? "");
  if (!user) {
    redirect(loginPath("/notifications"));
  }
  if (!id) {
    redirect("/notifications");
  }
  await markReadRecord(user.id, id);
  revalidateInbox();
}

export async function openNotificationAction(formData: FormData) {
  const user = await getCurrentUser();
  const id = String(formData.get("notification_id") ?? "");
  if (!user) {
    redirect(loginPath("/notifications"));
  }
  const items = await listNotifications(user.id);
  const item = items.find((row) => row.id === id);
  if (!item) {
    redirect("/notifications");
  }
  await markReadRecord(user.id, item.id);
  revalidateInbox();
  redirect(notificationHref(item));
}

export async function markAllNotificationsReadAction() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(loginPath("/notifications"));
  }
  await markAllReadRecord(user.id);
  revalidateInbox();
}

export async function updateNotificationPreferencesAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(loginPath("/notifications"));
  }
  const next: NotificationPreferences = { ...DEFAULT_NOTIFICATION_PREFERENCES };
  for (const key of Object.keys(next) as NotificationPreferenceKey[]) {
    next[key] = formData.get(key) === "on";
  }
  await updatePreferencesRecord(user.id, next);
  revalidateInbox();
  redirect("/notifications?notice=preferences");
}
