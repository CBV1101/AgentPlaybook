import type { EventRecord } from "@/lib/database.types";
import type { EventStatus } from "@/lib/types";

export function eventStatusLabel(status: EventStatus | string) {
  if (status === "ended") {
    return "Ended";
  }
  if (status === "archived") {
    return "Archived";
  }
  return "Active";
}

export function eventHref(id: string) {
  return `/events/${id}`;
}

export function assertEventAttachable(event: EventRecord | null | undefined, locationId: string) {
  if (!event) {
    throw new Error("That event was not found.");
  }
  if (event.status !== "active") {
    throw new Error("You can only attach to an active event.");
  }
  if (event.location_id !== locationId) {
    throw new Error("That event is at a different location.");
  }
}
