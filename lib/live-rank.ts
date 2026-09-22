import type { LiveStreamSummary } from "@/lib/live";
import type { CoverageRequest, EventSummary } from "@/lib/types";

export type RankedLiveStream = {
  stream: LiveStreamSummary;
  score: number;
  demandCount: number;
};

/**
 * Homepage live ranking from product signals, not editorial importance.
 * Demand (people who asked for coverage) outweighs event activity and recency.
 */
export function rankLiveNow(
  streams: LiveStreamSummary[],
  requests: CoverageRequest[],
  events: EventSummary[],
  now = Date.now(),
): RankedLiveStream[] {
  const demandByRequest = new Map(requests.map((item) => [item.id, item.supporterCount]));
  const eventById = new Map(events.map((item) => [item.id, item]));

  return streams
    .filter((stream) => stream.status === "live")
    .map((stream) => {
      const demandCount = stream.requestId ? (demandByRequest.get(stream.requestId) ?? 0) : 0;
      const event = stream.eventId ? eventById.get(stream.eventId) : undefined;
      const recency = recencyScore(stream.startedAt, now);
      const score =
        demandCount * 100 +
        (event?.openRequestCount ?? 0) * 20 +
        (event?.reportCount ?? 0) * 5 +
        recency;
      return { stream, score, demandCount };
    })
    .sort((a, b) => b.score - a.score || (b.stream.startedAt ?? "").localeCompare(a.stream.startedAt ?? ""));
}

function recencyScore(startedAt: string | null, now: number) {
  if (!startedAt) {
    return 0;
  }
  const ageMs = now - new Date(startedAt).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) {
    return 40;
  }
  const hours = ageMs / 3_600_000;
  if (hours < 0.5) {
    return 50;
  }
  if (hours < 2) {
    return 30;
  }
  if (hours < 6) {
    return 15;
  }
  return 5;
}
