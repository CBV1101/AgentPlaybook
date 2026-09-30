import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LIVE_CREATED_TIMEOUT_MS, isOccupyingBroadcastSlot, isPubliclyLive } from "../lib/live";
import {
  claimReporterBroadcast,
  occupancyDecision,
  isPostgresUniqueViolation,
  type OccupyingBroadcast,
} from "../lib/live/broadcast-occupancy";
import { mockCreateLiveStream } from "../lib/data/mock/live-repository";
import { createSeedDatabase } from "../lib/data/mock/seed";
import { readMockDatabase, writeMockDatabase } from "../lib/data/mock/store";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const occupying = (overrides: Partial<OccupyingBroadcast> = {}): OccupyingBroadcast => ({
  id: "occ-1",
  reporterId: "reporter-a",
  status: "live",
  createdAt: new Date().toISOString(),
  cloudflareLiveInputId: "cf-input-1",
  ...overrides,
});

assert(occupancyDecision({ occupying: null }).action === "create", "1. no occupying row → create");

const connectedLive = occupancyDecision({ occupying: occupying(), ingest: "connected" });
assert(connectedLive.action === "resume" && connectedLive.id === "occ-1", "2. connected live → resume");

const disconnectedLive = occupancyDecision({ occupying: occupying(), ingest: "disconnected" });
assert(disconnectedLive.action === "reconcile" && disconnectedLive.reason === "disconnected-live", "3. disconnected live → reconcile");

const createdSetup = occupancyDecision({ occupying: occupying({ status: "created" }) });
assert(createdSetup.action === "resume", "4. legitimate created → resume");

assert(
  occupancyDecision({ occupying: occupying({ status: "ended" as string }) }).action === "create",
  "5. ended does not occupy",
);
assert(!isOccupyingBroadcastSlot("ended"), "5. ended is historical");
assert(!isOccupyingBroadcastSlot("failed"), "6. failed is historical");
assert(!isOccupyingBroadcastSlot("terminated"), "7. terminated is historical");

const timedOut = occupancyDecision({
  occupying: occupying({
    status: "created",
    createdAt: new Date(Date.now() - LIVE_CREATED_TIMEOUT_MS - 1000).toISOString(),
  }),
});
assert(timedOut.action === "reconcile" && timedOut.reason === "created-timeout", "created timeout uses existing cleanup");

assert(occupancyDecision({ occupying: occupying(), ingest: "unknown" }).action === "resume", "unknown live fails open to resume");

assert(isPostgresUniqueViolation({ code: "23505" }), "unique violation code 23505");
assert(!isPostgresUniqueViolation({ code: "42501" }), "other postgres codes are not unique");

const disconnectedSummary = {
  status: "live",
  cloudflareIngest: "disconnected",
} as const;
assert(!isPubliclyLive(disconnectedSummary), "12. #4A disconnected is still not publicly live");
assert(isOccupyingBroadcastSlot("live"), "12. #4A hide does not free occupancy");

type MemoryRow = { id: string; reporterId: string; status: string; createdAt: string; cfCreated: boolean };

function memoryClaim(state: {
  rows: MemoryRow[];
  ingestById: Record<string, "connected" | "disconnected" | "unknown">;
  cfCreates: string[];
  disables: string[];
}) {
  return {
    findOccupying: async (reporterId: string) => {
      const row = state.rows.find((item) => item.reporterId === reporterId && isOccupyingBroadcastSlot(item.status));
      if (!row) {
        return null;
      }
      return {
        id: row.id,
        reporterId: row.reporterId,
        status: row.status,
        createdAt: row.createdAt,
        cloudflareLiveInputId: row.id,
      };
    },
    observeIngest: async (row: OccupyingBroadcast) => state.ingestById[row.id] ?? "connected",
    reconcileAbandoned: async (row: OccupyingBroadcast) => {
      const target = state.rows.find((item) => item.id === row.id);
      if (target) {
        target.status = "failed";
      }
    },
    insertCreated: async (input: { userId: string }) => {
      const occupyingRow = state.rows.find(
        (item) => item.reporterId === input.userId && isOccupyingBroadcastSlot(item.status),
      );
      if (occupyingRow) {
        return { ok: false as const, uniqueConflict: true as const };
      }
      const id = `created-${state.rows.length + 1}`;
      state.rows.push({
        id,
        reporterId: input.userId,
        status: "created",
        createdAt: new Date().toISOString(),
        cfCreated: false,
      });
      return { ok: true as const, id };
    },
    attachCloudflare: async (streamId: string) => {
      state.cfCreates.push(streamId);
      const row = state.rows.find((item) => item.id === streamId);
      if (row) {
        row.cfCreated = true;
      }
    },
  };
}

async function run() {
  const none = { rows: [] as MemoryRow[], ingestById: {}, cfCreates: [] as string[], disables: [] as string[] };
const createdNone = await claimReporterBroadcast(
  { userId: "a", title: "One", locationId: "loc" },
  memoryClaim(none),
);
assert(!createdNone.reused, "1. empty slot creates");
assert(none.cfCreates.length === 1, "1. new create attaches Cloudflare after the occupying insert");

const liveState = {
  rows: [{ id: "live-1", reporterId: "a", status: "live", createdAt: new Date().toISOString(), cfCreated: true }],
  ingestById: { "live-1": "connected" as const },
  cfCreates: [] as string[],
  disables: [] as string[],
};
const resumed = await claimReporterBroadcast(
  { userId: "a", title: "Two", locationId: "loc" },
  memoryClaim(liveState),
);
assert(resumed.id === "live-1" && resumed.reused, "2. connected live returns existing");
assert(liveState.rows.filter((item) => isOccupyingBroadcastSlot(item.status)).length === 1, "2. no second occupying row");
assert(liveState.cfCreates.length === 0, "2. no new Cloudflare input");

const stale = {
  rows: [{ id: "stale-1", reporterId: "a", status: "live", createdAt: new Date().toISOString(), cfCreated: true }],
  ingestById: { "stale-1": "disconnected" as const },
  cfCreates: [] as string[],
  disables: [] as string[],
};
const afterStale = await claimReporterBroadcast(
  { userId: "a", title: "Three", locationId: "loc" },
  memoryClaim(stale),
);
assert(!afterStale.reused, "3. disconnected live creates a new row after reconcile");
assert(stale.rows.find((item) => item.id === "stale-1")?.status === "failed", "3. stale live is failed");
assert(stale.rows.filter((item) => isOccupyingBroadcastSlot(item.status)).length === 1, "3. one occupying row after reconcile+create");

const setup = {
  rows: [{ id: "created-1", reporterId: "a", status: "created", createdAt: new Date().toISOString(), cfCreated: true }],
  ingestById: {},
  cfCreates: [] as string[],
  disables: [] as string[],
};
const resumeCreated = await claimReporterBroadcast(
  { userId: "a", title: "Four", locationId: "loc" },
  memoryClaim(setup),
);
assert(resumeCreated.id === "created-1" && resumeCreated.reused, "4. created setup is resumed");
assert(setup.cfCreates.length === 0, "4. resume created does not create Cloudflare");

for (const historical of ["ended", "failed", "terminated"] as const) {
  const hist = {
    rows: [{ id: historical, reporterId: "a", status: historical, createdAt: new Date().toISOString(), cfCreated: true }],
    ingestById: {},
    cfCreates: [] as string[],
    disables: [] as string[],
  };
  const result = await claimReporterBroadcast({ userId: "a", title: historical, locationId: "loc" }, memoryClaim(hist));
  assert(!result.reused, `${historical} does not block create`);
}

const concurrent = {
  rows: [] as MemoryRow[],
  ingestById: {},
  cfCreates: [] as string[],
  disables: [] as string[],
};
const deps = memoryClaim(concurrent);
const [first, second] = await Promise.all([
  claimReporterBroadcast({ userId: "a", title: "A", locationId: "loc" }, deps),
  claimReporterBroadcast({ userId: "a", title: "B", locationId: "loc" }, deps),
]);
const occupyingAfter = concurrent.rows.filter((item) => isOccupyingBroadcastSlot(item.status));
assert(occupyingAfter.length === 1, "8. concurrent creates leave one occupying row");
assert(first.id === occupyingAfter[0]?.id || second.id === occupyingAfter[0]?.id, "8. both callers share the winner");
assert(new Set([first.id, second.id]).size === 1, "9. race loser returns the winner id");
assert(!`${first.id}${second.id}`.includes("duplicate"), "9. no raw unique error");

const race = {
  rows: [] as MemoryRow[],
  ingestById: {},
  cfCreates: [] as string[],
  disables: [] as string[],
};
let inserts = 0;
const raceDeps = {
  ...memoryClaim(race),
  insertCreated: async (input: { userId: string }) => {
    inserts += 1;
    const occupyingRow = race.rows.find(
      (item) => item.reporterId === input.userId && isOccupyingBroadcastSlot(item.status),
    );
    if (occupyingRow || inserts > 1) {
      return { ok: false as const, uniqueConflict: true as const };
    }
    race.rows.push({
      id: "winner",
      reporterId: input.userId,
      status: "created",
      createdAt: new Date().toISOString(),
      cfCreated: false,
    });
    return { ok: true as const, id: "winner" };
  },
};
const [win, lose] = await Promise.all([
  claimReporterBroadcast({ userId: "a", title: "A", locationId: "loc" }, raceDeps),
  claimReporterBroadcast({ userId: "a", title: "B", locationId: "loc" }, raceDeps),
]);
assert(win.id === "winner" && lose.id === "winner", "9. unique loser fetches the winner");
assert(race.cfCreates.filter((id) => id === "winner").length <= 1, "10. Cloudflare attaches only for the inserted winner");
assert(race.cfCreates.every((id) => id === "winner"), "10. loser never creates its own Live Input");

const twoReporters = {
  rows: [{ id: "a-live", reporterId: "a", status: "live", createdAt: new Date().toISOString(), cfCreated: true }],
  ingestById: { "a-live": "connected" as const },
  cfCreates: [] as string[],
  disables: [] as string[],
};
const reporterB = await claimReporterBroadcast(
  { userId: "b", title: "B", locationId: "loc" },
  memoryClaim(twoReporters),
);
assert(!reporterB.reused && reporterB.id !== "a-live", "11. reporter B is unaffected by reporter A");

const dbPath = join(process.cwd(), ".local", "mock-db.json");
let previous: string | null = null;
try {
  previous = readFileSync(dbPath, "utf8");
} catch {
  previous = null;
}

try {
  writeMockDatabase(createSeedDatabase());
  const jordan = "11111111-1111-4111-8111-111111111111";
  const priya = "22222222-2222-4222-8222-222222222222";
  const park = "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
  const firstMock = await mockCreateLiveStream({ userId: jordan, title: "Jordan one", locationId: park });
  const secondMock = await mockCreateLiveStream({ userId: jordan, title: "Jordan two", locationId: park });
  assert(firstMock.id === secondMock.id, "mock resume: second create returns existing created/live");
  const occupyingJordan = (readMockDatabase().live_streams ?? []).filter(
    (item) => item.reporter_id === jordan && isOccupyingBroadcastSlot(item.status),
  );
  assert(occupyingJordan.length === 1, "mock unique: jordan has one occupying row");

  const priyaCreate = await mockCreateLiveStream({
    userId: priya,
    title: "Should resume alexander",
    locationId: park,
  });
  assert(priyaCreate.id === "13131313-1313-4131-8131-131313131311", "priya live seed occupies and is resumed");
} finally {
  if (previous) {
    writeFileSync(dbPath, previous);
  } else {
    writeMockDatabase(createSeedDatabase());
  }
}

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260930120000_one_active_broadcast_per_reporter.sql"),
  "utf8",
);
assert(migration.includes("live_streams_one_active_per_reporter"), "migration names the unique occupancy index");
assert(migration.includes("where status in ('created', 'live')"), "partial unique is created|live");
assert(migration.includes("reporter_id"), "ownership column is reporter_id");

const whip = readFileSync(join(process.cwd(), "lib/live/whip-connection.ts"), "utf8");
const whep = readFileSync(join(process.cwd(), "lib/live/whep-viewer.ts"), "utf8");
assert(!whip.includes("claimReporterBroadcast"), "WHIP negotiation file is unchanged by occupancy");
assert(!whep.includes("claimReporterBroadcast"), "WHEP negotiation file is unchanged by occupancy");

console.log("live broadcast occupancy tests passed");
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
