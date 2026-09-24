import { createEvent } from "@/lib/event-actions";
import { GeocodedLocationField } from "@/components/geocoded-location-field";
import { Button } from "@/components/ui/button";
import { Field, Textarea, TextInput } from "@/components/ui/field";
import { ErrorState, Notice } from "@/components/ui/page";

const errorCopy: Record<string, string> = {
  title: "Add a title so people know which occurrence this groups.",
  location: "Search for a place and choose a result before creating the event.",
  started: "Add when this occurrence started.",
};

type EventFormProps = {
  error?: string;
};

export function EventForm({ error }: EventFormProps) {
  const startedDefault = new Date().toISOString().slice(0, 16);

  return (
    <form action={createEvent} className="space-y-5">
      {error ? <ErrorState>{errorCopy[error] ?? error}</ErrorState> : null}

      <Notice>
        An event is a container for firsthand reporting about the same occurrence. Firsthand does not
        conclude what happened.
      </Notice>

      <Field label="Title" htmlFor="title">
        <TextInput
          id="title"
          name="title"
          required
          maxLength={200}
          placeholder="Public demonstration at Alexanderplatz"
        />
      </Field>

      <GeocodedLocationField />

      <Field label="Description" htmlFor="description">
        <Textarea
          id="description"
          name="description"
          rows={4}
          maxLength={5000}
          placeholder="What occurrence are people reporting from? Avoid stating unverified facts."
        />
      </Field>

      <Field label="Started at" htmlFor="started_at">
        <TextInput
          id="started_at"
          name="started_at"
          type="datetime-local"
          required
          defaultValue={startedDefault}
        />
      </Field>

      <Button type="submit">Create event</Button>
    </form>
  );
}
