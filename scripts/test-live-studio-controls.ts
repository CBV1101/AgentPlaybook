import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  LIVE_STUDIO_ON_AIR_MESSAGE,
  liveStudioShowsOnAirCopy,
  liveStudioStartControl,
  liveStudioStartLabelConflictsWithOnAir,
} from "../lib/live/studio-controls";
import {
  liveStudioAllowsNewWhipConnection,
  liveStudioShouldRequestCamera,
  liveStudioShowsCameraRetry,
  liveStudioVideoSurface,
} from "../lib/live/studio-surface";

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
  const studioControlsSrc = readFileSync(join(process.cwd(), "lib/live/studio-controls.ts"), "utf8");
  assert(studioSrc.includes('data-studio-start="on-air"'), "studio mounts a dedicated on-air control");
  assert(studioSrc.includes("LIVE_STUDIO_ON_AIR_BUTTON_CLASS"), "studio uses the dedicated on-air button class");
  assert(studioControlsSrc.includes("bg-canvas"), "on-air control uses gray canvas, not live red");
  assert(studioControlsSrc.includes("cursor-not-allowed"), "on-air control uses a disabled cursor");

  assert(!studioSrc.includes("Enable camera"), "successful studio must not permanently show Enable camera");
  assert(studioSrc.includes("Retry camera"), "camera failure may show Retry camera");
  assert(studioSrc.includes("LiveWhepVideo"), "resumed live studio reuses the public WHEP viewer");
  assert(studioSrc.includes("liveStudioShouldRequestCamera"), "studio gates getUserMedia off resumed live tabs");
  assert(studioSrc.includes("liveStudioAllowsNewWhipConnection"), "studio must not start a second WHIP on resume");
  assert(studioSrc.includes("/api/live/end"), "end broadcast still posts to the server end path");
  assert(!studioSrc.includes("createCloudflareLiveInput"), "studio must not create a Cloudflare Live Input");

  const newStudio = liveStudioVideoSurface({ serverStatus: "created", ownsLocalBroadcaster: false });
  assert(newStudio === "local-preview", "new studio uses local camera preview");
  assert(
    liveStudioShouldRequestCamera({ serverStatus: "created", ownsLocalBroadcaster: false }),
    "new studio still requests camera automatically",
  );
  assert(
    liveStudioAllowsNewWhipConnection({ serverStatus: "created", ownsLocalBroadcaster: false }),
    "new studio may establish WHIP",
  );
  assert(
    !liveStudioShowsCameraRetry("", true),
    "successful camera init does not show a camera button",
  );
  assert(
    liveStudioShowsCameraRetry("Camera permission was denied.", true),
    "camera failure may show Retry camera",
  );

  const originalLive = liveStudioVideoSurface({
    serverStatus: "live",
    ownsLocalBroadcaster: true,
    whepUrl: "https://example.cloudflarestream.com/uid/webRTC/play",
  });
  assert(originalLive === "local-preview", "owning tab keeps local camera preview");
  assert(
    !liveStudioShouldRequestCamera({ serverStatus: "live", ownsLocalBroadcaster: true }),
    "owning tab does not re-request camera for playback",
  );
  assert(
    !liveStudioAllowsNewWhipConnection({ serverStatus: "live", ownsLocalBroadcaster: true }),
    "owning live tab does not create a second WHIP",
  );

  const resumedLive = liveStudioVideoSurface({
    serverStatus: "live",
    ownsLocalBroadcaster: false,
    whepUrl: "https://example.cloudflarestream.com/uid/webRTC/play",
  });
  assert(resumedLive === "whep-playback", "resumed live tab uses WHEP, not a blank local video");
  assert(
    !liveStudioShouldRequestCamera({ serverStatus: "live", ownsLocalBroadcaster: false }),
    "resumed live tab must not request camera merely for playback",
  );
  assert(
    !liveStudioAllowsNewWhipConnection({ serverStatus: "live", ownsLocalBroadcaster: false }),
    "resumed live tab must not create another WHIP connection",
  );

  const resumedOnAir = liveStudioStartControl({ live: true, busy: false, streamStatus: "live" });
  assert(resumedOnAir.label === "Stream is live", "resumed live shows Stream is live");
  assert(resumedOnAir.disabled, "resumed Stream is live is not clickable");

  console.log("live studio control tests passed");
}

run();
