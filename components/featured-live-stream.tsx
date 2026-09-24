import { CompactLiveStreamCard } from "@/components/compact-live-stream-card";
import type { LiveStreamSummary } from "@/lib/live";

/** @deprecated Use CompactLiveStreamCard. Kept so existing imports keep working. */
export function FeaturedLiveStream({
  stream,
  demandCount = 0,
}: {
  stream: LiveStreamSummary;
  demandCount?: number;
}) {
  return <CompactLiveStreamCard stream={stream} demandCount={demandCount} />;
}

export function LiveStreamCard({
  stream,
  demandCount = 0,
}: {
  stream: LiveStreamSummary;
  demandCount?: number;
  compact?: boolean;
}) {
  return <CompactLiveStreamCard stream={stream} demandCount={demandCount} />;
}
