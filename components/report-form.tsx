"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { GeocodedLocationField } from "@/components/geocoded-location-field";
import { createReport } from "@/lib/coverage-actions";
import { ALLEGATION_WARNING, PLATFORM_PUBLISHING_RULE } from "@/lib/moderation";

type ReportFormProps = {
  mode: "independent" | "response";
  requestId?: string;
  requestTitle?: string;
  locationId?: string;
  locationLabel?: string;
  error?: string;
};

const errorCopy: Record<string, string> = {
  missing: "Add a title and a description of what you saw.",
  location: "Search for a place and choose a result before publishing.",
  media: "Add at least one photo or video you captured yourself.",
  attestation: "Confirm that you created or captured this media before publishing.",
  allegation: "Acknowledge the warning about allegations before publishing.",
  licensing: "Choose whether this media is view only or available for licensing.",
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="min-h-12 w-full rounded-full bg-stone-900 px-5 py-3 text-base font-medium text-white hover:bg-stone-800 disabled:opacity-60 sm:w-auto"
    >
      {pending ? "Publishing…" : "Publish firsthand report"}
    </button>
  );
}

export function ReportForm({
  mode,
  requestId,
  requestTitle,
  locationId,
  locationLabel,
  error,
}: ReportFormProps) {
  const [files, setFiles] = useState<File[]>([]);
  const previews = useMemo(
    () =>
      files.map((file) => ({
        name: file.name,
        type: file.type,
        url: URL.createObjectURL(file),
      })),
    [files],
  );

  const capturedDefault = new Date().toISOString().slice(0, 16);

  function addFiles(list: FileList | null) {
    if (!list) {
      return;
    }
    setFiles((current) => [...current, ...Array.from(list)]);
  }

  async function publish(formData: FormData) {
    formData.delete("media");
    for (const file of files) {
      formData.append("media", file);
    }
    await createReport(formData);
  }

  return (
    <form action={publish} className="space-y-6">
      {error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
          {errorCopy[error] ?? error}
        </p>
      ) : null}

      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-stone-800">
        {PLATFORM_PUBLISHING_RULE}
      </p>

      {requestId ? <input type="hidden" name="request_id" value={requestId} /> : null}
      {locationId ? <input type="hidden" name="location_id" value={locationId} /> : null}

      {mode === "response" && requestTitle ? (
        <p className="rounded-xl bg-stone-100 px-3 py-2 text-sm text-stone-700">
          Responding to: <span className="font-medium">{requestTitle}</span>
        </p>
      ) : null}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-stone-700">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={200}
          placeholder="What did you see?"
          className="mt-1 min-h-12 w-full rounded-xl border border-stone-300 px-3 py-3 text-base outline-none focus:border-stone-500"
        />
      </div>

      {locationLabel ? (
        <div>
          <p className="text-sm font-medium text-stone-700">Location</p>
          <p className="mt-1 text-stone-800">{locationLabel}</p>
        </div>
      ) : (
        <GeocodedLocationField />
      )}

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-stone-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={6}
          maxLength={20000}
          placeholder="Describe what you saw, when, and from where. Do not paste someone else's footage."
          className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-3 text-base outline-none focus:border-stone-500"
        />
      </div>

      <div>
        <label htmlFor="captured_at" className="block text-sm font-medium text-stone-700">
          When was this captured?
        </label>
        <input
          id="captured_at"
          name="captured_at"
          type="datetime-local"
          required
          defaultValue={capturedDefault}
          className="mt-1 min-h-12 w-full rounded-xl border border-stone-300 px-3 py-3 text-base outline-none focus:border-stone-500"
        />
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-stone-700">Video / photo upload</legend>
        <p className="mt-1 text-sm text-stone-500">
          Upload media you created or captured. Reposted social clips and other people&apos;s footage
          cannot be labeled as firsthand reporting.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-full border border-stone-300 px-4 py-3 text-sm font-medium text-stone-800">
            Add photos
            <input
              className="sr-only"
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
          <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-full border border-stone-300 px-4 py-3 text-sm font-medium text-stone-800">
            Add video
            <input
              className="sr-only"
              type="file"
              accept="video/*"
              capture="environment"
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        </div>
        <label className="mt-3 flex min-h-12 cursor-pointer items-center justify-center rounded-full border border-dashed border-stone-300 px-4 py-3 text-sm text-stone-700">
          Choose from library
          <input
            className="sr-only"
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
        {previews.length > 0 ? (
          <ul className="mt-4 grid grid-cols-2 gap-3">
            {previews.map((preview, index) => (
              <li key={preview.url} className="overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
                {preview.type.startsWith("video/") ? (
                  <video src={preview.url} className="h-28 w-full object-cover" muted playsInline />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview.url} alt="" className="h-28 w-full object-cover" />
                )}
                <div className="flex items-center justify-between gap-2 px-2 py-1">
                  <p className="truncate text-xs text-stone-600">{preview.name}</p>
                  <button
                    type="button"
                    className="text-xs text-stone-700 underline"
                    onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-rose-800">At least one photo or video is required.</p>
        )}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-stone-700">Media usage</legend>
        <label className="flex cursor-pointer gap-3 rounded-2xl border border-stone-300 p-4 has-[:checked]:border-stone-900 has-[:checked]:bg-stone-50">
          <input
            type="radio"
            name="licensing_status"
            value="view_only"
            defaultChecked
            className="mt-1 size-5"
            required
          />
          <span>
            <span className="block font-medium text-stone-900">View only</span>
            <span className="mt-1 block text-sm text-stone-600">
              People can watch this report on the platform, but the creator is not offering commercial
              licensing.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer gap-3 rounded-2xl border border-stone-300 p-4 has-[:checked]:border-stone-900 has-[:checked]:bg-stone-50">
          <input
            type="radio"
            name="licensing_status"
            value="licensing_available"
            className="mt-1 size-5"
          />
          <span>
            <span className="block font-medium text-stone-900">Available for licensing</span>
            <span className="mt-1 block text-sm text-stone-600">
              The creator is open to commercial licensing requests for this media.
            </span>
          </span>
        </label>
      </fieldset>

      <label className="flex cursor-pointer gap-3 rounded-2xl border border-stone-300 p-4">
        <input
          id="firsthand_attestation"
          name="firsthand_attestation"
          type="checkbox"
          required
          className="mt-1 size-5"
        />
        <span className="text-sm text-stone-800">
          I confirm that I created or captured the media I&apos;m uploading and have the right to
          publish it. I am not uploading reposted third-party content as firsthand reporting.
        </span>
      </label>

      <label className="flex cursor-pointer gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <input
          id="allegation_acknowledged"
          name="allegation_acknowledged"
          type="checkbox"
          required
          className="mt-1 size-5"
        />
        <span className="text-sm text-stone-800">{ALLEGATION_WARNING}</span>
      </label>

      <p className="text-sm text-stone-500">
        Firsthand does not determine whether this report is true. You are publishing a firsthand
        account, not a verified finding.
      </p>

      <div className="sticky bottom-0 -mx-4 border-t border-stone-200 bg-[#f7f3ec]/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <SubmitButton disabled={files.length === 0} />
      </div>
    </form>
  );
}
