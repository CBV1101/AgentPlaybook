import type { MockDatabase } from "@/lib/data/mock/seed";

const ids = {
  linnea: "44444444-4444-4444-8444-444444444444",
  mateo: "55555555-5555-4555-8555-555555555555",
  fatima: "66666666-6666-4666-8666-666666666666",
  karlstadSquare: "aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
  karlstadRiver: "aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
  ceutaPlaza: "aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
  ceutaPort: "aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa4",
  reqParkNight: "bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb3",
  reqTempelhof: "bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb4",
  reqKarlstadMarket: "bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb5",
  reqKarlstadRiver: "bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb6",
  reqKarlstadSquare2: "bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb7",
  reqCeutaPlaza: "bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb8",
  reqCeutaPort: "bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb9",
  reqCeutaPlaza2: "bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
  repParkNight: "ccccccc2-cccc-4ccc-8ccc-ccccccccccc1",
  repParkOld: "ccccccc2-cccc-4ccc-8ccc-ccccccccccc2",
  repKarlstadMarket: "ccccccc2-cccc-4ccc-8ccc-ccccccccccc3",
  repKarlstadIndependent: "ccccccc2-cccc-4ccc-8ccc-ccccccccccc4",
  repKarlstadRiver: "ccccccc2-cccc-4ccc-8ccc-ccccccccccc5",
  repCeutaPlaza: "ccccccc2-cccc-4ccc-8ccc-ccccccccccc6",
  repCeutaPort: "ccccccc2-cccc-4ccc-8ccc-ccccccccccc7",
  repCeutaIndependent: "ccccccc2-cccc-4ccc-8ccc-ccccccccccc8",
  mediaParkNight: "ddddddd2-dddd-4ddd-8ddd-ddddddddddd1",
  mediaParkOld: "ddddddd2-dddd-4ddd-8ddd-ddddddddddd2",
  mediaKarlstadMarket: "ddddddd2-dddd-4ddd-8ddd-ddddddddddd3",
  mediaKarlstadIndependent: "ddddddd2-dddd-4ddd-8ddd-ddddddddddd4",
  mediaKarlstadRiver: "ddddddd2-dddd-4ddd-8ddd-ddddddddddd5",
  mediaCeutaPlaza: "ddddddd2-dddd-4ddd-8ddd-ddddddddddd6",
  mediaCeutaPort: "ddddddd2-dddd-4ddd-8ddd-ddddddddddd7",
  mediaCeutaIndependent: "ddddddd2-dddd-4ddd-8ddd-ddddddddddd8",
};

export function applyGeographySeed(database: MockDatabase): MockDatabase {
  const password = database.accounts[0]?.password_hash ?? "";
  const now = "2026-09-10T08:00:00.000Z";
  const jordan = "11111111-1111-4111-8111-111111111111";
  const priya = "22222222-2222-4222-8222-222222222222";
  const alex = "33333333-3333-4333-8333-333333333333";
  const park = "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
  const tempelhof = "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa5";

  database.accounts.push(
    { id: ids.linnea, email: "linnea@firsthand.local", password_hash: password },
    { id: ids.mateo, email: "mateo@firsthand.local", password_hash: password },
    { id: ids.fatima, email: "fatima@firsthand.local", password_hash: password },
  );

  database.profiles.push(
    {
      id: ids.linnea,
      username: "linneak",
      display_name: "Linnéa K.",
      bio: "Karlstad-based firsthand reporting from the square, the river, and everyday public space.",
      avatar_url: "https://picsum.photos/seed/linneak-avatar/256/256",
      home_city: "Karlstad",
      home_country: "Sweden",
      created_at: "2026-02-20T09:00:00.000Z",
      role: "member",
    },
    {
      id: ids.mateo,
      username: "mateov",
      display_name: "Mateo V.",
      bio: "I publish what I capture around Ceuta’s plazas and port. This is a reporting record, not a verdict.",
      avatar_url: "https://picsum.photos/seed/mateov-avatar/256/256",
      home_city: "Ceuta",
      home_country: "Spain",
      created_at: "2026-01-14T12:00:00.000Z",
      role: "member",
    },
    {
      id: ids.fatima,
      username: "fatimaa",
      display_name: "Fatima A.",
      bio: "Independent reports from Ceuta streets and the waterfront, often answering local coverage requests.",
      avatar_url: "https://picsum.photos/seed/fatimaa-avatar/256/256",
      home_city: "Ceuta",
      home_country: "Spain",
      created_at: "2026-03-01T08:30:00.000Z",
      role: "member",
    },
  );

  database.locations.push(
    {
      id: ids.karlstadSquare,
      country: "Sweden",
      city: "Karlstad",
      place: "Stora Torget",
      latitude: 59.3793,
      longitude: 13.5036,
      slug: "stora-torget-karlstad",
      created_at: now,
    },
    {
      id: ids.karlstadRiver,
      country: "Sweden",
      city: "Karlstad",
      place: "Klarälven inner harbor",
      latitude: 59.3812,
      longitude: 13.4991,
      slug: "klaralven-inner-harbor-karlstad",
      created_at: now,
    },
    {
      id: ids.ceutaPlaza,
      country: "Spain",
      city: "Ceuta",
      place: "Plaza de África",
      latitude: 35.8883,
      longitude: -5.3164,
      slug: "plaza-de-africa-ceuta",
      created_at: now,
    },
    {
      id: ids.ceutaPort,
      country: "Spain",
      city: "Ceuta",
      place: "Ceuta Port",
      latitude: 35.8906,
      longitude: -5.3169,
      slug: "ceuta-port-ceuta",
      created_at: now,
    },
  );

  database.coverage_requests.push(
    {
      id: ids.reqParkNight,
      created_by: alex,
      location_id: park,
      title: "Is Görlitzer Park still active after dark?",
      description: "Need a current look at lighting and whether the paths are being used tonight.",
      created_at: "2026-09-10T17:05:00.000Z",
      status: "open",
      removed_at: null,
    },
    {
      id: ids.reqTempelhof,
      created_by: jordan,
      location_id: tempelhof,
      title: "Are the Tempelhof runways open this weekend?",
      description: "Looking for a firsthand view of access points and how busy the field is.",
      created_at: "2026-09-07T10:00:00.000Z",
      status: "open",
      removed_at: null,
    },
    {
      id: ids.reqKarlstadMarket,
      created_by: priya,
      location_id: ids.karlstadSquare,
      title: "What does Saturday market look like on Stora Torget?",
      description: "Are stalls set up, and is the square crowded or quiet?",
      created_at: "2026-09-05T18:00:00.000Z",
      status: "open",
      removed_at: null,
    },
    {
      id: ids.reqKarlstadSquare2,
      created_by: jordan,
      location_id: ids.karlstadSquare,
      title: "Is the square usable after the overnight rain?",
      description: "Need to see standing water, closed corners, or normal foot traffic.",
      created_at: "2026-09-09T07:20:00.000Z",
      status: "open",
      removed_at: null,
    },
    {
      id: ids.reqKarlstadRiver,
      created_by: ids.linnea,
      location_id: ids.karlstadRiver,
      title: "How high is the Klarälven at the inner harbor today?",
      description: "A current view of the quay and whether the walkway is open.",
      created_at: "2026-09-08T11:10:00.000Z",
      status: "open",
      removed_at: null,
    },
    {
      id: ids.reqCeutaPlaza,
      created_by: ids.fatima,
      location_id: ids.ceutaPlaza,
      title: "What is the crowd like in Plaza de África this afternoon?",
      description: "Looking for a current view of the square, shade, and whether the cathedral steps are open.",
      created_at: "2026-09-09T12:00:00.000Z",
      status: "open",
      removed_at: null,
    },
    {
      id: ids.reqCeutaPlaza2,
      created_by: alex,
      location_id: ids.ceutaPlaza,
      title: "Are evening events happening on the plaza this week?",
      description: "Need a firsthand look after 18:00 — staging, barriers, or a normal evening.",
      created_at: "2026-09-06T19:40:00.000Z",
      status: "open",
      removed_at: null,
    },
    {
      id: ids.reqCeutaPort,
      created_by: ids.mateo,
      location_id: ids.ceutaPort,
      title: "What does the ferry terminal queue look like this morning?",
      description: "Show the line, signage, and whether foot passengers are moving.",
      created_at: "2026-09-10T06:15:00.000Z",
      status: "open",
      removed_at: null,
    },
  );

  database.request_interests.push(
    { id: "eeeeeee1-eeee-4eee-8eee-eeeeeeeeeee3", request_id: ids.reqKarlstadMarket, user_id: jordan, created_at: "2026-09-05T19:00:00.000Z" },
    { id: "eeeeeee1-eeee-4eee-8eee-eeeeeeeeeee4", request_id: ids.reqKarlstadMarket, user_id: alex, created_at: "2026-09-05T19:20:00.000Z" },
    { id: "eeeeeee1-eeee-4eee-8eee-eeeeeeeeeee5", request_id: ids.reqKarlstadMarket, user_id: ids.fatima, created_at: "2026-09-06T08:00:00.000Z" },
    { id: "eeeeeee1-eeee-4eee-8eee-eeeeeeeeeee6", request_id: ids.reqCeutaPort, user_id: priya, created_at: "2026-09-10T07:00:00.000Z" },
    { id: "eeeeeee1-eeee-4eee-8eee-eeeeeeeeeee7", request_id: ids.reqCeutaPort, user_id: ids.linnea, created_at: "2026-09-10T07:12:00.000Z" },
    { id: "eeeeeee1-eeee-4eee-8eee-eeeeeeeeeee8", request_id: ids.reqParkNight, user_id: ids.linnea, created_at: "2026-09-10T17:30:00.000Z" },
  );

  database.reports.push(
    {
      id: ids.repParkNight,
      created_by: jordan,
      request_id: ids.reqParkNight,
      location_id: park,
      title: "Lights on along the Skalitzer side after 9pm",
      description: "I walked the path after dark. Lights were on, a few people were sitting on the lawn, and the gates I passed were open.",
      captured_at: "2026-09-10T21:10:00.000Z",
      uploaded_at: "2026-09-10T21:40:00.000Z",
      created_at: "2026-09-10T21:40:00.000Z",
      licensing_status: "licensing_available",
      removed_at: null,
    },
    {
      id: ids.repParkOld,
      created_by: alex,
      request_id: null,
      location_id: park,
      title: "Independent morning in the park last spring",
      description: "A quieter morning from the canal edge, published later as a historical look at the same place.",
      captured_at: "2026-04-12T08:20:00.000Z",
      uploaded_at: "2026-04-12T09:00:00.000Z",
      created_at: "2026-04-12T09:00:00.000Z",
      licensing_status: "view_only",
      removed_at: null,
    },
    {
      id: ids.repKarlstadMarket,
      created_by: ids.linnea,
      request_id: ids.reqKarlstadMarket,
      location_id: ids.karlstadSquare,
      title: "Market stalls filling Stora Torget",
      description: "Produce stalls were open on the west side. The square was busy but the tram stop stayed clear.",
      captured_at: "2026-09-06T10:15:00.000Z",
      uploaded_at: "2026-09-06T10:44:00.000Z",
      created_at: "2026-09-06T10:44:00.000Z",
      licensing_status: "licensing_available",
      removed_at: null,
    },
    {
      id: ids.repKarlstadIndependent,
      created_by: priya,
      request_id: null,
      location_id: ids.karlstadSquare,
      title: "Independent lunch hour on the square",
      description: "I stopped while traveling. Office workers were sitting on the steps. No market stalls that day.",
      captured_at: "2026-08-22T12:05:00.000Z",
      uploaded_at: "2026-08-22T12:31:00.000Z",
      created_at: "2026-08-22T12:31:00.000Z",
      licensing_status: "view_only",
      removed_at: null,
    },
    {
      id: ids.repKarlstadRiver,
      created_by: ids.linnea,
      request_id: ids.reqKarlstadRiver,
      location_id: ids.karlstadRiver,
      title: "Walkway open along the inner harbor",
      description: "The quay path was dry. A few boats were tied up. Water was below the rail.",
      captured_at: "2026-09-08T15:40:00.000Z",
      uploaded_at: "2026-09-08T16:05:00.000Z",
      created_at: "2026-09-08T16:05:00.000Z",
      licensing_status: "view_only",
      removed_at: null,
    },
    {
      id: ids.repCeutaPlaza,
      created_by: ids.fatima,
      request_id: ids.reqCeutaPlaza,
      location_id: ids.ceutaPlaza,
      title: "Afternoon shade on Plaza de África",
      description: "People were sitting under the trees. The cathedral steps were open. Traffic around the square was moving.",
      captured_at: "2026-09-09T15:20:00.000Z",
      uploaded_at: "2026-09-09T15:48:00.000Z",
      created_at: "2026-09-09T15:48:00.000Z",
      licensing_status: "view_only",
      removed_at: null,
    },
    {
      id: ids.repCeutaPort,
      created_by: ids.mateo,
      request_id: ids.reqCeutaPort,
      location_id: ids.ceutaPort,
      title: "Foot-passenger line at the ferry terminal",
      description: "The queue reached the outer barrier at 07:30. Staff were checking tickets at one booth.",
      captured_at: "2026-09-10T07:32:00.000Z",
      uploaded_at: "2026-09-10T07:55:00.000Z",
      created_at: "2026-09-10T07:55:00.000Z",
      licensing_status: "licensing_available",
      removed_at: null,
    },
    {
      id: ids.repCeutaIndependent,
      created_by: ids.fatima,
      request_id: null,
      location_id: ids.ceutaPort,
      title: "Independent evening at the harbor wall",
      description: "I filmed the waterfront after the last afternoon sailing. The promenade was open and lightly used.",
      captured_at: "2026-09-04T19:10:00.000Z",
      uploaded_at: "2026-09-04T19:36:00.000Z",
      created_at: "2026-09-04T19:36:00.000Z",
      licensing_status: "view_only",
      removed_at: null,
    },
  );

  database.report_media.push(
    geoMedia(ids.mediaParkNight, ids.repParkNight, "video", "gorlitzer-night", "licensing_available", "2026-09-10T21:10:00.000Z"),
    geoMedia(ids.mediaParkOld, ids.repParkOld, "photo", "gorlitzer-spring", "view_only", "2026-04-12T08:20:00.000Z"),
    geoMedia(ids.mediaKarlstadMarket, ids.repKarlstadMarket, "photo", "karlstad-market", "licensing_available", "2026-09-06T10:15:00.000Z"),
    geoMedia(ids.mediaKarlstadIndependent, ids.repKarlstadIndependent, "photo", "karlstad-square-lunch", "view_only", "2026-08-22T12:05:00.000Z"),
    geoMedia(ids.mediaKarlstadRiver, ids.repKarlstadRiver, "video", "karlstad-river", "view_only", "2026-09-08T15:40:00.000Z"),
    geoMedia(ids.mediaCeutaPlaza, ids.repCeutaPlaza, "photo", "ceuta-plaza", "view_only", "2026-09-09T15:20:00.000Z"),
    geoMedia(ids.mediaCeutaPort, ids.repCeutaPort, "video", "ceuta-port", "licensing_available", "2026-09-10T07:32:00.000Z"),
    geoMedia(ids.mediaCeutaIndependent, ids.repCeutaIndependent, "photo", "ceuta-harbor-evening", "view_only", "2026-09-04T19:10:00.000Z"),
  );

  const jordanId = "11111111-1111-4111-8111-111111111111";
  for (const profile of database.profiles) {
    profile.role = profile.id === jordanId ? "admin" : "member";
  }
  for (const report of database.reports) {
    report.removed_at = null;
  }
  for (const request of database.coverage_requests) {
    request.removed_at = null;
  }
  database.moderation_reports ??= [];

  return database;
}

function geoMedia(
  id: string,
  reportId: string,
  mediaType: "photo" | "video",
  seed: string,
  licensing: "view_only" | "licensing_available",
  capturedAt: string,
) {
  return {
    id,
    report_id: reportId,
    media_type: mediaType,
    media_url:
      mediaType === "video"
        ? "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
        : `https://picsum.photos/seed/${seed}/1600/1000`,
    thumbnail_url: `https://picsum.photos/seed/${seed}/800/500`,
    original_filename: mediaType === "video" ? `${seed}.mp4` : `${seed}.jpg`,
    captured_at: capturedAt,
    uploaded_at: capturedAt,
    licensing_status: licensing,
    created_at: capturedAt,
  };
}
