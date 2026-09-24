import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  mockCompleteLocalMedia,
  mockCreateMediaSession,
  mockCreateReport,
  mockGetReportPage,
  mockMarkMediaStatus,
  mockRefreshVideoStatus,
} from "../lib/data/mock/repository";
import { mockCreateLiveStream, mockEndLiveStream } from "../lib/data/mock/live-repository";
import { createSeedDatabase } from "../lib/data/mock/seed";
import { readMockDatabase, writeMockDatabase } from "../lib/data/mock/store";
import { sha256Hex } from "../lib/media/hash";
import {
  combinedProvenanceHeadline,
  liveRecordingProvenanceFields,
  parseOriginalSha256,
  provenanceHeadline,
  uploadProvenanceFields,
} from "../lib/media/provenance";

const jordan = "11111111-1111-4111-8111-111111111111";
const park = "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const liveParkReport = "ccccccc4-cccc-4ccc-8ccc-ccccccccccc1";
const phoenixReport = "ccccccc1-cccc-4ccc-8ccc-ccccccccccc2";
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
    assert(parseOriginalSha256("not-a-hash") === null, "invalid hashes must be rejected");
    assert(parseOriginalSha256("a".repeat(64)) === "a".repeat(64), "64-char hex hashes must be accepted");
    assert(
      provenanceHeadline("creator_declared") === "Creator says they captured this media.",
      "creator-declared copy",
    );
    assert(provenanceHeadline("unknown") === "Media origin not established.", "unknown copy");
    assert(!/verified|authentic|\btrue\b/i.test(provenanceHeadline("creator_declared")), "copy must not claim truth");
    assert(!/verified|authentic|\btrue\b/i.test(provenanceHeadline("unknown")), "unknown copy must not claim truth");
    assert(uploadProvenanceFields().provenance_type === "creator_declared", "uploads are creator-declared");
    assert(liveRecordingProvenanceFields().provenance_type === "unknown", "live recordings stay unknown");
    assert(liveRecordingProvenanceFields().original_sha256 === null, "live recordings must not hash derivatives");
    assert(
      combinedProvenanceHeadline(["creator_declared", "unknown"]).includes("varies"),
      "mixed assets should not collapse to a truth stamp",
    );

    const seeded = readMockDatabase();
    const liveMedia = seeded.report_media.find((item) => item.report_id === liveParkReport);
    assert(liveMedia?.provenance_type === "unknown", "seeded livestream recording should be unknown provenance");
    assert(liveMedia?.original_sha256 === null, "seeded livestream recording should not store an original hash");
    assert(liveMedia?.provider_asset_id, "seeded livestream recording keeps a provider asset id");
    assert(liveMedia?.original_filename, "seeded livestream recording keeps a filename");

    const photo = seeded.report_media.find((item) => item.report_id === phoenixReport);
    assert(photo?.provenance_type === "creator_declared", "seeded report uploads should be creator-declared");
    assert(photo?.original_filename, "seeded report media should keep the original filename");
    assert(photo?.captured_at, "seeded report media should keep captured_at");
    assert(photo?.provider_asset_id, "seeded report media should keep a provider asset id");

    const bytes = new TextEncoder().encode("firsthand-original-bytes");
    const expectedHash = sha256Hex(bytes);
    const fakeClientHash = "b".repeat(64);
    const draft = await mockCreateReport({
      userId: jordan,
      title: "Provenance upload test",
      description: "A draft used to check original-byte hashing.",
      capturedAt: "2026-09-11T12:00:00.000Z",
      requestId: null,
      locationId: park,
      licensingStatus: "view_only",
    });
    const session = await mockCreateMediaSession({
      userId: jordan,
      reportId: draft.id,
      mediaType: "photo",
      filename: "park.jpg",
      fileSize: bytes.byteLength,
      contentType: "image/jpeg",
      capturedAt: "2026-09-11T12:00:00.000Z",
      licensingStatus: "view_only",
      originalSha256: fakeClientHash,
    });
    assert(session.protocol === "local", "mock uploads stay on the local direct-upload path");
    const pending = readMockDatabase().report_media.find((item) => item.id === session.mediaId);
    assert(pending?.provenance_type === "creator_declared", "report uploads are creator-declared at session create");
    assert(pending?.original_sha256 === fakeClientHash, "client hash is stored until original bytes arrive");
    assert(pending?.original_filename === "park.jpg", "session should persist the original filename");
    assert(pending?.captured_at === "2026-09-11T12:00:00.000Z", "session should persist captured_at");

    await mockMarkMediaStatus(jordan, session.mediaId, "uploading");
    await mockCompleteLocalMedia({
      userId: jordan,
      mediaId: session.mediaId,
      filename: "park.jpg",
      bytes,
    });
    const stored = readMockDatabase().report_media.find((item) => item.id === session.mediaId);
    assert(stored?.upload_status === "ready", "local complete should mark media ready");
    assert(stored?.original_sha256 === expectedHash, "server must hash original bytes, not keep a spoofed client hash");
    assert(stored?.original_filename === "park.jpg", "complete should keep the original filename");
    assert(stored?.provider === "local", "local complete should keep the local provider");
    assert(stored?.provider_asset_id, "local complete should keep a provider asset id");

    const afterStatus = await mockRefreshVideoStatus(jordan, session.mediaId);
    assert(afterStatus.uploadStatus === "ready", "status refresh must not break a ready local upload");
    const unchanged = readMockDatabase().report_media.find((item) => item.id === session.mediaId);
    assert(unchanged?.original_sha256 === expectedHash, "status refresh must not replace the original hash");

    const live = await mockCreateLiveStream({
      userId: jordan,
      title: "Provenance live test",
      locationId: park,
    });
    const ended = await mockEndLiveStream(jordan, live.id);
    const recording = readMockDatabase().report_media.find((item) => item.report_id === ended.reportId);
    assert(recording?.provenance_type === "unknown", "ended livestream recording is unknown provenance");
    assert(recording?.original_sha256 === null, "ended livestream recording must not hash a transcode");
    assert(recording?.original_filename === "live-recording.mp4", "recording filename should persist");
    assert(recording?.provider_asset_id, "recording provider asset id should persist");
    assert(recording?.media_type === "video", "recording should remain a video asset");

    const livePage = await mockGetReportPage(ended.reportId, jordan);
    assert(livePage?.media[0]?.provenance_type === "unknown", "report page should expose unknown provenance");
    const headline = combinedProvenanceHeadline(
      (livePage?.media ?? []).map((item) => item.provenance_type),
    );
    assert(headline === "Media origin not established.", "live report page copy");
    assert(!/verified|authentic/i.test(headline), "report page must not say verified or authentic");

    console.log("media provenance tests passed");
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
