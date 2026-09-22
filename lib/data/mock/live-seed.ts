import type { MockDatabase } from "@/lib/data/mock/seed";
import { MOCK_LIVE_SAMPLE_VIDEO } from "@/lib/live";
import { liveRecordingProvenanceFields } from "@/lib/media/provenance";

const ids = {
  liveAlexander: "13131313-1313-4131-8131-131313131311",
  liveParkEnded: "13131313-1313-4131-8131-131313131312",
  liveParkReport: "ccccccc4-cccc-4ccc-8ccc-ccccccccccc1",
  liveParkMedia: "ddddddd4-dddd-4ddd-8ddd-ddddddddddd1",
};

const priya = "22222222-2222-4222-8222-222222222222";
const jordan = "11111111-1111-4111-8111-111111111111";
const alexanderplatz = "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa4";
const park = "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const eventAlexander = "12121212-1212-4121-8121-121212121211";
const reqParkNight = "bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb3";

export function applyLiveSeed(database: MockDatabase): MockDatabase {
  database.live_streams ??= [];

  database.reports.push({
    id: ids.liveParkReport,
    created_by: jordan,
    request_id: reqParkNight,
    location_id: park,
    event_id: null,
    title: "Live from Görlitzer Park after dark",
    description:
      "Recording of a live firsthand broadcast from the park path. Lights were on; people were still using the lawn.",
    captured_at: "2026-09-10T21:05:00.000Z",
    uploaded_at: "2026-09-10T21:22:00.000Z",
    created_at: "2026-09-10T21:22:00.000Z",
    licensing_status: "view_only",
        removed_at: null,
        publish_status: "published",
        sensitive_content: false,
      });
  database.report_media.push({
    id: ids.liveParkMedia,
    report_id: ids.liveParkReport,
    media_type: "video",
    media_url: MOCK_LIVE_SAMPLE_VIDEO,
    thumbnail_url: "https://picsum.photos/seed/live-park/800/500",
    original_filename: "live-gorlitzer.mp4",
    captured_at: "2026-09-10T21:05:00.000Z",
    uploaded_at: "2026-09-10T21:22:00.000Z",
    licensing_status: "view_only",
    created_at: "2026-09-10T21:22:00.000Z",
    provider: "local",
    provider_asset_id: ids.liveParkMedia,
    upload_status: "ready",
    ...liveRecordingProvenanceFields(),
  });

  database.live_streams.push(
    {
      id: ids.liveAlexander,
      reporter_id: priya,
      location_id: alexanderplatz,
      event_id: eventAlexander,
      coverage_request_id: null,
      report_id: null,
      cloudflare_live_input_id: "mock-live-alexanderplatz",
      recording_asset_id: null,
      status: "live",
      title: "Live at the World Clock",
      started_at: "2026-09-11T13:05:00.000Z",
      ended_at: null,
      last_seen_at: null,
      created_at: "2026-09-11T13:04:00.000Z",
      sensitive_content: true,
    },
    {
      id: ids.liveParkEnded,
      reporter_id: jordan,
      location_id: park,
      event_id: null,
      coverage_request_id: reqParkNight,
      report_id: ids.liveParkReport,
      cloudflare_live_input_id: "mock-live-park",
      recording_asset_id: ids.liveParkMedia,
      status: "ended",
      title: "Live from Görlitzer Park after dark",
      started_at: "2026-09-10T21:05:00.000Z",
      ended_at: "2026-09-10T21:22:00.000Z",
      last_seen_at: "2026-09-10T21:22:00.000Z",
      created_at: "2026-09-10T21:04:00.000Z",
      sensitive_content: false,
    },
  );

  seedHomepageLiveWorld(database);
  return database;
}

const worldReporters = [
  jordan,
  priya,
  "33333333-3333-4333-8333-333333333333",
  "44444444-4444-4444-8444-444444444444",
  "55555555-5555-4555-8555-555555555555",
  "66666666-6666-4666-8666-666666666666",
];

function seedHomepageLiveWorld(database: MockDatabase) {
  const now = Date.now();
  const berlinRequest = database.coverage_requests.find(
    (item) => item.title === "How crowded is Alexanderplatz tonight?",
  );
  if (berlinRequest) {
    for (let index = 0; index < 40; index += 1) {
      const userId = `feed0000-0000-4000-8000-${String(index).padStart(12, "0")}`;
      if (database.request_interests.some((item) => item.request_id === berlinRequest.id && item.user_id === userId)) {
        continue;
      }
      database.request_interests.push({
        id: `feedint0-0000-4000-8000-${String(index).padStart(12, "0")}`,
        request_id: berlinRequest.id,
        user_id: userId,
        created_at: new Date(now - index * 60_000).toISOString(),
      });
    }
  }

  const streams: Array<{
    id: string;
    city: string;
    country: string;
    place: string | null;
    reporterId: string;
    title: string;
    minutesAgo: number;
    requestTitle?: string;
  }> = [
    {
      id: "13131313-1313-4131-8131-131313131321",
      city: "Berlin",
      country: "Germany",
      place: null,
      reporterId: jordan,
      title: "Outside Berlin Hauptbahnhof",
      minutesAgo: 18,
      requestTitle: "How crowded is Alexanderplatz tonight?",
    },
    {
      id: "13131313-1313-4131-8131-131313131322",
      city: "Paris",
      country: "France",
      place: "Place de la République",
      reporterId: priya,
      title: "Live from Place de la République",
      minutesAgo: 41,
      requestTitle: "Is Place de la République busy tonight?",
    },
    {
      id: "13131313-1313-4131-8131-131313131323",
      city: "Warsaw",
      country: "Poland",
      place: "Plac Defilad",
      reporterId: worldReporters[2]!,
      title: "Live on Plac Defilad",
      minutesAgo: 12,
      requestTitle: "How crowded is Plac Defilad this afternoon?",
    },
    {
      id: "13131313-1313-4131-8131-131313131324",
      city: "Stockholm",
      country: "Sweden",
      place: "Sergels torg",
      reporterId: worldReporters[3]!,
      title: "Afternoon on Sergels torg",
      minutesAgo: 55,
    },
    {
      id: "13131313-1313-4131-8131-131313131325",
      city: "Madrid",
      country: "Spain",
      place: "Puerta del Sol",
      reporterId: worldReporters[4]!,
      title: "Evening at Puerta del Sol",
      minutesAgo: 27,
      requestTitle: "What does Puerta del Sol look like this evening?",
    },
  ];

  for (const spec of streams) {
    if (database.live_streams.some((item) => item.id === spec.id)) {
      continue;
    }
    const location = database.locations.find(
      (item) =>
        item.city === spec.city &&
        item.country === spec.country &&
        (item.place ?? null) === spec.place,
    );
    if (!location) {
      continue;
    }
    const request = spec.requestTitle
      ? database.coverage_requests.find((item) => item.title === spec.requestTitle)
      : undefined;
    const started = new Date(now - spec.minutesAgo * 60_000).toISOString();
    database.live_streams.push({
      id: spec.id,
      reporter_id: spec.reporterId,
      location_id: location.id,
      event_id: null,
      coverage_request_id: request?.id ?? null,
      report_id: null,
      cloudflare_live_input_id: `mock-live-${spec.city.toLowerCase()}`,
      recording_asset_id: null,
      status: "live",
      title: spec.title,
      started_at: started,
      ended_at: null,
      last_seen_at: null,
      created_at: started,
      sensitive_content: false,
    });
  }
}
