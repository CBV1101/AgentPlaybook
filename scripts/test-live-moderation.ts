import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  mockCreateLiveStream,
  mockGetReportPage,
  mockListModerationReports,
  mockRemoveReportedContent,
  mockSubmitModerationReport,
  mockUpdateModerationStatus,
} from "../lib/data/mock/repository";
import {
  mockEndLiveStream,
  mockGetLiveStreamPage,
  mockListPublicLiveStreams,
  mockSetReporterLivePrivilege,
} from "../lib/data/mock/live-repository";
import { SENSITIVE_CONTENT_WARNING } from "../lib/moderation";
import { createSeedDatabase } from "../lib/data/mock/seed";
import { readMockDatabase, writeMockDatabase } from "../lib/data/mock/store";

const jordan = "11111111-1111-4111-8111-111111111111";
const priya = "22222222-2222-4222-8222-222222222222";
const alex = "33333333-3333-4333-8333-333333333333";
const liveAlexander = "13131313-1313-4131-8131-131313131311";
const liveParkEnded = "13131313-1313-4131-8131-131313131312";
const liveParkReport = "ccccccc4-cccc-4ccc-8ccc-ccccccccccc1";
const phoenixReport = "ccccccc1-cccc-4ccc-8ccc-ccccccccccc2";
const park = "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
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

  try {
    writeMockDatabase(createSeedDatabase());

    assert(
      !/verified|fact-?check|true or complete finding/i.test(SENSITIVE_CONTENT_WARNING),
      "sensitive warning must not claim verification",
    );

    const seeded = readMockDatabase();
    const alexander = seeded.live_streams.find((item) => item.id === liveAlexander);
    assert(alexander?.status === "live", "seed livestream should be live");
    assert(alexander?.sensitive_content === true, "alexanderplatz livestream should be flagged sensitive");
    assert(
      seeded.reports.find((item) => item.id === phoenixReport)?.sensitive_content === true,
      "phoenix report should be flagged sensitive",
    );
    const publicBefore = mockListPublicLiveStreams().filter((item) => item.status === "live");
    assert(
      publicBefore.some((item) => item.id === liveAlexander),
      "live stream should appear as LIVE before moderation",
    );

    const seedFlag = (await mockListModerationReports()).find((item) => item.contentId === liveAlexander);
    assert(seedFlag, "seed should include an open livestream report");
    await mockUpdateModerationStatus(seedFlag!.id, "dismissed");
    const dismissed = (await mockListModerationReports()).find((item) => item.id === seedFlag!.id);
    assert(dismissed?.status === "dismissed", "admin dismiss should close the flag");
    assert(
      readMockDatabase().live_streams.find((item) => item.id === liveAlexander)?.status === "live",
      "dismiss must not stop the broadcast",
    );

    await mockSubmitModerationReport({
      userId: alex,
      contentType: "live_stream",
      contentId: liveAlexander,
      reason: "harassment",
      details: "Confrontation is being encouraged on camera.",
    });
    const openAgain = (await mockListModerationReports()).find(
      (item) => item.contentId === liveAlexander && item.status === "open",
    );
    assert(openAgain, "a new livestream report should land in the existing moderation queue");

    await mockRemoveReportedContent(openAgain!.id);
    const terminated = readMockDatabase().live_streams.find((item) => item.id === liveAlexander);
    assert(terminated?.status === "terminated", "terminate should mark the row terminated without deleting it");
    assert(terminated, "terminate must keep the livestream database record");
    assert(
      mockListPublicLiveStreams().every((item) => item.id !== liveAlexander),
      "terminated streams must not appear as public live/ended coverage",
    );

    const publicView = await mockGetLiveStreamPage(liveAlexander, alex);
    assert(publicView?.status === "terminated", "public can see a tombstone");
    assert(!publicView?.playbackUrl, "public must not get the recording");
    assert(!publicView?.reportId, "terminated recording must not link as a public report");

    const adminView = await mockGetLiveStreamPage(liveAlexander, jordan);
    assert(adminView?.playbackUrl, "admin may still review a kept recording");

    let endRejected = false;
    try {
      await mockEndLiveStream(priya, liveAlexander);
    } catch (error) {
      endRejected = error instanceof Error && error.message.includes("removed from public view");
    }
    assert(endRejected, "ending a terminated stream must not publish a public report");

    await mockSubmitModerationReport({
      userId: alex,
      contentType: "live_stream",
      contentId: liveParkEnded,
      reason: "illegal_content",
      details: null,
    });
    const parkFlag = (await mockListModerationReports()).find(
      (item) => item.contentId === liveParkEnded && item.status === "open",
    );
    assert(parkFlag, "ended livestream should be reportable");
    await mockRemoveReportedContent(parkFlag!.id);
    const hiddenReport = await mockGetReportPage(liveParkReport, alex);
    assert(!hiddenReport, "terminated recording must not stay a public report");
    const adminReport = await mockGetReportPage(liveParkReport, jordan);
    assert(adminReport?.removedAt, "admin can still open the hidden recording report");

    await mockSetReporterLivePrivilege(priya, false);
    assert(
      readMockDatabase().profiles.find((item) => item.id === priya)?.can_live_stream === false,
      "admin can disable live without deleting the account",
    );
    let privilegeBlocked = false;
    try {
      await mockCreateLiveStream({
        userId: priya,
        title: "Should not go live",
        locationId: park,
      });
    } catch (error) {
      privilegeBlocked = error instanceof Error && error.message === "live-privilege";
    }
    assert(privilegeBlocked, "disabled reporters cannot create a livestream");

    console.log("live moderation mock checks passed");
  } finally {
    if (previous) {
      writeFileSync(dbPath, previous);
    } else {
      writeMockDatabase(createSeedDatabase());
    }
  }
}

run();
