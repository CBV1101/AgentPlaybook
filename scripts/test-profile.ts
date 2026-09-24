import { createSeedDatabase } from "../lib/data/mock/seed";
import {
  applyReporterAvatarFile,
  applyReporterAvatarRemoval,
  applyReporterProfileUpdate,
  mockUsernameTaken,
} from "../lib/data/mock/profile";
import { assembleReporterProfilePage } from "../lib/data/reporter";
import {
  avatarValidationError,
  isReporterProfileComplete,
  parseReporterTopics,
  usernameValidationError,
  validateReporterProfileFields,
} from "../lib/profile";

const jordan = "11111111-1111-4111-8111-111111111111";
const priya = "22222222-2222-4222-8222-222222222222";

const PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
);

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  assert(usernameValidationError("ab")?.includes("3–30"), "short usernames are rejected");
  assert(usernameValidationError("jordan_m") === null, "url-safe usernames are allowed");
  assert(usernameValidationError("jordan-m"), "hyphens are not url-safe for usernames");
  assert(avatarValidationError({ type: "application/pdf", size: 12, name: "x.pdf" }), "non-images are rejected");
  assert(avatarValidationError({ type: "image/png", size: 6 * 1024 * 1024, name: "x.png" }), "oversized photos are rejected");
  assert(
    avatarValidationError({ type: "image/png", size: PNG.byteLength, name: "x.png" }) === null,
    "small pngs are allowed",
  );

  const newUserFields = validateReporterProfileFields({
    username: "New_Reporter",
    displayName: "New Reporter",
    bio: "I publish what I capture nearby.",
    homeCity: "Lisbon",
    homeCountry: "Portugal",
  });
  assert(newUserFields.ok, "a complete setup form should validate");
  if (!newUserFields.ok) {
    throw new Error("expected valid setup fields");
  }
  assert(newUserFields.username === "new_reporter", "usernames are stored lowercase");
  assert(parseReporterTopics(["local_news", "local_news", "not-a-topic"]).join(",") === "local_news", "topics are unique and known");

  const incomplete = {
    username: "new_reporter",
    display_name: "New Reporter",
    home_city: null,
    home_country: null,
  };
  assert(!isReporterProfileComplete(incomplete), "new profiles without a home place are incomplete");

  const database = createSeedDatabase();
  const jordanProfile = database.profiles.find((item) => item.id === jordan);
  assert(jordanProfile && isReporterProfileComplete(jordanProfile), "seeded reporters have a complete public identity");
  assert(jordanProfile?.topics.includes("local_news"), "seeded topics should exist without duplicating identity fields");

  const newbieId = "99999999-9999-4999-8999-999999999999";
  database.profiles.push({
    id: newbieId,
    username: "new_reporter",
    display_name: "New Reporter",
    bio: null,
    avatar_url: null,
    home_city: null,
    home_country: null,
    created_at: "2026-09-11T10:00:00.000Z",
    role: "member",
    can_live_stream: true,
    topics: [],
  });
  assert(!isReporterProfileComplete(database.profiles.at(-1)), "signup-style profiles stay incomplete until home is set");

  applyReporterProfileUpdate(database, newbieId, {
    username: "new_reporter",
    displayName: "New Reporter",
    bio: "I cover local streets.",
    homeCity: "Lisbon",
    homeCountry: "Portugal",
    topics: ["community", "weather"],
  });
  const created = database.profiles.find((item) => item.id === newbieId);
  assert(created && isReporterProfileComplete(created), "saving setup fields completes the profile");
  assert(created?.bio === "I cover local streets.", "bio should persist on the public profile row");

  applyReporterProfileUpdate(database, priya, {
    username: "priyas",
    displayName: "Priya Edited",
    bio: "Edited bio for the public page.",
    homeCity: "Seattle",
    homeCountry: "United States",
    topics: ["public_safety", "politics"],
  });
  const edited = database.profiles.find((item) => item.id === priya);
  assert(edited?.display_name === "Priya Edited", "edits update display name");
  const publicPage = assembleReporterProfilePage(edited!, [], new Map(), {
    followerCount: 4,
    supportCount: 9,
    correctionCount: 0,
    completedLicensingCount: 0,
  });
  assert(publicPage.profile.display_name === "Priya Edited", "public profile uses the saved identity");
  assert(publicPage.profile.bio === "Edited bio for the public page.", "public profile uses the saved bio");
  assert(publicPage.stats.followerCount === 4, "followers stay activity-derived");
  assert(publicPage.stats.supportCount === 9, "community support stays activity-derived");
  assert(publicPage.stats.reportCount === 0, "report counts are not entered by the reporter");

  assert(mockUsernameTaken(database, "jordanm", priya), "jordanm is taken for another user");
  let collision = "";
  try {
    applyReporterProfileUpdate(database, priya, {
      username: "jordanm",
      displayName: "Priya Edited",
      bio: "Edited bio for the public page.",
      homeCity: "Seattle",
      homeCountry: "United States",
      topics: ["public_safety"],
    });
  } catch (error) {
    collision = error instanceof Error ? error.message : "";
  }
  assert(collision === "username-taken", "username collisions are rejected");
  assert(
    database.profiles.find((item) => item.id === priya)?.username === "priyas",
    "failed collision leaves the previous username",
  );

  const withPhoto = await applyReporterAvatarFile(database, newbieId, {
    bytes: PNG,
    filename: "avatar.png",
    contentType: "image/png",
    size: PNG.byteLength,
  });
  assert(withPhoto.avatar_url?.startsWith("/api/local-media/"), "avatar upload stores a local media URL");
  const removed = await applyReporterAvatarRemoval(database, newbieId);
  assert(removed.avatar_url === null, "remove clears the avatar");

  console.log("profile tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
