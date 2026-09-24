import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import type { MockDatabase } from "@/lib/data/mock/seed";
import { mockMediaDirectory } from "@/lib/data/mock/store";
import { writeLocalMediaFile } from "@/lib/media/local";
import {
  avatarExtension,
  avatarValidationError,
  type ReporterProfilePatch,
  usernameValidationError,
} from "@/lib/profile";

export function mockUsernameTaken(database: MockDatabase, username: string, excludeUserId?: string) {
  return database.profiles.some(
    (item) => item.username === username && item.id !== excludeUserId,
  );
}

export function applyReporterProfileUpdate(
  database: MockDatabase,
  userId: string,
  patch: ReporterProfilePatch,
) {
  const profile = database.profiles.find((item) => item.id === userId);
  if (!profile) {
    throw new Error("profile");
  }
  const usernameError = usernameValidationError(patch.username);
  if (usernameError) {
    throw new Error("username");
  }
  if (mockUsernameTaken(database, patch.username, userId)) {
    throw new Error("username-taken");
  }
  profile.username = patch.username;
  profile.display_name = patch.displayName;
  profile.bio = patch.bio;
  profile.home_city = patch.homeCity;
  profile.home_country = patch.homeCountry;
  profile.topics = patch.topics;
  return profile;
}

export async function applyReporterAvatarFile(
  database: MockDatabase,
  userId: string,
  file: { bytes: Uint8Array; filename: string; contentType: string; size: number },
) {
  const profile = database.profiles.find((item) => item.id === userId);
  if (!profile) {
    throw new Error("profile");
  }
  const invalid = avatarValidationError({
    type: file.contentType,
    size: file.size,
    name: file.filename,
  });
  if (invalid) {
    throw new Error(invalid);
  }
  await removeLocalAvatarFile(profile.avatar_url);
  const stored = await writeLocalMediaFile({
    bytes: file.bytes,
    filename: `${randomUUID()}${avatarExtension(file.filename, file.contentType)}`,
    mediaType: "photo",
  });
  profile.avatar_url = stored.mediaUrl;
  return profile;
}

export async function applyReporterAvatarRemoval(database: MockDatabase, userId: string) {
  const profile = database.profiles.find((item) => item.id === userId);
  if (!profile) {
    throw new Error("profile");
  }
  await removeLocalAvatarFile(profile.avatar_url);
  profile.avatar_url = null;
  return profile;
}

async function removeLocalAvatarFile(avatarUrl: string | null) {
  if (!avatarUrl?.startsWith("/api/local-media/")) {
    return;
  }
  const filename = avatarUrl.slice("/api/local-media/".length);
  if (!/^[0-9a-f-]{36}\.[a-z0-9]+$/i.test(filename)) {
    return;
  }
  try {
    await unlink(join(mockMediaDirectory(), filename));
  } catch {
    // Best-effort cleanup; the profile row still updates.
  }
}
