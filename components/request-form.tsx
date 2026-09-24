"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { createCoverageRequest } from "@/lib/coverage-actions";
import { EventAssociationField } from "@/components/event-association-field";
import { GeocodedLocationField } from "@/components/geocoded-location-field";
import { Button } from "@/components/ui/button";
import { Field, Textarea, TextInput } from "@/components/ui/field";
import { ErrorState, Notice } from "@/components/ui/page";
import { PLATFORM_PUBLISHING_RULE } from "@/lib/moderation";
import type { GeocodeSuggestion } from "@/lib/location";

const errorCopy: Record<string, string> = {
  supabase: "Supabase is not configured yet, so requests cannot be saved.",
  title: "Add a question so reporters know what to look for.",
  location: "Search for a place and choose a result before submitting.",
};

type RequestFormProps = {
  error?: string;
};

export function RequestForm({ error }: RequestFormProps) {
  const [pickedLocation, setPickedLocation] = useState<GeocodeSuggestion | null>(null);

  return (
    <form action={createCoverageRequest} className="space-y-5">
      {error ? <ErrorState>{errorCopy[error] ?? error}</ErrorState> : null}

      <Notice>{PLATFORM_PUBLISHING_RULE}</Notice>

      <Field label="Question" htmlFor="title">
        <TextInput
          id="title"
          name="title"
          required
          maxLength={200}
          placeholder="What's actually happening at Görlitzer Park?"
        />
      </Field>

      <GeocodedLocationField onSelectedChange={setPickedLocation} />

      <EventAssociationField location={pickedLocation} />

      <Field label="Additional context" htmlFor="description">
        <Textarea
          id="description"
          name="description"
          rows={5}
          maxLength={5000}
          placeholder="I've seen conflicting reports about conditions in the park. Can someone go there and show what it's actually like firsthand?"
        />
      </Field>

      <SubmitRequestButton />
    </form>
  );
}

function SubmitRequestButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Publishing request…" : "Publish request"}
    </Button>
  );
}
