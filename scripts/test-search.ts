import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mockSearchFirsthand } from "../lib/data/mock/search";
import { createSeedDatabase } from "../lib/data/mock/seed";
import { writeMockDatabase } from "../lib/data/mock/store";

const dbPath = join(process.cwd(), ".local", "mock-db.json");

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
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
    const berlin = await mockSearchFirsthand({
      q: "Berlin",
      kind: "all",
      timeRange: "any",
      retrieval: "lexical",
    });
    assert(
      berlin.places.some((place) => place.title.includes("Berlin")),
      "Berlin search should return the city or a Berlin place",
    );
    assert(berlin.reports.length > 0, "Berlin search should return firsthand reports");
    assert(berlin.requests.length > 0, "Berlin search should return coverage requests");
    assert(berlin.events.length > 0, "Berlin search should return events at Berlin locations");
    assert(
      berlin.reporters.some((reporter) => reporter.username === "jordanm" || reporter.username === "priyas"),
      "Berlin search should include a reporter associated with Berlin",
    );

    const reportersOnly = await mockSearchFirsthand({
      q: "Berlin",
      kind: "reporters",
      timeRange: "any",
    });
    assert(reportersOnly.places.length === 0, "reporter filter should hide other groups");
    assert(reportersOnly.reporters.length > 0, "reporter filter should keep reporters");

    const empty = await mockSearchFirsthand({ q: "", kind: "all", timeRange: "any" });
    assert(empty.reports.length === 0, "empty query should not dump the database");
    console.log("search tests passed");
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
