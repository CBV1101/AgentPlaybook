/**
 * Lightweight investigation analytics hooks.
 * No extra vendor. Call sites may no-op until a product analytics sink exists.
 */
export type InvestigationAnalyticsEvent =
  | "investigation_viewed"
  | "investigation_started_from_part_1"
  | "investigation_part_opened"
  | "investigation_latest_opened";

export function recordInvestigationEvent(
  _event: InvestigationAnalyticsEvent,
  _payload?: Record<string, string | number | boolean | null>,
) {
  return;
}
