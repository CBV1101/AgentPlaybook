export const LIVE_STUDIO_ON_AIR_MESSAGE = "You are live. Keep this page open while broadcasting.";

export const LIVE_STUDIO_ON_AIR_BUTTON_CLASS =
  "inline-flex h-10 min-h-10 min-w-[10.5rem] cursor-not-allowed items-center justify-center rounded-md border border-line bg-canvas px-4 text-sm font-medium text-muted";

export type LiveStudioStartPhase = "idle" | "connecting" | "live" | "failed" | "ended";

export type LiveStudioStartControl = {
  phase: "idle" | "connecting" | "live";
  label: string;
  disabled: boolean;
  appearance: "start" | "working" | "on-air";
  statusMessage: string;
};

export function liveStudioIsOnAir(input: {
  live: boolean;
  streamStatus?: string;
  message?: string;
}) {
  return (
    input.live ||
    input.streamStatus === "live" ||
    input.message === LIVE_STUDIO_ON_AIR_MESSAGE
  );
}

export function liveStudioStartControl(input: {
  live: boolean;
  busy: boolean;
  message?: string;
  streamStatus?: string;
  phase?: LiveStudioStartPhase;
}): LiveStudioStartControl {
  const onAir = liveStudioIsOnAir(input) || input.phase === "live";
  if (onAir) {
    return {
      phase: "live",
      label: "Stream is live",
      disabled: true,
      appearance: "on-air",
      statusMessage: LIVE_STUDIO_ON_AIR_MESSAGE,
    };
  }
  if (input.busy || input.phase === "connecting") {
    return {
      phase: "connecting",
      label: "Starting…",
      disabled: true,
      appearance: "working",
      statusMessage: input.message ?? "",
    };
  }
  return {
    phase: "idle",
    label: "Start broadcast",
    disabled: false,
    appearance: "start",
    statusMessage: input.message ?? "",
  };
}

export function liveStudioShowsOnAirCopy(statusMessage: string) {
  return statusMessage === LIVE_STUDIO_ON_AIR_MESSAGE;
}

export function liveStudioStartLabelConflictsWithOnAir(control: LiveStudioStartControl) {
  return liveStudioShowsOnAirCopy(control.statusMessage) && control.label === "Start broadcast";
}
