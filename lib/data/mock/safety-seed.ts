import type { MockDatabase } from "@/lib/data/mock/seed";

const liveAlexander = "13131313-1313-4131-8131-131313131311";
const phoenixReport = "ccccccc1-cccc-4ccc-8ccc-ccccccccccc2";
const alex = "33333333-3333-4333-8333-333333333333";
const jordan = "11111111-1111-4111-8111-111111111111";

export function applySafetySeed(database: MockDatabase): MockDatabase {
  for (const profile of database.profiles) {
    profile.can_live_stream = profile.can_live_stream ?? true;
    profile.role = profile.role ?? (profile.id === jordan ? "admin" : "member");
    profile.topics = profile.topics ?? [];
  }
  for (const report of database.reports) {
    report.sensitive_content = report.sensitive_content ?? false;
  }
  for (const stream of database.live_streams ?? []) {
    stream.sensitive_content = stream.sensitive_content ?? false;
  }

  const sensitiveReport = database.reports.find((item) => item.id === phoenixReport);
  if (sensitiveReport) {
    sensitiveReport.sensitive_content = true;
  }
  const sensitiveLive = (database.live_streams ?? []).find((item) => item.id === liveAlexander);
  if (sensitiveLive) {
    sensitiveLive.sensitive_content = true;
  }

  database.moderation_reports ??= [];
  database.moderation_reports.push({
    id: "14141414-1414-4141-8141-141414141411",
    submitted_by: alex,
    content_type: "live_stream",
    content_id: liveAlexander,
    reason: "graphic_content",
    details: "People in the square are visible at close range; please review whether this should stay live.",
    created_at: "2026-09-11T13:20:00.000Z",
    status: "open",
  });

  return database;
}
