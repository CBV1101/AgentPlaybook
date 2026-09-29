import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  LIVE_STUDIO_ON_AIR_MESSAGE,
  liveStudioShowsOnAirCopy,
  liveStudioStartControl,
  liveStudioStartLabelConflictsWithOnAir,
} from "../lib/live/studio-controls";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function run() {
  const idle = liveStudioStartControl({ live: false, busy: false });
  assert(idle.label === "Start broadcast", "not live → Start broadcast");
  assert(!idle.disabled, "idle start is enabled");
  assert(idle.appearance === "start", "idle uses the start appearance");
  assert(!liveStudioShowsOnAirCopy(idle.statusMessage), "idle is not on-air copy");

  const connecting = liveStudioStartControl({ live: false, busy: true });
  assert(connecting.label === "Starting…", "connecting → Starting…");
  assert(connecting.disabled, "connecting is disabled");
  assert(connecting.appearance === "working", "connecting uses working appearance");

  const live = liveStudioStartControl({ live: true, busy: false });
  assert(live.label === "Stream is live", "live → Stream is live");
  assert(live.disabled, "live control is disabled");
  assert(live.appearance === "on-air", "live uses gray on-air appearance");
  assert(live.statusMessage === LIVE_STUDIO_ON_AIR_MESSAGE, "live status is You are live");
  assert(!liveStudioStartLabelConflictsWithOnAir(live), "You are live cannot pair with Start broadcast");

  const liveWhileEnding = liveStudioStartControl({ live: true, busy: true });
  assert(liveWhileEnding.label === "Stream is live", "busy must not hide Stream is live once live");
  assert(liveWhileEnding.statusMessage === LIVE_STUDIO_ON_AIR_MESSAGE, "ending still shows You are live");

  const failed = liveStudioStartControl({
    live: false,
    busy: false,
    message: "Could not start the broadcast.",
    phase: "failed",
  });
  assert(failed.label === "Start broadcast", "failed → Start broadcast");
  assert(failed.statusMessage !== LIVE_STUDIO_ON_AIR_MESSAGE, "failed is not on-air copy");

  const ended = liveStudioStartControl({ live: false, busy: false, phase: "ended" });
  assert(ended.label === "Start broadcast", "ended → Start broadcast");
  assert(ended.statusMessage !== LIVE_STUDIO_ON_AIR_MESSAGE, "ended has no Stream is live / You are live");

  const leftoverOnAir = liveStudioStartControl({
    live: false,
    busy: false,
    message: LIVE_STUDIO_ON_AIR_MESSAGE,
  });
  assert(leftoverOnAir.label === "Stream is live", "You are live copy must force Stream is live");
  assert(leftoverOnAir.disabled, "on-air copy must disable start");
  assert(leftoverOnAir.appearance === "on-air", "on-air copy must use gray appearance");
  assert(!liveStudioStartLabelConflictsWithOnAir(leftoverOnAir), "You are live cannot pair with Start broadcast");

  const fromStreamStatus = liveStudioStartControl({
    live: false,
    busy: false,
    streamStatus: "live",
  });
  assert(fromStreamStatus.label === "Stream is live", "stream.status live must show Stream is live");
  assert(fromStreamStatus.appearance === "on-air", "stream.status live must use gray appearance");

  const conflict = liveStudioStartLabelConflictsWithOnAir({
    phase: "idle",
    label: "Start broadcast",
    disabled: false,
    appearance: "start",
    statusMessage: LIVE_STUDIO_ON_AIR_MESSAGE,
  });
  assert(conflict, "helper detects You are live + Start broadcast as invalid");

  const studioSrc = readFileSync(join(process.cwd(), "components/live-studio.tsx"), "utf8");
  assert(studioSrc.includes('data-studio-start="on-air"'), "studio mounts a dedicated on-air control");
  assert(studioSrc.includes("bg-canvas"), "on-air control uses gray canvas, not live red");
  assert(studioSrc.includes("cursor-not-allowed"), "on-air control uses a disabled cursor");

  console.log("live studio control tests passed");
}

run();
