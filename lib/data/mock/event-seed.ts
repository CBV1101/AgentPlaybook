import type { MockDatabase } from "@/lib/data/mock/seed";
import { uploadProvenanceFields } from "@/lib/media/provenance";

const ids = {
  eventAlexander: "12121212-1212-4121-8121-121212121211",
  eventKarlstad: "12121212-1212-4121-8121-121212121212",
  eventCeuta: "12121212-1212-4121-8121-121212121213",
  reqAlexanderCrowd: "bbbbbbb3-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
  reqAlexanderStay: "bbbbbbb3-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
  reqKarlstadFlood: "bbbbbbb3-bbbb-4bbb-8bbb-bbbbbbbbbbb3",
  reqCeutaDepart: "bbbbbbb3-bbbb-4bbb-8bbb-bbbbbbbbbbb4",
  repAlexanderPriya: "ccccccc3-cccc-4ccc-8ccc-ccccccccccc1",
  repKarlstadRain: "ccccccc3-cccc-4ccc-8ccc-ccccccccccc2",
  repKarlstadPuddles: "ccccccc3-cccc-4ccc-8ccc-ccccccccccc3",
  repCeutaBoard: "ccccccc3-cccc-4ccc-8ccc-ccccccccccc4",
  mediaAlexanderPriya: "ddddddd3-dddd-4ddd-8ddd-ddddddddddd1",
  mediaKarlstadRain: "ddddddd3-dddd-4ddd-8ddd-ddddddddddd2",
  mediaKarlstadPuddles: "ddddddd3-dddd-4ddd-8ddd-ddddddddddd3",
  mediaCeutaBoard: "ddddddd3-dddd-4ddd-8ddd-ddddddddddd4",
};

const jordan = "11111111-1111-4111-8111-111111111111";
const priya = "22222222-2222-4222-8222-222222222222";
const alex = "33333333-3333-4333-8333-333333333333";
const linnea = "44444444-4444-4444-8444-444444444444";
const mateo = "55555555-5555-4555-8555-555555555555";
const fatima = "66666666-6666-4666-8666-666666666666";
const alexanderplatz = "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa4";
const karlstadSquare = "aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const ceutaPort = "aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa4";
const repAlexander = "ccccccc1-cccc-4ccc-8ccc-ccccccccccc3";
const reqKarlstadSquare2 = "bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb7";
const reqCeutaPort = "bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb9";
const repCeutaPort = "ccccccc2-cccc-4ccc-8ccc-ccccccccccc7";

export function applyEventSeed(database: MockDatabase): MockDatabase {
  database.events ??= [];
  for (const report of database.reports) {
    report.event_id ??= null;
  }
  for (const request of database.coverage_requests) {
    request.event_id ??= null;
  }

  const now = "2026-09-11T08:00:00.000Z";

  database.events.push(
    {
      id: ids.eventAlexander,
      created_by: jordan,
      location_id: alexanderplatz,
      title: "Public demonstration at Alexanderplatz",
      description:
        "A container for firsthand reporting from Alexanderplatz on 11 September. This grouping is not a conclusion about the demonstration.",
      status: "active",
      started_at: "2026-09-11T09:00:00.000Z",
      ended_at: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: ids.eventKarlstad,
      created_by: linnea,
      location_id: karlstadSquare,
      title: "Heavy rain around central Karlstad",
      description:
        "Firsthand looks at Stora Torget and nearby public space during heavy rain. Individual reports stand on their own.",
      status: "active",
      started_at: "2026-09-11T06:00:00.000Z",
      ended_at: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: ids.eventCeuta,
      created_by: mateo,
      location_id: ceutaPort,
      title: "Ferry delays at Ceuta Port",
      description:
        "Reporting grouped around ferry-terminal delays. This is not an official timetable or a verified cause.",
      status: "active",
      started_at: "2026-09-10T05:30:00.000Z",
      ended_at: null,
      created_at: "2026-09-10T06:00:00.000Z",
      updated_at: now,
    },
  );

  const attach = (id: string, eventId: string) => {
    const report = database.reports.find((item) => item.id === id);
    if (report) {
      report.event_id = eventId;
    }
    const request = database.coverage_requests.find((item) => item.id === id);
    if (request) {
      request.event_id = eventId;
    }
  };

  attach(repAlexander, ids.eventAlexander);
  attach(reqKarlstadSquare2, ids.eventKarlstad);
  attach(reqCeutaPort, ids.eventCeuta);
  attach(repCeutaPort, ids.eventCeuta);

  database.coverage_requests.push(
    {
      id: ids.reqAlexanderCrowd,
      created_by: alex,
      location_id: alexanderplatz,
      event_id: ids.eventAlexander,
      title: "How large is the crowd at Alexanderplatz this afternoon?",
      description: "Need a current view from public space: density, barriers, and whether trams are moving.",
      created_at: "2026-09-11T10:15:00.000Z",
      status: "open",
      removed_at: null,
    },
    {
      id: ids.reqAlexanderStay,
      created_by: priya,
      location_id: alexanderplatz,
      event_id: ids.eventAlexander,
      title: "Is the gathering still on Alexanderplatz after 16:00?",
      description: "A later look at the same square. Show whether people remain or the square has cleared.",
      created_at: "2026-09-11T12:40:00.000Z",
      status: "open",
      removed_at: null,
    },
    {
      id: ids.reqKarlstadFlood,
      created_by: priya,
      location_id: karlstadSquare,
      event_id: ids.eventKarlstad,
      title: "Is Stora Torget flooding in the rain?",
      description: "Looking for standing water, closed corners, or normal foot traffic on the square.",
      created_at: "2026-09-11T07:10:00.000Z",
      status: "open",
      removed_at: null,
    },
    {
      id: ids.reqCeutaDepart,
      created_by: fatima,
      location_id: ceutaPort,
      event_id: ids.eventCeuta,
      title: "Are ferries still departing from Ceuta Port?",
      description: "A current look at the departure board and whether foot passengers are boarding.",
      created_at: "2026-09-11T08:20:00.000Z",
      status: "open",
      removed_at: null,
    },
  );

  database.request_interests.push(
    {
      id: "eeeeeee3-eeee-4eee-8eee-eeeeeeeeeee1",
      request_id: ids.reqAlexanderCrowd,
      user_id: linnea,
      created_at: "2026-09-11T10:40:00.000Z",
    },
    {
      id: "eeeeeee3-eeee-4eee-8eee-eeeeeeeeeee2",
      request_id: ids.reqKarlstadFlood,
      user_id: jordan,
      created_at: "2026-09-11T07:25:00.000Z",
    },
    {
      id: "eeeeeee3-eeee-4eee-8eee-eeeeeeeeeee3",
      request_id: ids.reqCeutaDepart,
      user_id: alex,
      created_at: "2026-09-11T08:35:00.000Z",
    },
  );

  database.reports.push(
    {
      id: ids.repAlexanderPriya,
      created_by: priya,
      request_id: ids.reqAlexanderCrowd,
      location_id: alexanderplatz,
      event_id: ids.eventAlexander,
      title: "Crowd around the World Clock this afternoon",
      description:
        "People filled the square on the World Clock side. Trams were still stopping. This is one look from the east edge, not a count of the whole gathering.",
      captured_at: "2026-09-11T13:20:00.000Z",
      uploaded_at: "2026-09-11T13:48:00.000Z",
      created_at: "2026-09-11T13:48:00.000Z",
      licensing_status: "view_only",
      removed_at: null,
      publish_status: "published",
    },
    {
      id: ids.repKarlstadRain,
      created_by: linnea,
      request_id: ids.reqKarlstadFlood,
      location_id: karlstadSquare,
      event_id: ids.eventKarlstad,
      title: "Standing water on the west side of Stora Torget",
      description:
        "Rain was heavy enough that puddles covered the cobbles near the west arcade. People were crossing on the higher stones. I did not see barriers.",
      captured_at: "2026-09-11T08:05:00.000Z",
      uploaded_at: "2026-09-11T08:28:00.000Z",
      created_at: "2026-09-11T08:28:00.000Z",
      licensing_status: "view_only",
      removed_at: null,
      publish_status: "published",
    },
    {
      id: ids.repKarlstadPuddles,
      created_by: jordan,
      request_id: null,
      location_id: karlstadSquare,
      event_id: ids.eventKarlstad,
      title: "Umbrellas on the square after the morning downpour",
      description:
        "I passed through around 09:30. The square was open. Water sat in the ruts; the tram stop was not blocked.",
      captured_at: "2026-09-11T09:32:00.000Z",
      uploaded_at: "2026-09-11T09:51:00.000Z",
      created_at: "2026-09-11T09:51:00.000Z",
      licensing_status: "licensing_available",
      removed_at: null,
      publish_status: "published",
    },
    {
      id: ids.repCeutaBoard,
      created_by: fatima,
      request_id: ids.reqCeutaDepart,
      location_id: ceutaPort,
      event_id: ids.eventCeuta,
      title: "Delay notices on the foot-passenger board",
      description:
        "The board showed two sailings marked delayed. The outer queue was shorter than the morning line but still reached the canopy.",
      captured_at: "2026-09-11T09:10:00.000Z",
      uploaded_at: "2026-09-11T09:34:00.000Z",
      created_at: "2026-09-11T09:34:00.000Z",
      licensing_status: "view_only",
      removed_at: null,
      publish_status: "published",
    },
  );

  database.report_media.push(
    eventMedia(ids.mediaAlexanderPriya, ids.repAlexanderPriya, "photo", "alexanderplatz-demo", "view_only", "2026-09-11T13:20:00.000Z"),
    eventMedia(ids.mediaKarlstadRain, ids.repKarlstadRain, "photo", "karlstad-rain-square", "view_only", "2026-09-11T08:05:00.000Z"),
    eventMedia(ids.mediaKarlstadPuddles, ids.repKarlstadPuddles, "video", "karlstad-umbrellas", "licensing_available", "2026-09-11T09:32:00.000Z"),
    eventMedia(ids.mediaCeutaBoard, ids.repCeutaBoard, "photo", "ceuta-delay-board", "view_only", "2026-09-11T09:10:00.000Z"),
  );

  return database;
}

function eventMedia(
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
    provider: "local" as const,
    provider_asset_id: id,
    upload_status: "ready" as const,
    ...uploadProvenanceFields(),
  };
}
