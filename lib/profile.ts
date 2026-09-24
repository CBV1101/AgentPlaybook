import type { Profile } from "@/lib/database.types";

export const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
export const DISPLAY_NAME_MAX = 80;
export const BIO_MAX = 500;
export const HOME_FIELD_MAX = 80;
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export const REPORTER_TOPICS = [
  { id: "local_news", label: "Local news" },
  { id: "politics", label: "Politics" },
  { id: "public_safety", label: "Public safety" },
  { id: "transportation", label: "Transportation" },
  { id: "business", label: "Business" },
  { id: "protests", label: "Protests & demonstrations" },
  { id: "weather", label: "Weather & natural events" },
  { id: "community", label: "Community" },
  { id: "other", label: "Other" },
] as const;

export type ReporterTopic = (typeof REPORTER_TOPICS)[number]["id"];

export type ReporterProfilePatch = {
  username: string;
  displayName: string;
  bio: string | null;
  homeCity: string;
  homeCountry: string;
  topics: ReporterTopic[];
};

const TOPIC_IDS = new Set<string>(REPORTER_TOPICS.map((item) => item.id));

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function usernameValidationError(username: string): string | null {
  const normalized = normalizeUsername(username);
  if (!normalized) {
    return "Choose a username.";
  }
  if (!USERNAME_PATTERN.test(normalized)) {
    return "Usernames must be 3–30 characters using lowercase letters, numbers, or underscores.";
  }
  return null;
}

export function parseReporterTopics(values: string[]): ReporterTopic[] {
  const unique: ReporterTopic[] = [];
  for (const value of values) {
    if (TOPIC_IDS.has(value) && !unique.includes(value as ReporterTopic)) {
      unique.push(value as ReporterTopic);
    }
  }
  return unique;
}

export function reporterTopicLabels(topics: ReporterTopic[] | null | undefined) {
  const ids = topics ?? [];
  return REPORTER_TOPICS.filter((item) => ids.includes(item.id)).map((item) => item.label);
}

export function isReporterProfileComplete(profile: Pick<
  Profile,
  "username" | "display_name" | "home_city" | "home_country"
> | null | undefined) {
  if (!profile) {
    return false;
  }
  return Boolean(
    USERNAME_PATTERN.test(normalizeUsername(profile.username)) &&
      profile.display_name.trim() &&
      profile.home_city?.trim() &&
      profile.home_country?.trim(),
  );
}

export function validateReporterProfileFields(input: {
  username: string;
  displayName: string;
  bio: string;
  homeCity: string;
  homeCountry: string;
}) {
  const username = normalizeUsername(input.username);
  const usernameError = usernameValidationError(username);
  if (usernameError) {
    return { ok: false as const, error: "username", message: usernameError };
  }

  const displayName = input.displayName.trim();
  if (!displayName || displayName.length > DISPLAY_NAME_MAX) {
    return {
      ok: false as const,
      error: "display-name",
      message: `Enter a display name up to ${DISPLAY_NAME_MAX} characters.`,
    };
  }

  const bio = input.bio.trim();
  if (bio.length > BIO_MAX) {
    return { ok: false as const, error: "bio", message: `Keep the bio under ${BIO_MAX} characters.` };
  }

  const homeCity = input.homeCity.trim();
  const homeCountry = input.homeCountry.trim();
  if (!homeCity || homeCity.length > HOME_FIELD_MAX || !homeCountry || homeCountry.length > HOME_FIELD_MAX) {
    return {
      ok: false as const,
      error: "home",
      message: "Add a home city and home country.",
    };
  }

  return {
    ok: true as const,
    username,
    displayName,
    bio: bio || null,
    homeCity,
    homeCountry,
  };
}

export function avatarValidationError(file: { type: string; size: number; name: string }) {
  const mime = file.type.toLowerCase();
  const allowed = mime === "image/jpeg" || mime === "image/png" || mime === "image/webp" || mime === "image/gif";
  const nameOk = /\.(jpe?g|png|gif|webp)$/i.test(file.name);
  if (!allowed && !nameOk) {
    return "Use a JPEG, PNG, WebP, or GIF photo.";
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return "Profile photos must be 5 MB or smaller.";
  }
  if (file.size === 0) {
    return "That photo file is empty.";
  }
  return null;
}

export function avatarExtension(filename: string, mimeType: string) {
  const fromName = filename.toLowerCase().match(/\.(jpe?g|png|gif|webp)$/);
  if (fromName) {
    return fromName[0] === ".jpeg" ? ".jpg" : fromName[0];
  }
  if (mimeType === "image/png") {
    return ".png";
  }
  if (mimeType === "image/webp") {
    return ".webp";
  }
  if (mimeType === "image/gif") {
    return ".gif";
  }
  return ".jpg";
}
