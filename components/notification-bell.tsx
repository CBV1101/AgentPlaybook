import Link from "next/link";

export function NotificationBell({ unread }: { unread: number }) {
  const label = unread === 0 ? "Notifications" : `Notifications, ${unread} unread`;

  return (
    <Link
      href="/notifications"
      aria-label={label}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-line text-ink hover:bg-canvas fh-focus"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.75]">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"
        />
      </svg>
      {unread > 0 ? (
        <span className="absolute -right-1 -top-1 min-w-4 rounded-sm bg-live px-1 text-center text-[10px] font-semibold leading-4 text-surface">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
