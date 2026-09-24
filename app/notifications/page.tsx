import { MarkAllReadButton, NotificationList, NotificationPreferenceForm } from "@/components/notification-inbox";
import { EmptyState, Notice, Page, Section } from "@/components/ui/page";
import { getNotificationPreferences, listNotifications } from "@/lib/data";
import { groupNotifications } from "@/lib/notifications";
import { requireUser } from "@/lib/require-user";

type NotificationsPageProps = {
  searchParams: Promise<{ notice?: string }>;
};

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const user = await requireUser("/notifications");
  const { notice } = await searchParams;
  const [items, preferences] = await Promise.all([
    listNotifications(user.id),
    getNotificationPreferences(user.id),
  ]);
  const grouped = groupNotifications(items);
  const unread = items.filter((item) => !item.readAt).length;

  return (
    <Page width="article">
      <p className="fh-kicker">Inbox</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="fh-hero">Notifications</h1>
          <p className="mt-3 max-w-2xl fh-lede">
            Coverage demand, new firsthand reports, livestreams, and licensing — from reporters and
            places you follow, plus your home city. Firsthand does not send email, SMS, or push yet.
          </p>
        </div>
        <MarkAllReadButton disabled={unread === 0} />
      </div>

      {notice === "preferences" ? (
        <Notice>
          Notification settings saved. These apply to this in-app inbox now, and can later apply to
          other channels without changing what events are generated.
        </Notice>
      ) : null}

      {items.length === 0 ? (
        <EmptyState title="No notifications yet. Follow a reporter or a location, or set a home city on your public profile, to hear about coverage wanted and new firsthand reports." />
      ) : (
        <>
          <NotificationList title="Today" items={grouped.today} />
          <NotificationList title="Earlier" items={grouped.earlier} />
        </>
      )}

      <Section
        title="Settings"
        description="Choose which kinds of in-app notifications you receive. This is not a live GPS tracker — coverage nearby uses your home city and followed locations."
      >
        <NotificationPreferenceForm preferences={preferences} />
      </Section>
    </Page>
  );
}
