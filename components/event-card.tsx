import Link from "next/link";
import { LiveBadge } from "@/components/ui/badge";
import { eventHref, eventStatusLabel } from "@/lib/events";
import { formatWhen } from "@/lib/format";
import type { EventSummary } from "@/lib/types";

export function EventCard({
  event,
  live = false,
}: {
  event: EventSummary;
  live?: boolean;
}) {
  return (
    <article className="fh-content-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        {live ? <LiveBadge /> : null}
        <p className="fh-meta">{event.location.label}</p>
      </div>
      <Link href={eventHref(event.id)} className="mt-2 block hover:underline">
        <h3 className="fh-report-title">{event.title}</h3>
      </Link>
      <p className="mt-2 fh-meta">
        {event.reportCount} firsthand {event.reportCount === 1 ? "report" : "reports"}
        {live ? " · Live now" : ""}
      </p>
      <p className="mt-1 fh-label">
        {eventStatusLabel(event.status)}
        {" · "}
        Started {formatWhen(event.startedAt)}
      </p>
    </article>
  );
}
