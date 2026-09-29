import { readFileSync } from "node:fs";
import { join } from "node:path";
import { establishWhepPlayback } from "../lib/live/whep-viewer";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

class FakeWhepPeer extends EventTarget {
  iceGatheringState: RTCIceGatheringState = "new";
  connectionState: RTCPeerConnectionState = "new";
  iceConnectionState: RTCIceConnectionState = "new";
  signalingState: RTCSignalingState = "have-local-offer";
  localDescription: RTCSessionDescription | null = null;
  remoteDescription: RTCSessionDescription | null = null;
  offerSdp = "v=0\r\no=- 0 0 IN IP4 0.0.0.0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\na=recvonly";
  createdDataChannels = 0;

  createDataChannel() {
    this.createdDataChannels += 1;
    return {} as RTCDataChannel;
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    return { type: "offer", sdp: this.offerSdp };
  }

  async setLocalDescription(desc: RTCSessionDescriptionInit) {
    this.localDescription = {
      type: desc.type ?? "offer",
      sdp: desc.sdp ?? this.offerSdp,
      toJSON() {
        return { type: this.type, sdp: this.sdp };
      },
    } as RTCSessionDescription;
    this.iceGatheringState = "gathering";
  }

  async setRemoteDescription(desc?: RTCSessionDescriptionInit) {
    this.remoteDescription = {
      type: desc?.type ?? "answer",
      sdp: desc?.sdp ?? "",
      toJSON() {
        return { type: this.type, sdp: this.sdp };
      },
    } as RTCSessionDescription;
  }
}

async function run() {
  const whepSrc = readFileSync(join(process.cwd(), "lib/live/whep-viewer.ts"), "utf8");
  assert(whepSrc.includes("new RTCPeerConnection()"), "production WHEP must use an empty RTCPeerConnection");
  assert(!whepSrc.includes("BROADCAST_RTC_CONFIGURATION"), "production WHEP must not use WHIP STUN config");
  assert(!whepSrc.includes("waitForIceGatheringComplete"), "production WHEP must not wait for ICE complete");
  assert(!whepSrc.includes("waitForWhipIceGathering"), "WHEP must not use the WHIP ICE wait");
  assert(!whepSrc.includes("createDataChannel"), "production WHEP must not create a data channel");
  assert(whepSrc.includes('addTransceiver("video", { direction: "recvonly" })'), "WHEP must request recvonly video");
  assert(whepSrc.includes('addTransceiver("audio", { direction: "recvonly" })'), "WHEP must request recvonly audio");
  assert(whepSrc.includes("body: offer.sdp"), "WHEP must POST offer.sdp immediately");
  assert(whepSrc.includes("stream.addTrack(event.track)"), "WHEP ontrack must add the remote track to the local stream");
  const establishIdx = whepSrc.indexOf("export async function establishWhepPlayback");
  const postIdx = whepSrc.indexOf("method: \"POST\"", establishIdx);
  assert(whepSrc.lastIndexOf("setLocalDescription", postIdx) < postIdx, "setLocalDescription must happen before WHEP POST");
  assert(!whepSrc.slice(establishIdx, postIdx).includes("waitFor"), "WHEP must not wait between setLocalDescription and POST");

  const whipSrc = readFileSync(join(process.cwd(), "lib/live/whip-connection.ts"), "utf8");
  assert(whipSrc.includes("export function waitForWhipIceGathering"), "WHIP ICE wait remains separate");
  assert(whipSrc.includes("BROADCAST_RTC_CONFIGURATION"), "WHIP still uses STUN config");
  const studioSrc = readFileSync(join(process.cwd(), "components/live-studio.tsx"), "utf8");
  assert(studioSrc.includes("addTransceiver(track, { direction: \"sendonly\" })"), "WHIP still adds local sendonly tracks");

  let postedBody = "";
  let postedWhileGathering = false;
  const peer = new FakeWhepPeer();
  const result = await establishWhepPlayback({
    pc: peer as unknown as RTCPeerConnection,
    whepUrl: "https://example.invalid/webRTC/play",
    fetchFn: async (_url, init) => {
      postedWhileGathering = peer.iceGatheringState !== "complete";
      postedBody = String(init?.body ?? "");
      return new Response("v=0-answer", {
        status: 201,
        headers: { Location: "/whep/session" },
      });
    },
  });
  assert(postedWhileGathering, "Cloudflare WHEP POSTs immediately, even while ICE is still gathering");
  assert(postedBody === peer.offerSdp, "WHEP POST must use offer.sdp");
  assert(result.status === 201, "WHEP must accept a 201 SDP answer");
  assert(peer.remoteDescription?.sdp === "v=0-answer", "WHEP answer is applied after POST");
  assert(peer.createdDataChannels === 0, "WHEP must not create a data channel");

  let abortedPosts = 0;
  const hanging = new FakeWhepPeer();
  const abort = new AbortController();
  abort.abort();
  await establishWhepPlayback({
    pc: hanging as unknown as RTCPeerConnection,
    whepUrl: "https://example.invalid/webRTC/play",
    signal: abort.signal,
    fetchFn: async () => {
      abortedPosts += 1;
      return new Response("should-not-post", { status: 201 });
    },
  }).then(
    () => {
      throw new Error("aborted WHEP must not POST");
    },
    (error) => {
      assert(error instanceof Error && error.name === "AbortError", "unmount aborts WHEP before POST");
    },
  );
  assert(abortedPosts === 0, "an aborted WHEP viewer must not POST after teardown");

  console.log("live WHEP ICE gathering tests passed");
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
