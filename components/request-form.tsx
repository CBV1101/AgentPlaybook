import { createCoverageRequest } from "@/lib/coverage-actions";
import { GeocodedLocationField } from "@/components/geocoded-location-field";
import { PLATFORM_PUBLISHING_RULE } from "@/lib/moderation";

const errorCopy: Record<string, string> = {
  supabase: "Supabase is not configured yet, so requests cannot be saved.",
  title: "Add a question so reporters know what to look for.",
  location: "Search for a place and choose a result before submitting.",
};

type RequestFormProps = {
  error?: string;
};

export function RequestForm({ error }: RequestFormProps) {
  return (
    <form action={createCoverageRequest} className="space-y-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      {error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
          {errorCopy[error] ?? error}
        </p>
      ) : null}

      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-stone-800">
        {PLATFORM_PUBLISHING_RULE}
      </p>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-stone-700">
          Question
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={200}
          placeholder="What's actually happening at Görlitzer Park?"
          className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 outline-none focus:border-stone-500"
        />
      </div>

      <GeocodedLocationField />

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-stone-700">
          Additional context
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          maxLength={5000}
          placeholder="I've seen conflicting reports about conditions in the park. Can someone go there and show what it's actually like firsthand?"
          className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 outline-none focus:border-stone-500"
        />
      </div>

      <button
        type="submit"
        className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-800"
      >
        Publish request
      </button>
    </form>
  );
}
