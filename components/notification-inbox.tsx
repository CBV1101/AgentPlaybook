import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
  openNotificationAction,
  updateNotificationPreferencesAction,
} from "@/lib/notification-actions";
import {
  NOTIFICATION_PREFERENCE_LABELS,
  NOTIFICATION_PREFERENCE_KEYS,
  notificationHref,
  type NotificationPreferences,
  type NotificationRecord,
} from "@/lib/notifications";
import { formatWhen } from "@/lib/format";
import { Button, buttonClass } from "@/components/ui/button";
import Link from "next/link";

export function NotificationList({
  title,
  items,
}: {
  title: string;
  items: NotificationRecord[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mt-8">
      <h2 className="fh-label">{title}</h2>
      <ul className="mt-3">
        {items.map((item) => (
          <li key={item.id} className="fh-list-row">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                {!item.readAt ? <p className="fh-kicker">Unread</p> : null}
                <p className="text-ink">{item.message}</p>
                <p className="mt-1 fh-meta">{formatWhen(item.createdAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <form action={openNotificationAction}>
                  <input type="hidden" name="notification_id" value={item.id} />
                  <Button type="submit">Open</Button>
                </form>
                {!item.readAt ? (
                  <form action={markNotificationReadAction}>
                    <input type="hidden" name="notification_id" value={item.id} />
                    <Button type="submit" variant="secondary">
                      Mark as read
                    </Button>
                  </form>
                ) : (
                  <Link href={notificationHref(item)} className={buttonClass("secondary")}>
                    View
                  </Link>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MarkAllReadButton({ disabled }: { disabled: boolean }) {
  return (
    <form action={markAllNotificationsReadAction}>
      <Button type="submit" variant="secondary" disabled={disabled}>
        Mark all as read
      </Button>
    </form>
  );
}

export function NotificationPreferenceForm({ preferences }: { preferences: NotificationPreferences }) {
  return (
    <form action={updateNotificationPreferencesAction} className="mt-4 space-y-3">
      {NOTIFICATION_PREFERENCE_KEYS.map((key) => (
        <label key={key} className="flex items-center gap-3 text-sm text-ink">
          <input
            type="checkbox"
            name={key}
            defaultChecked={preferences[key]}
            className="h-4 w-4 rounded border-line"
          />
          {NOTIFICATION_PREFERENCE_LABELS[key]}
        </label>
      ))}
      <Button type="submit" className="mt-2">
        Save notification settings
      </Button>
    </form>
  );
}
