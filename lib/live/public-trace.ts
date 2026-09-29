export const TRACED_LIVE_TITLE = "test";

export function isTracedLiveTitle(title: string | null | undefined) {
  return title?.trim().toLowerCase() === TRACED_LIVE_TITLE;
}

export function liveDevTraceEnabled() {
  return process.env.NODE_ENV === "development";
}

export function logLivePublicTrace(line: string) {
  if (!liveDevTraceEnabled()) {
    return;
  }
  console.info(`[Firsthand Live] ${line}`);
}
