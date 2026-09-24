import type { MockDatabase } from "@/lib/data/mock/seed";
import { isCountryHubLocation } from "@/lib/geo";
import { coverageWantedMessage, liveFromPlaceMessage } from "@/lib/notifications";

const jordan = "11111111-1111-4111-8111-111111111111";
const priya = "22222222-2222-4222-8222-222222222222";
const alex = "33333333-3333-4333-8333-333333333333";
const mateo = "55555555-5555-4555-8555-555555555555";
const fatima = "66666666-6666-4666-8666-666666666666";
const ceutaPort = "aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa4";
const park = "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const reqCeutaPort = "bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb9";
const reqParkNight = "bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb3";
const repParkNight = "ccccccc2-cccc-4ccc-8ccc-ccccccccccc1";
const liveAlexander = "13131313-1313-4131-8131-131313131311";
const alexanderplatz = "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa4";
const phoenixReport = "ccccccc1-cccc-4ccc-8ccc-ccccccccccc2";

export function applyNotificationSeed(database: MockDatabase): MockDatabase {
  database.notifications ??= [];
  database.notification_preferences ??= [];

  const berlinCity = database.locations.find(
    (item) =>
      item.city === "Berlin" &&
      item.country === "Germany" &&
      !item.place &&
      !isCountryHubLocation(item),
  );
  const ceutaPortLocation = database.locations.find((item) => item.id === ceutaPort);
  const alexander = database.locations.find((item) => item.id === alexanderplatz);

  const followIfMissing = (id: string, userId: string, locationId: string, createdAt: string) => {
    if (database.location_follows.some((item) => item.user_id === userId && item.location_id === locationId)) {
      return;
    }
    database.location_follows.push({ id, user_id: userId, location_id: locationId, created_at: createdAt });
  };

  followIfMissing("f1f1f1f1-f1f1-41f1-81f1-f1f1f1f1f1f1", jordan, ceutaPort, "2026-09-08T10:00:00.000Z");
  if (berlinCity) {
    followIfMissing("f1f1f1f1-f1f1-41f1-81f1-f1f1f1f1f1f2", jordan, berlinCity.id, "2026-09-08T10:05:00.000Z");
  }

  if (!database.profile_follows.some((item) => item.follower_id === fatima && item.following_id === mateo)) {
    database.profile_follows.push({
      id: "f1f1f1f1-f1f1-41f1-81f1-f1f1f1f1f1f3",
      follower_id: fatima,
      following_id: mateo,
      created_at: "2026-09-07T12:00:00.000Z",
    });
  }

  const extraInterest = {
    id: "eeeeeee1-eeee-4eee-8eee-eeeeeeeeee10",
    request_id: reqCeutaPort,
    user_id: alex,
    created_at: "2026-09-10T08:00:00.000Z",
  };
  if (!database.request_interests.some((item) => item.id === extraInterest.id)) {
    database.request_interests.push(extraInterest);
  }

  const ceutaSupporters = database.request_interests.filter((item) => item.request_id === reqCeutaPort).length;
  const ceutaLabel = ceutaPortLocation?.place || "Ceuta Port";
  const alexanderLabel = alexander?.place || "Alexanderplatz";

  const rows = [
    {
      id: "n1111111-1111-4111-8111-111111111111",
      user_id: jordan,
      type: "live_in_followed_location" as const,
      actor_id: priya,
      location_id: alexanderplatz,
      event_id: "12121212-1212-4121-8121-121212121211",
      coverage_request_id: null,
      report_id: null,
      live_stream_id: liveAlexander,
      message: liveFromPlaceMessage("Priya S.", alexanderLabel),
      read_at: null,
      created_at: "2026-09-11T13:06:00.000Z",
    },
    {
      id: "n1111111-1111-4111-8111-111111111112",
      user_id: jordan,
      type: "coverage_request_in_followed_location" as const,
      actor_id: mateo,
      location_id: ceutaPort,
      event_id: null,
      coverage_request_id: reqCeutaPort,
      report_id: null,
      live_stream_id: null,
      message: coverageWantedMessage(ceutaLabel, ceutaSupporters),
      read_at: null,
      created_at: "2026-09-11T08:05:00.000Z",
    },
    {
      id: "n1111111-1111-4111-8111-111111111113",
      user_id: jordan,
      type: "new_report_from_followed_location" as const,
      actor_id: priya,
      location_id: park,
      event_id: null,
      coverage_request_id: null,
      report_id: "ccccccc1-cccc-4ccc-8ccc-ccccccccccc1",
      live_stream_id: null,
      message: "New firsthand report from Görlitzer Park, Berlin.",
      read_at: "2026-09-10T18:00:00.000Z",
      created_at: "2026-09-10T15:50:00.000Z",
    },
    {
      id: "n2222222-2222-4222-8222-222222222221",
      user_id: priya,
      type: "new_report_from_followed_reporter" as const,
      actor_id: jordan,
      location_id: park,
      event_id: null,
      coverage_request_id: null,
      report_id: repParkNight,
      live_stream_id: null,
      message: "Jordan M. published a new report.",
      read_at: null,
      created_at: "2026-09-10T21:40:00.000Z",
    },
    {
      id: "n3333333-3333-4333-8333-333333333331",
      user_id: alex,
      type: "reporter_live" as const,
      actor_id: priya,
      location_id: alexanderplatz,
      event_id: "12121212-1212-4121-8121-121212121211",
      coverage_request_id: null,
      report_id: null,
      live_stream_id: liveAlexander,
      message: liveFromPlaceMessage("Priya S.", alexanderLabel),
      read_at: null,
      created_at: "2026-09-11T13:06:00.000Z",
    },
    {
      id: "n3333333-3333-4333-8333-333333333332",
      user_id: alex,
      type: "coverage_request_response" as const,
      actor_id: jordan,
      location_id: park,
      event_id: null,
      coverage_request_id: reqParkNight,
      report_id: repParkNight,
      live_stream_id: null,
      message: "Jordan M. published a firsthand report answering your coverage request.",
      read_at: null,
      created_at: "2026-09-10T21:40:00.000Z",
    },
    {
      id: "n3333333-3333-4333-8333-333333333333",
      user_id: alex,
      type: "licensing_inquiry" as const,
      actor_id: jordan,
      location_id: null,
      event_id: null,
      coverage_request_id: null,
      report_id: phoenixReport,
      live_stream_id: null,
      message: "Northside Desk sent a licensing inquiry about your report.",
      read_at: null,
      created_at: "2026-09-10T11:20:00.000Z",
    },
    {
      id: "n6666666-6666-4666-8666-666666666661",
      user_id: fatima,
      type: "coverage_request_in_followed_location" as const,
      actor_id: mateo,
      location_id: ceutaPort,
      event_id: null,
      coverage_request_id: reqCeutaPort,
      report_id: null,
      live_stream_id: null,
      message: coverageWantedMessage(ceutaLabel, ceutaSupporters),
      read_at: null,
      created_at: "2026-09-11T08:05:00.000Z",
    },
  ];

  for (const row of rows) {
    if (!database.notifications.some((item) => item.id === row.id)) {
      database.notifications.push(row);
    }
  }

  return database;
}
