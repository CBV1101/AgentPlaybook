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
console.log("cloudflare WHEP reference client tests passed");
