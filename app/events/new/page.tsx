import { EventForm } from "@/components/event-form";
import { Page } from "@/components/ui/page";
import { requireUser } from "@/lib/require-user";

type NewEventPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewEventPage({ searchParams }: NewEventPageProps) {
  await requireUser("/events/new");
  const { error } = await searchParams;

  return (
    <Page width="narrow">
      <h1 className="fh-title">Create an event</h1>
      <p className="mt-2 fh-lede">
        Group firsthand reports and coverage requests around a specific occurrence at a location.
        Locations remain the permanent archive. This event is not a conclusion about what happened.
      </p>
      <div className="mt-8">
        <EventForm error={error} />
      </div>
    </Page>
  );
}
