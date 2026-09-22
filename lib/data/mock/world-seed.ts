import { createHash } from "node:crypto";
import { citySlug } from "@/lib/geo";
import { slugify } from "@/lib/location";
import { uploadProvenanceFields } from "@/lib/media/provenance";
import type { MockDatabase } from "@/lib/data/mock/seed";

type CitySeed = {
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  places: Array<{ name: string; latitude: number; longitude: number }>;
  questions: string[];
  reports: Array<{ title: string; description: string; place?: string; video?: boolean }>;
};

const reporterIds = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
  "44444444-4444-4444-8444-444444444444",
  "55555555-5555-4555-8555-555555555555",
  "66666666-6666-4666-8666-666666666666",
];

const cities: CitySeed[] = [
  {
    country: "Sweden",
    city: "Stockholm",
    latitude: 59.3293,
    longitude: 18.0686,
    places: [{ name: "Sergels torg", latitude: 59.3323, longitude: 18.0649 }],
    questions: ["How crowded is Sergels torg this afternoon?", "Is the waterfront walkway open today?"],
    reports: [
      { title: "Lunch hour on Sergels torg", description: "People were crossing in both directions. The fountain steps were in use.", place: "Sergels torg" },
      { title: "Independent look at central Stockholm", description: "I walked from the station toward the water. Sidewalks were open and traffic was moving.", video: true },
    ],
  },
  {
    country: "Sweden",
    city: "Gothenburg",
    latitude: 57.7089,
    longitude: 11.9746,
    places: [{ name: "Avenyn", latitude: 57.7001, longitude: 11.9748 }],
    questions: ["What does Avenyn look like after the rain?", "Are the river ferries running on time?"],
    reports: [
      { title: "Wet pavement along Avenyn", description: "Shop lights were on. A few people had umbrellas. Traffic was light.", place: "Avenyn" },
      { title: "Citywide view from the canal", description: "Boats were tied along the canal. The path was open.", video: true },
    ],
  },
  {
    country: "Sweden",
    city: "Malmö",
    latitude: 55.605,
    longitude: 13.0038,
    places: [{ name: "Stortorget", latitude: 55.6062, longitude: 13.0003 }],
    questions: ["Is Stortorget busy this morning?", "What does the harbor path look like today?"],
    reports: [
      { title: "Quiet morning on Stortorget", description: "A few people sat on the benches. Delivery vans were on one side of the square.", place: "Stortorget" },
      { title: "Independent walk through Malmö", description: "I filmed a few blocks of the city center. Crosswalks were in use.", video: true },
    ],
  },
  {
    country: "Sweden",
    city: "Karlstad",
    latitude: 59.3793,
    longitude: 13.5036,
    places: [],
    questions: ["Is the river walk usable after last night’s rain?"],
    reports: [
      { title: "City-level look at Karlstad this week", description: "I walked between the square and the river. Paths were open and mostly dry." },
    ],
  },
  {
    country: "Germany",
    city: "Berlin",
    latitude: 52.52,
    longitude: 13.405,
    places: [],
    questions: ["How crowded is Alexanderplatz tonight?"],
    reports: [
      { title: "Independent evening in central Berlin", description: "I filmed a few blocks of sidewalk and a tram stop. Foot traffic was steady." },
    ],
  },
  {
    country: "Germany",
    city: "Hamburg",
    latitude: 53.5511,
    longitude: 9.9937,
    places: [{ name: "Rathausmarkt", latitude: 53.5503, longitude: 9.9923 }],
    questions: ["Is Rathausmarkt busy after work?", "What does the Elbe path look like this morning?"],
    reports: [
      { title: "After-work crowd on Rathausmarkt", description: "People were sitting on the steps. The square was open.", place: "Rathausmarkt" },
      { title: "Independent look at Hamburg’s waterfront", description: "The riverside path was in use. A few cyclists passed while I filmed.", video: true },
    ],
  },
  {
    country: "Germany",
    city: "Munich",
    latitude: 48.1351,
    longitude: 11.582,
    places: [{ name: "Marienplatz", latitude: 48.1374, longitude: 11.5755 }],
    questions: ["How crowded is Marienplatz right now?", "Are the tram stops around the square clear?"],
    reports: [
      { title: "Midday on Marienplatz", description: "Tour groups were near the clock. The square itself was walkable.", place: "Marienplatz" },
      { title: "Independent afternoon in Munich", description: "I walked a few streets off the square. Cafés had outdoor seating." },
    ],
  },
  {
    country: "Spain",
    city: "Madrid",
    latitude: 40.4168,
    longitude: -3.7038,
    places: [{ name: "Puerta del Sol", latitude: 40.4169, longitude: -3.7033 }],
    questions: ["What does Puerta del Sol look like this evening?", "How long is the metro entrance queue?"],
    reports: [
      { title: "Evening light at Puerta del Sol", description: "The square was busy but moving. Street performers were on one corner.", place: "Puerta del Sol", video: true },
      { title: "Independent walk through central Madrid", description: "I filmed sidewalks a few blocks from Sol. Traffic was typical for the hour." },
    ],
  },
  {
    country: "Spain",
    city: "Barcelona",
    latitude: 41.3874,
    longitude: 2.1686,
    places: [{ name: "Plaça de Catalunya", latitude: 41.387, longitude: 2.1701 }],
    questions: ["Is Plaça de Catalunya crowded this afternoon?", "What does the demonstration near Parliament look like right now?"],
    reports: [
      { title: "Afternoon on Plaça de Catalunya", description: "Pigeons, tourists, and commuters shared the square. Fountains were running.", place: "Plaça de Catalunya" },
      { title: "Independent look at central Barcelona", description: "I walked from the square toward the Rambla. Sidewalks were open." },
    ],
  },
  {
    country: "Spain",
    city: "Ceuta",
    latitude: 35.8894,
    longitude: -5.3213,
    places: [],
    questions: ["How long is the ferry queue?"],
    reports: [
      { title: "Independent midday in Ceuta", description: "I filmed a few public streets near the waterfront. Traffic was moving." },
    ],
  },
  {
    country: "France",
    city: "Paris",
    latitude: 48.8566,
    longitude: 2.3522,
    places: [{ name: "Place de la République", latitude: 48.8676, longitude: 2.3636 }],
    questions: ["Is Place de la République busy tonight?", "What does the flooding near this street look like?"],
    reports: [
      { title: "Evening on Place de la République", description: "People were sitting on the monument steps. The square was open.", place: "Place de la République", video: true },
      { title: "Independent look at a Paris side street", description: "I filmed standing water along one curb after rain. Pedestrians were using the far sidewalk." },
    ],
  },
  {
    country: "France",
    city: "Marseille",
    latitude: 43.2965,
    longitude: 5.3698,
    places: [{ name: "Vieux-Port", latitude: 43.2951, longitude: 5.3739 }],
    questions: ["How crowded is the Vieux-Port this morning?", "Are the quay walkways open?"],
    reports: [
      { title: "Morning along the Vieux-Port", description: "Boats were in their slips. People were walking the quay.", place: "Vieux-Port", video: true },
      { title: "Independent look at Marseille", description: "I filmed a few blocks inland from the port. Cafés were open." },
    ],
  },
  {
    country: "United Kingdom",
    city: "London",
    latitude: 51.5074,
    longitude: -0.1278,
    places: [{ name: "Parliament Square", latitude: 51.5007, longitude: -0.1266 }],
    questions: ["What does the demonstration near Parliament look like right now?", "Is this public park busy after dark?"],
    reports: [
      { title: "Afternoon at Parliament Square", description: "People were on the sidewalks. Barriers were up on one corner. Traffic was moving on the far side.", place: "Parliament Square", video: true },
      { title: "Independent evening walk in central London", description: "I filmed a public park path after dusk. Lights were on and a few people were still walking through." },
    ],
  },
  {
    country: "Poland",
    city: "Warsaw",
    latitude: 52.2297,
    longitude: 21.0122,
    places: [{ name: "Plac Defilad", latitude: 52.2319, longitude: 21.0067 }],
    questions: ["How crowded is Plac Defilad this afternoon?"],
    reports: [
      { title: "Afternoon on Plac Defilad", description: "People were crossing toward the palace. The square was open.", place: "Plac Defilad", video: true },
    ],
  },
  {
    country: "Kenya",
    city: "Nairobi",
    latitude: -1.2921,
    longitude: 36.8219,
    places: [{ name: "Uhuru Park", latitude: -1.2893, longitude: 36.8172 }],
    questions: ["What does Uhuru Park look like this morning?"],
    reports: [
      { title: "Morning paths in Uhuru Park", description: "Walkers were on the inner paths. The lawns were in use.", place: "Uhuru Park" },
    ],
  },
  {
    country: "Brazil",
    city: "São Paulo",
    latitude: -23.5505,
    longitude: -46.6333,
    places: [{ name: "Praça da Sé", latitude: -23.5504, longitude: -46.6339 }],
    questions: ["How busy is Praça da Sé right now?"],
    reports: [
      { title: "Midday at Praça da Sé", description: "The cathedral steps were occupied. Buses were turning at the edge of the square.", place: "Praça da Sé", video: true },
    ],
  },
  {
    country: "United States",
    city: "New York City",
    latitude: 40.7128,
    longitude: -74.006,
    places: [{ name: "Union Square", latitude: 40.7359, longitude: -73.9911 }],
    questions: ["How crowded is Union Square this afternoon?", "What does the subway entrance queue look like?"],
    reports: [
      { title: "Market stall setup at Union Square", description: "Tables were going up on the west side. The park paths were open.", place: "Union Square" },
      { title: "Independent look at a Manhattan sidewalk", description: "I filmed one block of foot traffic at lunch. The sidewalk was crowded but moving.", video: true },
    ],
  },
  {
    country: "United States",
    city: "Washington DC",
    latitude: 38.9072,
    longitude: -77.0369,
    places: [{ name: "National Mall", latitude: 38.8893, longitude: -77.0502 }],
    questions: ["What does the National Mall look like this morning?", "Are the paths near the monuments open?"],
    reports: [
      { title: "Morning on the National Mall", description: "Joggers and visitors were on the gravel paths. The lawn was dry.", place: "National Mall" },
      { title: "Independent look at downtown DC", description: "I filmed a few blocks of sidewalk near government buildings. Security lines were short." },
    ],
  },
  {
    country: "United States",
    city: "Los Angeles",
    latitude: 34.0522,
    longitude: -118.2437,
    places: [{ name: "Pershing Square", latitude: 34.0481, longitude: -118.2513 }],
    questions: ["Is Pershing Square busy at lunch?", "What does the street look like after the overnight rain?"],
    reports: [
      { title: "Lunch hour at Pershing Square", description: "People were eating on the steps. The purple tower was in shade.", place: "Pershing Square" },
      { title: "Independent look at downtown LA", description: "I filmed standing water at one curb after rain. Traffic was still moving.", video: true },
    ],
  },
  {
    country: "United States",
    city: "Minneapolis",
    latitude: 44.9778,
    longitude: -93.265,
    places: [{ name: "Nicollet Mall", latitude: 44.9778, longitude: -93.2726 }],
    questions: ["Is Nicollet Mall busy this afternoon?", "Are the skyway entrances open?"],
    reports: [
      { title: "Afternoon on Nicollet Mall", description: "Pedestrians and a few buses shared the transit mall. Outdoor tables were out.", place: "Nicollet Mall" },
      { title: "Independent look at downtown Minneapolis", description: "I filmed a public plaza and a skyway entrance. Both were in use." },
    ],
  },
];

export function applyWorldSeed(database: MockDatabase): MockDatabase {
  const now = "2026-09-09T12:00:00.000Z";
  let reporterIndex = 0;

  for (const city of cities) {
    ensureLocation(database, {
      country: city.country,
      city: city.city,
      place: null,
      latitude: city.latitude,
      longitude: city.longitude,
      slug: citySlug(city.city, city.country),
      created_at: now,
    });

    for (const place of city.places) {
      ensureLocation(database, {
        country: city.country,
        city: city.city,
        place: place.name,
        latitude: place.latitude,
        longitude: place.longitude,
        slug: nextUniqueSlug(database, slugify(`${place.name} ${city.city}`) || slugify(place.name)),
        created_at: now,
      });
    }

    for (const [index, question] of city.questions.entries()) {
      const location = findSeedLocation(database, city, index === 0 ? city.places[0]?.name ?? null : null);
      if (!location) {
        continue;
      }
      const requestId = seedId("req", `${city.city}:${question}`);
      if (database.coverage_requests.some((item) => item.id === requestId)) {
        continue;
      }
      const createdBy = reporterIds[reporterIndex % reporterIds.length]!;
      reporterIndex += 1;
      database.coverage_requests.push({
        id: requestId,
        created_by: createdBy,
        location_id: location.id,
        title: question,
        description: "Looking for a current, on-the-ground look. Show what you can see from public space.",
        created_at: offsetTime(now, index * 3600_000),
        status: "open",
        removed_at: null,
        event_id: null,
      });
      database.request_interests.push({
        id: seedId("int", requestId),
        request_id: requestId,
        user_id: reporterIds[(reporterIndex + 1) % reporterIds.length]!,
        created_at: offsetTime(now, index * 3600_000 + 600_000),
      });
    }

    for (const [index, report] of city.reports.entries()) {
      const location = findSeedLocation(database, city, report.place ?? null);
      if (!location) {
        continue;
      }
      const reportId = seedId("rep", `${city.city}:${report.title}`);
      if (database.reports.some((item) => item.id === reportId)) {
        continue;
      }
      const createdBy = reporterIds[reporterIndex % reporterIds.length]!;
      reporterIndex += 1;
      const captured = offsetTime(now, -index * 7200_000);
      database.reports.push({
        id: reportId,
        created_by: createdBy,
        request_id: null,
        location_id: location.id,
        title: report.title,
        description: report.description,
        captured_at: captured,
        uploaded_at: offsetTime(captured, 1800_000),
        created_at: offsetTime(captured, 1800_000),
        licensing_status: index % 2 === 0 ? "view_only" : "licensing_available",
        removed_at: null,
        event_id: null,
        publish_status: "published",
      });
      const mediaType = report.video ? "video" : "photo";
      const seed = slugify(report.title) || reportId;
      database.report_media.push({
        id: seedId("media", reportId),
        report_id: reportId,
        media_type: mediaType,
        media_url:
          mediaType === "video"
            ? "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
            : `https://picsum.photos/seed/${seed}/1600/1000`,
        thumbnail_url: `https://picsum.photos/seed/${seed}/800/500`,
        original_filename: mediaType === "video" ? `${seed}.mp4` : `${seed}.jpg`,
        captured_at: captured,
        uploaded_at: captured,
        licensing_status: index % 2 === 0 ? "view_only" : "licensing_available",
        created_at: captured,
        provider: "local",
        provider_asset_id: seedId("media", reportId),
        upload_status: "ready",
        ...uploadProvenanceFields(),
      });
    }
  }

  return database;
}

function findSeedLocation(
  database: MockDatabase,
  city: CitySeed,
  placeName: string | null,
) {
  return database.locations.find(
    (item) =>
      item.city === city.city &&
      item.country === city.country &&
      (item.place ?? null) === placeName,
  );
}

function ensureLocation(
  database: MockDatabase,
  location: {
    country: string;
    city: string;
    place: string | null;
    latitude: number;
    longitude: number;
    slug: string;
    created_at: string;
  },
) {
  const existing = database.locations.find(
    (item) =>
      item.city === location.city &&
      item.country === location.country &&
      (item.place ?? null) === location.place,
  );
  if (existing) {
    return existing;
  }
  const row = {
    id: seedId("loc", `${location.country}:${location.city}:${location.place ?? "city"}`),
    ...location,
    slug: nextUniqueSlug(database, location.slug),
  };
  database.locations.push(row);
  return row;
}

function nextUniqueSlug(database: MockDatabase, base: string) {
  const taken = new Set(database.locations.map((item) => item.slug));
  if (!taken.has(base)) {
    return base;
  }
  for (let attempt = 2; attempt < 20; attempt += 1) {
    const slug = `${base}-${attempt}`;
    if (!taken.has(slug)) {
      return slug;
    }
  }
  return `${base}-${Date.now()}`;
}

function seedId(kind: string, key: string) {
  const hex = createHash("sha1").update(`firsthand:${kind}:${key}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function offsetTime(iso: string, deltaMs: number) {
  return new Date(new Date(iso).getTime() + deltaMs).toISOString();
}
