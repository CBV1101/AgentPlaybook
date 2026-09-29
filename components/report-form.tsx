"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { EventAssociationField } from "@/components/event-association-field";
import { GeocodedLocationField } from "@/components/geocoded-location-field";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Textarea, TextInput } from "@/components/ui/field";
import { ErrorState, Notice } from "@/components/ui/page";
import { createReportDraft, publishReport } from "@/lib/coverage-actions";
import { classifyUpload } from "@/lib/media/classify";
import { requestMediaSession, transferMediaFile, type UploadProgress } from "@/lib/media/browser-upload";
import { ALLEGATION_WARNING, PLATFORM_PUBLISHING_RULE } from "@/lib/moderation";
import { InvestigationSelectField } from "@/components/investigation-select-field";
import type { ReporterInvestigationOption } from "@/lib/investigations";
import type { GeocodeSuggestion } from "@/lib/location";

type ReportFormProps = {
  mode: "independent" | "response";
  requestId?: string;
  requestTitle?: string;
  locationId?: string;
  locationLabel?: string;
  eventId?: string | null;
  error?: string;
  investigations?: ReporterInvestigationOption[];
};

type FileItem = {
  id: string;
  file: File;
  previewUrl: string;
  progress: UploadProgress | null;
  error: string | null;
  ready: boolean;
};

const errorCopy: Record<string, string> = {
  missing: "Add a title and a description of what you saw.",
  location: "Search for a place and choose a result before publishing.",
  media: "Add at least one photo or video you captured yourself.",
  attestation: "Confirm that you created or captured this media before publishing.",
  allegation: "Acknowledge the warning about allegations before publishing.",
  licensing: "Choose whether this media is view only or available for licensing.",
  profile: "Finish your reporter profile before publishing.",
  upload: "Upload failed. Please try again.",
};

function fileItem(file: File): FileItem {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
    file,
    previewUrl: URL.createObjectURL(file),
    progress: null,
    error: null,
    ready: false,
  };
}

export function ReportForm({
  mode,
  requestId,
  requestTitle,
  locationId,
  locationLabel,
  eventId,
  error,
  investigations = [],
}: ReportFormProps) {
  const router = useRouter();
  const [items, setItems] = useState<FileItem[]>([]);
  const [pickedLocation, setPickedLocation] = useState<GeocodeSuggestion | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [formError, setFormError] = useState(error ?? "");
  const [busy, setBusy] = useState(false);
  const transferring = items.some(
    (item) => item.progress && !item.ready && item.progress.label !== "Ready",
  );

  useEffect(() => {
    if (!transferring) {
      return;
    }
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [transferring]);

  const capturedDefault = useMemo(() => new Date().toISOString().slice(0, 16), []);

  function addFiles(list: FileList | null) {
    if (!list) {
      return;
    }
    setItems((current) => [...current, ...Array.from(list).map(fileItem)]);
  }

  function updateItem(id: string, patch: Partial<FileItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function uploadOne(
    item: FileItem,
    reportId: string,
    capturedAt: string,
    licensingStatus: "view_only" | "licensing_available",
  ) {
    const kind = classifyUpload(item.file.type, item.file.name);
    if (!kind) {
      throw new Error("Use a photo or video file.");
    }
    updateItem(item.id, { error: null, ready: false, progress: { label: "Starting upload…", percent: 0 } });
    const session = await requestMediaSession(kind, {
      reportId,
      file: item.file,
      capturedAt,
      licensingStatus,
    });
    await transferMediaFile(item.file, session, (progress) => updateItem(item.id, { progress, error: null }));
    updateItem(item.id, { ready: true, progress: { label: "Ready", percent: 100 }, error: null });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setFormError("");

    if (items.length === 0) {
      setFormError("media");
      return;
    }

    setBusy(true);
    try {
      let reportId = draftId;
      if (!reportId) {
        const draft = await createReportDraft(formData);
        if (!draft.ok) {
          setFormError(draft.error);
          return;
        }
        reportId = draft.reportId;
        setDraftId(reportId);
      }

      const capturedAt = String(formData.get("captured_at") || "");
      const licensingStatus = formData.get("licensing_status");
      if (licensingStatus !== "view_only" && licensingStatus !== "licensing_available") {
        setFormError("licensing");
        return;
      }

      const capturedIso = capturedAt ? new Date(capturedAt).toISOString() : new Date().toISOString();
      const pending = items.filter((item) => !item.ready);
      for (const item of pending) {
        try {
          await uploadOne(item, reportId, capturedIso, licensingStatus);
        } catch {
          updateItem(item.id, {
            error: "Upload failed. Please try again.",
            progress: { label: "Failed", percent: null },
          });
          setFormError("upload");
          return;
        }
      }

      const investigationChoice = String(formData.get("investigation_id") || "");
      const investigationId = investigationChoice && investigationChoice !== "__create__" ? investigationChoice : null;
      const published = await publishReport(reportId, investigationId);
      if (!published.ok) {
        setFormError(published.error);
        return;
      }
      if (investigationChoice === "__create__") {
        router.push(`/profile/investigations/new?attach=${published.reportId}`);
        return;
      }
      router.push(`/reports/${published.reportId}`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not publish the report.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {formError ? <ErrorState>{errorCopy[formError] ?? formError}</ErrorState> : null}

      <Notice>{PLATFORM_PUBLISHING_RULE}</Notice>

      {requestId ? <input type="hidden" name="request_id" value={requestId} /> : null}
      {locationId ? <input type="hidden" name="location_id" value={locationId} /> : null}

      {mode === "response" && requestTitle ? (
        <p className="fh-alert bg-canvas text-ink">
          Responding to: <span className="font-medium">{requestTitle}</span>
        </p>
      ) : null}

      <Field label="Title" htmlFor="title">
        <TextInput
          id="title"
          name="title"
          required
          maxLength={200}
          placeholder="What did you see?"
          disabled={busy}
        />
      </Field>

      {locationLabel ? (
        <div>
          <p className="text-sm font-medium text-ink">Location</p>
          <p className="mt-1 text-ink">{locationLabel}</p>
        </div>
      ) : (
        <GeocodedLocationField onSelectedChange={setPickedLocation} />
      )}

      <EventAssociationField locationId={locationId} location={pickedLocation} defaultEventId={eventId} />
      <InvestigationSelectField investigations={investigations} />

      <Field label="Description" htmlFor="description">
        <Textarea
          id="description"
          name="description"
          required
          rows={6}
          maxLength={20000}
          disabled={busy}
          placeholder="Describe what you saw, when, and from where. Do not paste someone else's footage."
        />
      </Field>

      <Field label="When was this captured?" htmlFor="captured_at">
        <TextInput
          id="captured_at"
          name="captured_at"
          type="datetime-local"
          required
          defaultValue={capturedDefault}
          disabled={busy}
        />
      </Field>

      <fieldset>
        <legend className="text-sm font-medium text-ink">Video / photo upload</legend>
        <p className="mt-1 fh-meta">
          Upload media you created or captured. Large videos go straight to Cloudflare Stream (or local
          storage when FIRSTHAND_USE_MOCK is on) and never pass through the Firsthand application server. Firsthand
          records that you said you captured this media. It does not determine whether the file is
          authentic or the report is true.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className={buttonClass("secondary", "cursor-pointer")}>
            Add photos
            <input
              className="sr-only"
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              disabled={busy}
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
          <label className={buttonClass("secondary", "cursor-pointer")}>
            Add video
            <input
              className="sr-only"
              type="file"
              accept="video/*"
              capture="environment"
              disabled={busy}
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        </div>
        <label className={buttonClass("ghost", "mt-3 w-full cursor-pointer border border-dashed border-line")}>
          Choose from library
          <input
            className="sr-only"
            type="file"
            accept="image/*,video/*"
            multiple
            disabled={busy}
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
        {items.length > 0 ? (
          <ul className="mt-4 grid grid-cols-2 gap-3">
            {items.map((item) => (
              <li key={item.id} className="overflow-hidden rounded-lg border border-line bg-canvas">
                {item.file.type.startsWith("video/") ? (
                  <video src={item.previewUrl} className="h-28 w-full object-cover" muted playsInline />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.previewUrl} alt="" className="h-28 w-full object-cover" />
                )}
                <div className="space-y-1 px-2 py-1">
                  <p className="truncate text-xs text-muted">{item.file.name}</p>
                  {item.progress ? (
                    <p className="text-xs font-medium text-ink">{item.progress.label}</p>
                  ) : null}
                  {item.progress?.percent != null ? (
                    <div className="h-1 overflow-hidden bg-line">
                      <div
                        className="h-full bg-ink"
                        style={{ width: `${item.progress.percent}%` }}
                      />
                    </div>
                  ) : null}
                  {item.error ? <p className="text-xs text-danger">{item.error}</p> : null}
                  <div className="flex items-center justify-between gap-2">
                    {item.error ? (
                      <button
                        type="submit"
                        className="text-xs text-muted underline"
                        disabled={busy}
                        onClick={() => updateItem(item.id, { error: null, progress: null, ready: false })}
                      >
                        Retry
                      </button>
                    ) : (
                      <span />
                    )}
                    <button
                      type="button"
                      className="text-xs text-muted underline"
                      disabled={busy}
                      onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-danger">At least one photo or video is required.</p>
        )}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-ink">Media usage</legend>
        <label className="flex cursor-pointer gap-3 rounded-md border border-line p-4 has-[:checked]:border-ink has-[:checked]:bg-canvas">
          <input
            type="radio"
            name="licensing_status"
            value="view_only"
            defaultChecked
            className="mt-1 size-5"
            required
          />
          <span>
            <span className="block font-medium text-ink">View only</span>
            <span className="mt-1 block fh-meta">
              People can watch this report on the platform, but the creator is not offering commercial
              licensing.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer gap-3 rounded-md border border-line p-4 has-[:checked]:border-ink has-[:checked]:bg-canvas">
          <input
            type="radio"
            name="licensing_status"
            value="licensing_available"
            className="mt-1 size-5"
          />
          <span>
            <span className="block font-medium text-ink">Available for licensing</span>
            <span className="mt-1 block fh-meta">
              The creator is open to commercial licensing requests for this media.
            </span>
          </span>
        </label>
      </fieldset>

      <label className="flex cursor-pointer gap-3 rounded-md border border-line p-4">
        <input
          id="firsthand_attestation"
          name="firsthand_attestation"
          type="checkbox"
          required
          className="mt-1 size-5"
        />
        <span className="text-sm text-ink">
          I confirm that I created or captured the media I&apos;m uploading and have the right to
          publish it. I am not uploading reposted third-party content as firsthand reporting.
        </span>
      </label>

      <label className="flex cursor-pointer gap-3 rounded-md bg-warn-soft p-4">
        <input
          id="allegation_acknowledged"
          name="allegation_acknowledged"
          type="checkbox"
          required
          className="mt-1 size-5"
        />
        <span className="text-sm text-ink">{ALLEGATION_WARNING}</span>
      </label>

      <p className="fh-meta">
        Firsthand does not determine whether this report is true. You are publishing a firsthand
        account, not a verified finding.
      </p>

      <div className="sticky bottom-0 -mx-4 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <Button type="submit" disabled={busy || items.length === 0} className="w-full sm:w-auto">
          {busy ? "Uploading…" : transferring ? "Keep this page open" : "Publish firsthand report"}
        </Button>
      </div>
    </form>
  );
}
