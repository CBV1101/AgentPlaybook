import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  mockFollowLocation,
  mockFollowReporter,
  mockGetFollowingFeed,
  mockGetProfilePage,
  mockIsFollowingLocation,
  mockIsFollowingReporter,
  mockUnfollowLocation,
  mockUnfollowReporter,
} from "../lib/data/mock/repository";
import { createSeedDatabase } from "../lib/data/mock/seed";
import { readMockDatabase, writeMockDatabase } from "../lib/data/mock/store";

const jordan = "11111111-1111-4111-8111-111111111111";
const priya = "22222222-2222-4222-8222-222222222222";
const parkId = "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const dbPath = join(process.cwd(), ".local", "mock-db.json");

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function reporterFollowCount() {
  return readMockDatabase().profile_follows.filter(
    (item) => item.follower_id === jordan && item.following_id === priya,
  ).length;
}

function locationFollowCount(locationId?: string) {
  return readMockDatabase().location_follows.filter((item) => {
    if (item.user_id !== jordan) {
      return false;
    }
    return locationId ? item.location_id === locationId : true;
  }).length;
}

async function run() {
  let previous: string | null = null;
  try {
    previous = readFileSync(dbPath, "utf8");
  } catch {
    previous = null;
  }

  writeMockDatabase(createSeedDatabase());

  try {
    assert(!(await mockIsFollowingReporter(jordan, priya)), "jordan should not already follow priya");

    await mockFollowReporter(jordan, priya);
    assert(await mockIsFollowingReporter(jordan, priya), "follow reporter failed");
    await mockFollowReporter(jordan, priya);
    assert(reporterFollowCount() === 1, "duplicate reporter follow should be a no-op");

    let selfFollowRejected = false;
    try {
      await mockFollowReporter(jordan, jordan);
    } catch {
      selfFollowRejected = true;
    }
    assert(selfFollowRejected, "self-follow should be rejected");
    assert(!(await mockIsFollowingReporter(jordan, jordan)), "self-follow must not create a row");

    const priyaPage = await mockGetProfilePage("priyas");
    assert((priyaPage?.stats.followerCount ?? 0) >= 2, "priya follower count should include alex and jordan");

    const berlin = {
      kind: "city" as const,
      label: "Berlin",
      country: "Germany",
      city: "Berlin",
      latitude: 52.52,
      longitude: 13.405,
    };
    await mockFollowLocation(jordan, berlin);
    assert(await mockIsFollowingLocation(jordan, berlin), "follow Berlin failed");
    await mockFollowLocation(jordan, berlin);
    const berlinFollows = readMockDatabase().location_follows.filter((item) => item.user_id === jordan);
    assert(berlinFollows.length === 1, "duplicate city follow should be a no-op");

    const park = {
      kind: "place" as const,
      label: "Görlitzer Park",
      country: "Germany",
      locationId: parkId,
    };
    await mockFollowLocation(jordan, park);
    assert(await mockIsFollowingLocation(jordan, park), "follow park failed");

    const karlstad = {
      kind: "city" as const,
      label: "Karlstad",
      country: "Sweden",
      city: "Karlstad",
      latitude: 59.3793,
      longitude: 13.5036,
    };
    await mockFollowLocation(jordan, karlstad);

    const germany = {
      kind: "country" as const,
      label: "Germany",
      country: "Germany",
      latitude: 51.16,
      longitude: 10.45,
    };
    await mockFollowLocation(jordan, germany);

    const feed = await mockGetFollowingFeed(jordan);
    assert(feed.length > 0, "following feed should not be empty");
    assert(
      feed.some((item) => item.reason === "From a reporter you follow"),
      "feed should include reporter follows",
    );
    assert(
      feed.some((item) => item.reason === "From Berlin, which you follow"),
      "feed should include Berlin location reason",
    );
    assert(
      feed.some((item) => item.reason === "From Görlitzer Park, which you follow"),
      "feed should include park location reason",
    );
    assert(
      feed.some((item) => item.reason === "From Karlstad, which you follow"),
      "feed should include Karlstad location reason",
    );
    assert(
      feed.some((item) => item.request && item.reason.includes("which you follow")),
      "feed should include coverage requests from followed locations",
    );

    await mockUnfollowReporter(jordan, priya);
    assert(!(await mockIsFollowingReporter(jordan, priya)), "unfollow reporter failed");

    await mockUnfollowLocation(jordan, berlin);
    assert(!(await mockIsFollowingLocation(jordan, berlin)), "unfollow Berlin failed");
    await mockUnfollowLocation(jordan, park);
    assert(!(await mockIsFollowingLocation(jordan, park)), "unfollow park failed");

    assert(locationFollowCount() >= 1, "country/karlstad follows should remain after other unfollows");

    console.log("follow tests passed");
  } finally {
    if (previous) {
      writeFileSync(dbPath, previous);
    } else {
      writeMockDatabase(createSeedDatabase());
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
