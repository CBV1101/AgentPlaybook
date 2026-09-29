import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LIVE_ICE_GATHER_TIMEOUT_CODE, waitForIceGatheringComplete } from "../lib/live/whip-connection";
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
  gatheredSdp =
    "v=0\r\no=- 0 0 IN IP4 0.0.0.0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\na=recvonly\r\na=candidate:1 1 udp 1 0.0.0.0 9 typ host";
  holdGathering = false;
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
      sdp: this.offerSdp,
      toJSON() {
        return { type: this.type, sdp: this.sdp };
      },
    } as RTCSessionDescription;
    this.iceGatheringState = "gathering";
    if (this.holdGathering) {
      return;
    }
    queueMicrotask(() => {
      this.localDescription = {
        type: "offer",
        sdp: this.gatheredSdp,
        toJSON() {
          return { type: this.type, sdp: this.sdp };
        },
      } as RTCSessionDescription;
      this.iceGatheringState = "complete";
      this.dispatchEvent(new Event("icegatheringstatechange"));
    });
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
  assert(whepSrc.includes("waitForIceGatheringComplete"), "WHEP keeps waitForIceGatheringComplete (timeout-reject)");
  assert(!whepSrc.includes("waitForWhipIceGathering"), "WHEP must not use the WHIP ICE wait");
  assert(whepSrc.includes("establishWhepPlayback"), "WHEP signaling is isolated for tests");
  assert(whepSrc.includes("BROADCAST_RTC_CONFIGURATION"), "WHEP must use the same RTCConfiguration as WHIP");
  assert(whepSrc.includes('addTransceiver("video", { direction: "recvonly" })'), "WHEP must request recvonly video");
  assert(whepSrc.includes("createDataChannel"), "WHEP must create a local ICE component before the offer");
  assert(
    whepSrc.indexOf("attachIceCandidateDiagnostics") < whepSrc.indexOf("setLocalDescription"),
    "WHEP ICE candidate listeners must attach before setLocalDescription",
  );
  assert(
    whepSrc.indexOf("waitForIceGatheringOrAbort") < whepSrc.lastIndexOf("setLocalDescription"),
    "WHEP ICE wait listeners must attach before setLocalDescription",
  );
  const whipSrc = readFileSync(join(process.cwd(), "lib/live/whip-connection.ts"), "utf8");
  assert(whipSrc.includes("export function waitForWhepIceGathering"), "WHEP timeout-reject helper remains");
  assert(whipSrc.includes("export function waitForWhipIceGathering"), "WHIP timeout-resolve helper is separate");
  assert(whipSrc.includes("BROADCAST_RTC_CONFIGURATION"), "WHIP uses the shared RTCConfiguration");
  const studioSrc = readFileSync(join(process.cwd(), "components/live-studio.tsx"), "utf8");
  assert(studioSrc.includes("addTransceiver(track, { direction: \"sendonly\" })"), "WHIP adds local sendonly tracks");
  assert(!studioSrc.includes("createDataChannel"), "WHIP does not need a datachannel ICE kick");

  const alreadyComplete = {
    iceGatheringState: "complete" as const,
    addEventListener() {},
    removeEventListener() {},
  };
  await waitForIceGatheringComplete(alreadyComplete, 50);

  const delayed = new FakeWhepPeer();
  delayed.holdGathering = true;
  const delayedWait = waitForIceGatheringComplete(delayed, 500);
  globalThis.setTimeout(() => {
    delayed.localDescription = {
      type: "offer",
      sdp: delayed.gatheredSdp,
      toJSON() {
        return { type: this.type, sdp: this.sdp };
      },
    } as RTCSessionDescription;
    delayed.iceGatheringState = "complete";
    delayed.dispatchEvent(new Event("icegatheringstatechange"));
  }, 40);
  await delayedWait;

  let timeoutPosts = 0;
  const timeoutPeer = new FakeWhepPeer();
  timeoutPeer.holdGathering = true;
  await establishWhepPlayback({
    pc: timeoutPeer as unknown as RTCPeerConnection,
    whepUrl: "https://example.invalid/webRTC/play",
    iceGatherTimeoutMs: 40,
    fetchFn: async () => {
      timeoutPosts += 1;
      return new Response("should-not-post", { status: 201 });
    },
  }).then(
    () => {
      throw new Error("timeout while gathering must not POST");
    },
    (error) => {
      assert(error instanceof Error && error.message === LIVE_ICE_GATHER_TIMEOUT_CODE, "timeout while gathering must fail ICE wait");
    },
  );
  assert(timeoutPosts === 0, "timeout while still gathering must not proceed to WHEP POST");

  let postedBody = "";
  let postedWhileGathering = false;
  const peer = new FakeWhepPeer();
  await establishWhepPlayback({
    pc: peer as unknown as RTCPeerConnection,
    whepUrl: "https://example.invalid/webRTC/play",
    iceGatherTimeoutMs: 200,
    fetchFn: async (_url, init) => {
      postedWhileGathering = peer.iceGatheringState !== "complete";
      postedBody = String(init?.body ?? "");
      return new Response("v=0-answer", {
        status: 201,
        headers: { Location: "/whep/session" },
      });
    },
  });
  assert(!postedWhileGathering, "WHEP POST must not occur before ICE gathering completes");
  assert(postedBody === peer.gatheredSdp, "WHEP POST must use pc.localDescription.sdp after gathering");
  assert(postedBody !== peer.offerSdp, "WHEP POST must not use the original pre-gathering offer.sdp");
  assert(peer.remoteDescription?.sdp === "v=0-answer", "WHEP answer is applied after POST");
  assert(peer.createdDataChannels === 1, "WHEP creates one local data channel before the offer");

  let abortedPosts = 0;
  const hanging = new FakeWhepPeer();
  hanging.holdGathering = true;
  const abort = new AbortController();
  const pending = establishWhepPlayback({
    pc: hanging as unknown as RTCPeerConnection,
    whepUrl: "https://example.invalid/webRTC/play",
    iceGatherTimeoutMs: 5_000,
    signal: abort.signal,
    fetchFn: async () => {
      abortedPosts += 1;
      return new Response("should-not-post", { status: 201 });
    },
  });
  abort.abort();
  await pending.then(
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
