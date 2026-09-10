import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createSeedDatabase, MOCK_SCHEMA_VERSION, type MockDatabase } from "@/lib/data/mock/seed";

const dbPath = join(process.cwd(), ".local", "mock-db.json");

function ensureDir(filePath: string) {
  mkdirSync(dirname(filePath), { recursive: true });
}

export function readMockDatabase(): MockDatabase {
  try {
    const parsed = JSON.parse(readFileSync(dbPath, "utf8")) as MockDatabase;
    if (parsed.schemaVersion !== MOCK_SCHEMA_VERSION) {
      const seeded = createSeedDatabase();
      writeMockDatabase(seeded);
      return seeded;
    }
    return parsed;
  } catch {
    const seeded = createSeedDatabase();
    writeMockDatabase(seeded);
    return seeded;
  }
}

export function writeMockDatabase(database: MockDatabase) {
  ensureDir(dbPath);
  writeFileSync(dbPath, `${JSON.stringify(database, null, 2)}\n`);
}

export function updateMockDatabase(mutator: (database: MockDatabase) => void) {
  const database = readMockDatabase();
  mutator(database);
  writeMockDatabase(database);
  return database;
}

export function mockMediaDirectory() {
  const directory = join(process.cwd(), ".local", "media");
  mkdirSync(directory, { recursive: true });
  return directory;
}
