import { createHash } from "node:crypto";
import { applyGeographySeed } from "@/lib/data/mock/geography-seed";
import type {
  CoverageRequestRecord,
  LicensingTransaction,
  Location,
  LocationFollow,
  Profile,
  ProfileFollow,
  ReportCorrection,
  ReportMedia,
  ReportRecord,
  ReportSupport,
  RequestInterest,
  ModerationReportRecord,
} from "@/lib/database.types";

export const MOCK_SCHEMA_VERSION = 8;
export const DEMO_EMAIL = "jordan@firsthand.local";
export const DEMO_PASSWORD = "firsthand";

export function hashPassword(password: string) {
  return createHash("sha256").update(`firsthand:${password}`).digest("hex");
}

export type MockAccount = {
  id: string;
  email: string;
  password_hash: string;
};

export type MockDatabase = {
  schemaVersion: number;
  accounts: MockAccount[];
  profiles: Profile[];
  locations: Location[];
  coverage_requests: CoverageRequestRecord[];
  request_interests: RequestInterest[];
  reports: ReportRecord[];
  report_media: ReportMedia[];
  profile_follows: ProfileFollow[];
  location_follows: LocationFollow[];
  report_supports: ReportSupport[];
  report_corrections: ReportCorrection[];
  licensing_transactions: LicensingTransaction[];
  moderation_reports: ModerationReportRecord[];
};

const ids = {
  jordan: "11111111-1111-4111-8111-111111111111",
  priya: "22222222-2222-4222-8222-222222222222",
  alex: "33333333-3333-4333-8333-333333333333",
  park: "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
  austin: "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
  phoenix: "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
  alexanderplatz: "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa4",
  tempelhof: "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa5",
  pike: "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa6",
  madison: "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa7",
  canal: "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa8",
  reqPark: "bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
  reqAustin: "bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
  repPark: "ccccccc1-cccc-4ccc-8ccc-ccccccccccc1",
  repPhoenix: "ccccccc1-cccc-4ccc-8ccc-ccccccccccc2",
  repAlexander: "ccccccc1-cccc-4ccc-8ccc-ccccccccccc3",
  repTempelhof: "ccccccc1-cccc-4ccc-8ccc-ccccccccccc4",
  repPike: "ccccccc1-cccc-4ccc-8ccc-ccccccccccc5",
  repAustin: "ccccccc1-cccc-4ccc-8ccc-ccccccccccc6",
  repMadison: "ccccccc1-cccc-4ccc-8ccc-ccccccccccc7",
  repCanal: "ccccccc1-cccc-4ccc-8ccc-ccccccccccc8",
  mediaPark: "ddddddd1-dddd-4ddd-8ddd-ddddddddddd1",
  mediaPhoenix: "ddddddd1-dddd-4ddd-8ddd-ddddddddddd2",
  mediaAlexander: "ddddddd1-dddd-4ddd-8ddd-ddddddddddd3",
  mediaTempelhof: "ddddddd1-dddd-4ddd-8ddd-ddddddddddd4",
  mediaPike: "ddddddd1-dddd-4ddd-8ddd-ddddddddddd5",
  mediaAustin: "ddddddd1-dddd-4ddd-8ddd-ddddddddddd6",
  mediaMadison: "ddddddd1-dddd-4ddd-8ddd-ddddddddddd7",
  mediaCanal: "ddddddd1-dddd-4ddd-8ddd-ddddddddddd8",
  interestPriya: "eeeeeee1-eeee-4eee-8eee-eeeeeeeeeee1",
  interestAlex: "eeeeeee1-eeee-4eee-8eee-eeeeeeeeeee2",
  followPriyaJordan: "fffffff1-ffff-4fff-8fff-fffffffffff1",
  followAlexPriya: "fffffff1-ffff-4fff-8fff-fffffffffff2",
};

export function createSeedDatabase(): MockDatabase {
  const now = "2026-09-10T08:00:00.000Z";

  const database = {
    schemaVersion: MOCK_SCHEMA_VERSION,
    accounts: [
      { id: ids.jordan, email: DEMO_EMAIL, password_hash: hashPassword(DEMO_PASSWORD) },
      { id: ids.priya, email: "priya@firsthand.local", password_hash: hashPassword(DEMO_PASSWORD) },
      { id: ids.alex, email: "alex@firsthand.local", password_hash: hashPassword(DEMO_PASSWORD) },
    ],
    profiles: [
      {
        id: ids.jordan,
        username: "jordanm",
        display_name: "Jordan M.",
        bio: "Independent firsthand reporting from Berlin streets, parks, and transit. I publish what I capture. Firsthand does not verify whether an account is true.",
        avatar_url: "https://picsum.photos/seed/jordanm-avatar/256/256",
        home_city: "Berlin",
        home_country: "Germany",
        created_at: "2026-03-12T10:00:00.000Z",
      },
      {
        id: ids.priya,
        username: "priyas",
        display_name: "Priya S.",
        bio: "I cover public space in Seattle and, when traveling, in Berlin. This page is a record of original reports, not a score of accuracy.",
        avatar_url: "https://picsum.photos/seed/priyas-avatar/256/256",
        home_city: "Seattle",
        home_country: "United States",
        created_at: "2026-04-02T16:20:00.000Z",
      },
      {
        id: ids.alex,
        username: "alexr",
        display_name: "Alex R.",
        bio: "On-the-ground reporting from civic buildings, cooling centers, and crowds in the U.S. Southwest and Midwest.",
        avatar_url: "https://picsum.photos/seed/alexr-avatar/256/256",
        home_city: "Madison",
        home_country: "United States",
        created_at: "2026-05-18T09:00:00.000Z",
      },
    ],
    locations: [
      {
        id: ids.park,
        country: "Germany",
        city: "Berlin",
        place: "Görlitzer Park",
        latitude: 52.496579,
        longitude: 13.4376053,
        slug: "gorlitzer-park-berlin",
        created_at: now,
      },
      {
        id: ids.austin,
        country: "United States",
        city: "Austin",
        place: "Austin City Hall",
        latitude: 30.2649,
        longitude: -97.7472,
        slug: "austin-city-hall-austin",
        created_at: now,
      },
      {
        id: ids.phoenix,
        country: "United States",
        city: "Phoenix",
        place: "Burton Barr Central Library",
        latitude: 33.4715,
        longitude: -112.0733,
        slug: "burton-barr-central-library-phoenix",
        created_at: now,
      },
      {
        id: ids.alexanderplatz,
        country: "Germany",
        city: "Berlin",
        place: "Alexanderplatz",
        latitude: 52.5219,
        longitude: 13.4132,
        slug: "alexanderplatz-berlin",
        created_at: now,
      },
      {
        id: ids.tempelhof,
        country: "Germany",
        city: "Berlin",
        place: "Tempelhofer Feld",
        latitude: 52.473,
        longitude: 13.4039,
        slug: "tempelhofer-feld-berlin",
        created_at: now,
      },
      {
        id: ids.pike,
        country: "United States",
        city: "Seattle",
        place: "Pike Place Market",
        latitude: 47.6097,
        longitude: -122.3425,
        slug: "pike-place-market-seattle",
        created_at: now,
      },
      {
        id: ids.madison,
        country: "United States",
        city: "Madison",
        place: "Wisconsin State Capitol",
        latitude: 43.0747,
        longitude: -89.3841,
        slug: "wisconsin-state-capitol-madison",
        created_at: now,
      },
      {
        id: ids.canal,
        country: "Germany",
        city: "Berlin",
        place: "Landwehrkanal",
        latitude: 52.4969,
        longitude: 13.4312,
        slug: "landwehrkanal-berlin",
        created_at: now,
      },
    ],
    coverage_requests: [
      {
        id: ids.reqPark,
        created_by: ids.jordan,
        location_id: ids.park,
        title: "What's actually happening at Görlitzer Park?",
        description:
          "I've seen conflicting reports about conditions in the park. Can someone go there and show what it's actually like firsthand?",
        created_at: "2026-09-10T08:12:00.000Z",
        status: "open",
      },
      {
        id: ids.reqAustin,
        created_by: ids.priya,
        location_id: ids.austin,
        title: "What is the crowd like outside city hall tonight?",
        description: "Need a current view of the plaza and whether the sidewalks are open.",
        created_at: "2026-09-09T21:40:00.000Z",
        status: "open",
      },
    ],
    request_interests: [
      {
        id: ids.interestPriya,
        request_id: ids.reqPark,
        user_id: ids.priya,
        created_at: "2026-09-10T08:30:00.000Z",
      },
      {
        id: ids.interestAlex,
        request_id: ids.reqPark,
        user_id: ids.alex,
        created_at: "2026-09-10T09:05:00.000Z",
      },
    ],
    reports: [
      {
        id: ids.repPark,
        created_by: ids.priya,
        request_id: ids.reqPark,
        location_id: ids.park,
        title: "Late afternoon in Görlitzer Park",
        description:
          "The lawns are in use, the paths are open, and there is a visible police presence near the Skalitzer Straße side. This is one firsthand look, not a verdict.",
        captured_at: "2026-09-10T15:40:00.000Z",
        uploaded_at: "2026-09-10T16:10:00.000Z",
        created_at: "2026-09-10T16:10:00.000Z",
        licensing_status: "view_only",
      },
      {
        id: ids.repTempelhof,
        created_by: ids.priya,
        request_id: null,
        location_id: ids.tempelhof,
        title: "Evening riders on the Tempelhof runways",
        description: "Cyclists and walkers were using the former airfield paths after sunset. The field was open.",
        captured_at: "2026-09-08T18:20:00.000Z",
        uploaded_at: "2026-09-08T19:05:00.000Z",
        created_at: "2026-09-08T19:05:00.000Z",
        licensing_status: "view_only",
      },
      {
        id: ids.repPike,
        created_by: ids.priya,
        request_id: null,
        location_id: ids.pike,
        title: "Morning stall setup at Pike Place",
        description: "Vendors were unloading before the tourist crowd arrived. I captured this from the main arcade.",
        captured_at: "2026-09-05T07:15:00.000Z",
        uploaded_at: "2026-09-05T08:02:00.000Z",
        created_at: "2026-09-05T08:02:00.000Z",
        licensing_status: "licensing_available",
      },
      {
        id: ids.repPhoenix,
        created_by: ids.alex,
        request_id: null,
        location_id: ids.phoenix,
        title: "Line around the block at the community cooling center",
        description:
          "People started lining up before noon. Volunteers were handing out water at the side entrance.",
        captured_at: "2026-09-10T09:00:00.000Z",
        uploaded_at: "2026-09-10T09:18:00.000Z",
        created_at: "2026-09-10T09:18:00.000Z",
        licensing_status: "licensing_available",
      },
      {
        id: ids.repAustin,
        created_by: ids.alex,
        request_id: ids.reqAustin,
        location_id: ids.austin,
        title: "City hall plaza after the evening rally",
        description: "The sidewalks were open. A few dozen people remained on the steps with signs stacked against the railing.",
        captured_at: "2026-09-09T22:10:00.000Z",
        uploaded_at: "2026-09-09T22:40:00.000Z",
        created_at: "2026-09-09T22:40:00.000Z",
        licensing_status: "view_only",
      },
      {
        id: ids.repMadison,
        created_by: ids.alex,
        request_id: null,
        location_id: ids.madison,
        title: "Lunch hour on the capitol lawn",
        description: "Office workers were sitting on the grass. The building entrance was open with a short security line.",
        captured_at: "2026-09-03T12:05:00.000Z",
        uploaded_at: "2026-09-03T12:31:00.000Z",
        created_at: "2026-09-03T12:31:00.000Z",
        licensing_status: "view_only",
      },
      {
        id: ids.repAlexander,
        created_by: ids.jordan,
        request_id: null,
        location_id: ids.alexanderplatz,
        title: "Independent look at the Alexanderplatz crowd",
        description: "I filmed the square from the World Clock side. Foot traffic was steady; the tram stop was not blocked.",
        captured_at: "2026-09-09T14:00:00.000Z",
        uploaded_at: "2026-09-09T14:28:00.000Z",
        created_at: "2026-09-09T14:28:00.000Z",
        licensing_status: "view_only",
      },
      {
        id: ids.repCanal,
        created_by: ids.jordan,
        request_id: null,
        location_id: ids.canal,
        title: "Canal path next to Görlitzer Park at dusk",
        description: "I walked the canal independently of the coverage request. Lights were on; the path was in use.",
        captured_at: "2026-09-07T19:10:00.000Z",
        uploaded_at: "2026-09-07T19:40:00.000Z",
        created_at: "2026-09-07T19:40:00.000Z",
        licensing_status: "licensing_available",
      },
    ],
    report_media: [
      media(ids.mediaPark, ids.repPark, "photo", "gorlitzer-park", "view_only", "2026-09-10T15:40:00.000Z"),
      media(ids.mediaPhoenix, ids.repPhoenix, "video", "phoenix-cooling", "licensing_available", "2026-09-10T09:00:00.000Z"),
      media(ids.mediaAlexander, ids.repAlexander, "video", "alexanderplatz", "view_only", "2026-09-09T14:00:00.000Z"),
      media(ids.mediaTempelhof, ids.repTempelhof, "photo", "tempelhof", "view_only", "2026-09-08T18:20:00.000Z"),
      media(ids.mediaPike, ids.repPike, "photo", "pike-place", "licensing_available", "2026-09-05T07:15:00.000Z"),
      media(ids.mediaAustin, ids.repAustin, "photo", "austin-city-hall", "view_only", "2026-09-09T22:10:00.000Z"),
      media(ids.mediaMadison, ids.repMadison, "photo", "madison-capitol", "view_only", "2026-09-03T12:05:00.000Z"),
      media(ids.mediaCanal, ids.repCanal, "video", "gorlitzer-canal", "licensing_available", "2026-09-07T19:10:00.000Z"),
    ],
    profile_follows: [
      {
        id: ids.followPriyaJordan,
        follower_id: ids.priya,
        following_id: ids.jordan,
        created_at: "2026-09-04T11:00:00.000Z",
      },
      {
        id: ids.followAlexPriya,
        follower_id: ids.alex,
        following_id: ids.priya,
        created_at: "2026-09-06T15:00:00.000Z",
      },
    ],
    location_follows: [],
    report_supports: [],
    report_corrections: [],
    licensing_transactions: [],
    moderation_reports: [],
  } as unknown as MockDatabase;

  return applyGeographySeed(database);
}

function media(
  id: string,
  reportId: string,
  mediaType: "photo" | "video",
  seed: string,
  licensing: "view_only" | "licensing_available",
  capturedAt: string,
): ReportMedia {
  const uploadedAt = capturedAt;
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
    uploaded_at: uploadedAt,
    licensing_status: licensing,
    created_at: uploadedAt,
  };
}
