import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const src = readFileSync(join(process.cwd(), "components/cloudflare-whep-reference-client.tsx"), "utf8");
assert(src.includes("new RTCPeerConnection()"), "reference client must use an empty RTCPeerConnection");
assert(src.includes('addTransceiver("video", { direction: "recvonly" })'), "reference client must add recvonly video");
assert(src.includes('addTransceiver("audio", { direction: "recvonly" })'), "reference client must add recvonly audio");
assert(src.includes("body: offer.sdp"), "reference client must POST offer.sdp immediately");
assert(!src.includes("waitForIceGatheringComplete"), "reference client must not wait for ICE complete");
assert(!src.includes("BROADCAST_RTC_CONFIGURATION"), "reference client must not use Firsthand STUN config");
assert(!src.includes("createDataChannel"), "reference client must not create a data channel");
assert(!src.includes("attachWhepViewer"), "reference client must not use the Firsthand WHEP helper");
assert(!src.includes("claimLivePreviewSlot"), "reference client must not claim a preview slot");

const apiSrc = readFileSync(join(process.cwd(), "app/api/dev/cloudflare-whep-test/route.ts"), "utf8");
assert(apiSrc.includes("getDevReferenceWhepPlaybackUrl"), "DEV API must use Firsthand live-row discovery");
assert(!apiSrc.includes("getConnectedCloudflareWhepPlaybackUrl"), "DEV API must not select by list connected heuristic");

const discoverySrc = readFileSync(join(process.cwd(), "lib/live/dev-whep-discovery.ts"), "utf8");
assert(discoverySrc.includes('.eq("status", "live")'), "discovery must use the current Firsthand live broadcast");
assert(discoverySrc.includes("getCloudflareLiveInput"), "discovery must GET the exact Live Input");
assert(discoverySrc.includes("resolveCloudflareLiveWhepUrl"), "discovery must use webRTCPlayback.url from that GET");
assert(!discoverySrc.includes("isCloudflareLiveInputConnected(item.status)"), "discovery must not filter the list for connected");

console.log("cloudflare WHEP reference client tests passed");
