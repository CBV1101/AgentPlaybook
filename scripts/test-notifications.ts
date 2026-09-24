import { toLocationSummary } from "../lib/data/mappers";
import { createSeedDatabase } from "../lib/data/mock/seed";
import {
  planHighInterestCoverageRequest,
  planLiveStarted,
  planPublishedReport,
} from "../lib/notification-events";
import { DEFAULT_NOTIFICATION_PREFERENCES, HIGH_INTEREST_SUPPORTER_THRESHOLD } from "../lib/notifications";

const jordan = "11111111-1111-4111-8111-111111111111";
const priya = "22222222-2222-4222-8222-222222222222";
const alex = "33333333-3333-4333-8333-333333333333";
const fatima = "66666666-6666-4666-8666-666666666666";
const mateo = "55555555-5555-4555-8555-555555555555";

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function run() {
  const database = createSeedDatabase();
  const members = database.profiles.map((profile) => ({
    id: profile.id,
    homeCity: profile.home_city,
    homeCountry: profile.home_country,
    preferences: DEFAULT_NOTIFICATION_PREFERENCES,
  }));
  const locationFollows = database.location_follows.flatMap((row) => {
    const location = database.locations.find((item) => item.id === row.location_id);
    return location ? [{ userId: row.user_id, location: toLocationSummary(location) }] : [];
  });
  const ceutaPort = database.locations.find((item) => item.place === "Ceuta Port");
  assert(ceutaPort, "ceuta port should exist");
  const demand = planHighInterestCoverageRequest({
    actorId: mateo,
    requestId: "bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb9",
    location: toLocationSummary(ceutaPort!),
    supporterCount: HIGH_INTEREST_SUPPORTER_THRESHOLD,
    supporterIds: [priya],
    locationFollows,
    members,
  });
  assert(
    demand.some((item) => item.userId === jordan && item.type === "coverage_request_in_followed_location"),
    "jordan following ceuta should get coverage wanted",
  );
  assert(
    demand.some((item) => item.userId === fatima && item.message.includes("Ceuta")),
    "fatima home city ceuta should get coverage wanted without GPS",
  );
  assert(
    demand.every((item) => item.userId !== mateo),
    "request creator should not be notified of their own demand",
  );

  const alexander = database.locations.find((item) => item.id === "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa4");
  const live = planLiveStarted({
    actorId: priya,
    actorName: "Priya S.",
    liveStreamId: "13131313-1313-4131-8131-131313131311",
    location: toLocationSummary(alexander!),
    reporterFollowerIds: [alex],
    locationFollows,
    members,
  });
  assert(
    live.some((item) => item.userId === alex && item.type === "reporter_live"),
    "alex following priya should get reporter live",
  );
  assert(
    live.some((item) => item.userId === jordan && item.type === "live_in_followed_location"),
    "jordan following berlin should get live in followed location",
  );

  const park = database.locations.find((item) => item.id === "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1");
  const report = planPublishedReport({
    actorId: jordan,
    actorName: "Jordan M.",
    reportId: "ccccccc2-cccc-4ccc-8ccc-ccccccccccc1",
    location: toLocationSummary(park!),
    requestId: "bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb3",
    requestCreatorId: alex,
    requestSupporterIds: [priya],
    reporterFollowerIds: [priya],
    locationFollows,
    members,
  });
  const priyaRow = report.find((item) => item.userId === priya);
  assert(priyaRow?.type === "coverage_request_response", "priya should get a coverage response, not a duplicate reporter ping");
  assert(
    report.some((item) => item.userId === alex && item.type === "coverage_request_response"),
    "request creator should get a coverage response",
  );

  const muted = planLiveStarted({
    actorId: priya,
    actorName: "Priya S.",
    liveStreamId: "13131313-1313-4131-8131-131313131311",
    location: toLocationSummary(alexander!),
    reporterFollowerIds: [alex],
    locationFollows,
    members: members.map((member) =>
      member.id === alex
        ? { ...member, preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES, livestreams: false } }
        : member,
    ),
  });
  assert(
    muted.every((item) => item.userId !== alex),
    "livestream preference should suppress reporter_live",
  );

  console.log("notification planner checks passed");
}

run();
