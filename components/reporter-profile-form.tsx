"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ReporterAvatar } from "@/components/reporter-avatar";
import { Button } from "@/components/ui/button";
import { Field, Textarea, TextInput } from "@/components/ui/field";
import { ErrorState } from "@/components/ui/page";
import { saveReporterProfile } from "@/lib/profile-actions";
import {
  AVATAR_ACCEPT,
  BIO_MAX,
  DISPLAY_NAME_MAX,
  REPORTER_TOPICS,
  avatarValidationError,
  type ReporterTopic,
} from "@/lib/profile";

type ReporterProfileFormProps = {
  username: string;
  displayName: string;
  bio: string;
  homeCity: string;
  homeCountry: string;
  avatarUrl: string | null;
  topics: ReporterTopic[];
  nextPath?: string | null;
  error?: string;
};

const errorCopy: Record<string, string> = {
  username: "Choose a username with 3–30 lowercase letters, numbers, or underscores.",
  "username-taken": "That username is already taken.",
  "display-name": "Enter a display name up to 80 characters.",
  bio: "Keep the short bio under 500 characters.",
  home: "Add a home city and home country.",
  avatar: "Use a JPEG, PNG, WebP, or GIF photo of 5 MB or less.",
  save: "Could not save the profile. Try again.",
  profile: "Could not find your reporter profile.",
};

export function ReporterProfileForm({
  username,
  displayName,
  bio,
  homeCity,
  homeCountry,
  avatarUrl,
  topics,
  nextPath,
  error,
}: ReporterProfileFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nameValue, setNameValue] = useState(displayName);
  const [usernameValue, setUsernameValue] = useState(username);
  const [bioValue, setBioValue] = useState(bio);
  const [previewUrl, setPreviewUrl] = useState<string | null>(avatarUrl);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">(
    "idle",
  );
  const [usernameMessage, setUsernameMessage] = useState("");

  const selectedTopics = useMemo(() => new Set(topics), [topics]);

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  const matchesCurrentUsername = usernameValue.trim().toLowerCase() === username;

  useEffect(() => {
    if (matchesCurrentUsername) {
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      setUsernameStatus("checking");
      try {
        const response = await fetch(
          `/api/profile/username-available?username=${encodeURIComponent(usernameValue.trim().toLowerCase())}`,
        );
        const payload = (await response.json()) as {
          valid?: boolean;
          available?: boolean;
          message?: string;
        };
        if (cancelled) {
          return;
        }
        if (!payload.valid) {
          setUsernameStatus("invalid");
        } else if (payload.available) {
          setUsernameStatus("available");
        } else {
          setUsernameStatus("taken");
        }
        setUsernameMessage(payload.message ?? "");
      } catch {
        if (!cancelled) {
          setUsernameStatus("idle");
          setUsernameMessage("");
        }
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [matchesCurrentUsername, usernameValue]);

  const shownUsernameStatus = matchesCurrentUsername ? "idle" : usernameStatus;
  const shownUsernameMessage = matchesCurrentUsername ? "" : usernameMessage;

  function onPickFile(file: File | null) {
    if (!file) {
      return;
    }
    const invalid = avatarValidationError({ type: file.type, size: file.size, name: file.name });
    if (invalid) {
      setAvatarError(invalid);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
    const nextUrl = URL.createObjectURL(file);
    setObjectUrl(nextUrl);
    setPreviewUrl(nextUrl);
    setRemoveAvatar(false);
    setAvatarError(null);
  }

  function onRemovePhoto() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
    setObjectUrl(null);
    setPreviewUrl(null);
    setRemoveAvatar(true);
    setAvatarError(null);
  }

  return (
    <form action={saveReporterProfile} className="space-y-5">
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
      {removeAvatar ? <input type="hidden" name="remove_avatar" value="1" /> : null}

      {error ? <ErrorState>{errorCopy[error] ?? error}</ErrorState> : null}

      <div>
        <p className="text-sm font-medium text-ink">Profile photo</p>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <ReporterAvatar name={nameValue || "Reporter"} username={usernameValue || "reporter"} avatarUrl={previewUrl} />
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              id="avatar"
              name="avatar"
              type="file"
              accept={AVATAR_ACCEPT}
              className="block w-full max-w-xs text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-sm file:text-surface"
              onChange={(event) => onPickFile(event.target.files?.[0] ?? null)}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                {previewUrl ? "Replace" : "Add photo"}
              </Button>
              {previewUrl ? (
                <Button type="button" variant="secondary" onClick={onRemovePhoto}>
                  Remove
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-faint">JPEG, PNG, WebP, or GIF. 5 MB max.</p>
            {avatarError ? <p className="text-sm text-danger">{avatarError}</p> : null}
          </div>
        </div>
      </div>

      <Field label="Display name" htmlFor="display_name">
        <TextInput
          id="display_name"
          name="display_name"
          required
          maxLength={DISPLAY_NAME_MAX}
          value={nameValue}
          onChange={(event) => setNameValue(event.target.value)}
        />
      </Field>

      <Field label="Username" htmlFor="username" hint={`Public URL: /u/${usernameValue || "username"}`}>
        <TextInput
          id="username"
          name="username"
          required
          minLength={3}
          maxLength={30}
          autoComplete="off"
          spellCheck={false}
          value={usernameValue}
          onChange={(event) => setUsernameValue(event.target.value.toLowerCase())}
        />
      </Field>
      {shownUsernameStatus === "checking" ? (
        <p className="fh-meta">Checking availability…</p>
      ) : shownUsernameMessage ? (
        <p className={`text-sm ${shownUsernameStatus === "available" ? "text-ink" : "text-danger"}`}>
          {shownUsernameMessage}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Home city" htmlFor="home_city">
          <TextInput id="home_city" name="home_city" required defaultValue={homeCity} />
        </Field>
        <Field label="Home country" htmlFor="home_country">
          <TextInput id="home_country" name="home_country" required defaultValue={homeCountry} />
        </Field>
      </div>

      <Field label="Short bio" htmlFor="bio" hint={`${bioValue.length}/${BIO_MAX}`}>
        <Textarea
          id="bio"
          name="bio"
          rows={4}
          maxLength={BIO_MAX}
          value={bioValue}
          onChange={(event) => setBioValue(event.target.value)}
          placeholder="What you usually capture, in a few sentences. No resume needed."
        />
      </Field>

      <fieldset>
        <legend className="text-sm font-medium text-ink">Topics I usually cover</legend>
        <p className="mt-1 fh-meta">Optional. Choose any that apply.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {REPORTER_TOPICS.map((topic) => (
            <label key={topic.id} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="topics"
                value={topic.id}
                defaultChecked={selectedTopics.has(topic.id)}
                className="rounded border-line"
              />
              {topic.label}
            </label>
          ))}
        </div>
      </fieldset>

      <Button
        type="submit"
        disabled={shownUsernameStatus === "taken" || shownUsernameStatus === "invalid" || Boolean(avatarError)}
      >
        Save public profile
      </Button>
      <p className="text-xs text-faint">
        Firsthand does not require an employer, education, journalism credential, or identity check.
        Activity counts on your public page come from reports, follows, and support — not from this form.
      </p>
    </form>
  );
}
