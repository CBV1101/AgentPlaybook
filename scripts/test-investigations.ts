import { randomUUID } from "node:crypto";
import { createSeedDatabase } from "../lib/data/mock/seed";
import { readMockDatabase, writeMockDatabase } from "../lib/data/mock/store";
import {
  mockAddInvestigationContent,
  mockCreateInvestigation,
  mockDeleteInvestigation,
  mockGetInvestigationPage,
  mockListPublicInvestigationsForReporter,
  mockListPublishedInvestigations,
  mockReorderInvestigationItems,
} from "../lib/data/mock/investigation-repository";
import { mockCreateReport, mockPublishReport } from "../lib/data/mock/repository";

const jordan = "11111111-1111-4111-8111-111111111111";
const priya = "22222222-2222-4222-8222-222222222222";

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  writeMockDatabase(createSeedDatabase());

  const created = await mockCreateInvestigation({
    userId: jordan,
    title: "Fraud Investigation — Minnesota",
    description: "Demo series",
    status: "draft",
  });

  const r1 = await mockCreateReport({
    userId: jordan,
    title: "Part one",
    description: "Why this started",
    capturedAt: new Date().toISOString(),
    requestId: null,
    locationId: readMockDatabase().locations[0]!.id,
    licensingStatus: "view_only",
  });
  const mediaId = randomUUID();
  const db = readMockDatabase();
  db.report_media.push({
    id: mediaId,
    report_id: r1.id,
    media_type: "video",
    media_url: "https://example.com/a.mp4",
    thumbnail_url: "https://example.com/a.jpg",
    original_filename: "a.mp4",
    captured_at: new Date().toISOString(),
    uploaded_at: new Date().toISOString(),
    licensing_status: "view_only",
    created_at: new Date().toISOString(),
    provider: "local",
    provider_asset_id: mediaId,
    upload_status: "ready",
    provenance_type: "creator_declared",
    original_sha256: null,
  });
  writeMockDatabase(db);
  await mockPublishReport(jordan, r1.id);
  await mockAddInvestigationContent(jordan, created.id, { reportId: r1.id });

  let rejected = false;
  try {
    const priyaReport = readMockDatabase().reports.find((item) => item.created_by === priya);
    if (priyaReport) {
      await mockAddInvestigationContent(jordan, created.id, { reportId: priyaReport.id });
    }
  } catch {
    rejected = true;
  }
  assert(rejected, "reporter cannot add another reporter's content");

  const r2 = await mockCreateReport({
    userId: jordan,
    title: "Part two",
    description: "Second stop",
    capturedAt: new Date().toISOString(),
    requestId: null,
    locationId: readMockDatabase().locations[0]!.id,
    licensingStatus: "view_only",
  });
  const media2 = randomUUID();
  const db2 = readMockDatabase();
  db2.report_media.push({
    id: media2,
    report_id: r2.id,
    media_type: "photo",
    media_url: "https://example.com/b.jpg",
    thumbnail_url: "https://example.com/b.jpg",
    original_filename: "b.jpg",
    captured_at: new Date().toISOString(),
    uploaded_at: new Date().toISOString(),
    licensing_status: "view_only",
    created_at: new Date().toISOString(),
    provider: "local",
    provider_asset_id: media2,
    upload_status: "ready",
    provenance_type: "creator_declared",
    original_sha256: null,
  });
  writeMockDatabase(db2);
  await mockPublishReport(jordan, r2.id);
  await mockAddInvestigationContent(jordan, created.id, { reportId: r2.id });

  const items = readMockDatabase().investigation_items.filter((item) => item.investigation_id === created.id);
  assert(items.length === 2, "two parts added");
  const reversed = [...items].sort((a, b) => a.position - b.position).map((item) => item.id).reverse();
  await mockReorderInvestigationItems(jordan, created.id, reversed);
  const after = readMockDatabase()
    .investigation_items.filter((item) => item.investigation_id === created.id)
    .sort((a, b) => a.position - b.position);
  assert(after[0]!.id === reversed[0], "reorder persisted");

  await mockCreateInvestigation({
    userId: jordan,
    title: "unused",
    description: null,
    status: "published",
  });
  // publish original
  const { mockUpdateInvestigation } = await import("../lib/data/mock/investigation-repository");
  await mockUpdateInvestigation(jordan, created.id, { status: "published" });

  const profile = readMockDatabase().profiles.find((item) => item.id === jordan)!;
  const page = await mockGetInvestigationPage(profile.username, readMockDatabase().investigations.find((item) => item.id === created.id)!.slug);
  assert(page, "public page loads");
  assert(page!.parts.length === 2, "public page shows ordered parts");
  assert(page!.parts[0]!.title === "Part two", "public order follows reporter reorder");

  const publicList = await mockListPublicInvestigationsForReporter(jordan);
  assert(publicList.some((item) => item.id === created.id), "published investigation appears on profile");

  const discovered = await mockListPublishedInvestigations();
  assert(discovered.some((item) => item.id === created.id), "published investigation with public parts is discoverable");
  assert(
    !discovered.some((item) => item.title === "unused"),
    "published investigation with no public parts stays off the index",
  );

  const reportCountBefore = readMockDatabase().reports.length;
  await mockDeleteInvestigation(jordan, created.id);
  assert(readMockDatabase().reports.length === reportCountBefore, "delete investigation preserves reports");
  assert(!readMockDatabase().investigations.some((item) => item.id === created.id), "investigation removed");

  console.log("investigation tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
