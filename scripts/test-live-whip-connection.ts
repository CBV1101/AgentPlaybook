import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  allowMockLiveProtocol,
  assertSupabaseCanMarkLive,
  assertSupabaseLiveCreateAllowed,
  LIVE_UNAVAILABLE_CODE,
} from "../lib/live/fail-closed";
import { mockLiveBroadcastSession } from "../lib/data/mock/live-repository";
import { isCloudflareLiveConfigured } from "../lib/media/cloudflare-live";
import {
  LIVE_PEER_CONNECT_TIMEOUT_MS,
  BROADCAST_RTC_CONFIGURATION,
  canCallLiveStart,
  establishWhipBroadcast,
  shouldFailBroadcastForConnectionState,
  waitForPeerConnected,
  whipHttpSuccessMarksLive,
} from "../lib/live/whip-connection";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function throws(fn: () => unknown, code: string, message: string) {
  try {
    fn();
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    assert(text === code, `${message}: got ${text}`);
    return;
  }
  throw new Error(`${message}: expected throw`);
}

class FakePeer extends EventTarget {
  iceGatheringState: RTCIceGatheringState = "new";
  connectionState: RTCPeerConnectionState = "new";
  iceConnectionState: RTCIceConnectionState = "new";
  signalingState: RTCSignalingState = "stable";
  localDescription: RTCSessionDescription | null = null;
  remoteDescription: RTCSessionDescription | null = null;
  gatheredSdp = "v=0\r\no=- 1 1 IN IP4 0.0.0.0\r\na=candidate:1";
  offerSdp = "v=0\r\no=- 0 0 IN IP4 0.0.0.0";
  connectOnAnswer = true;
  holdGathering = false;
  localTracks = 1;

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    assert(this.localTracks > 0, "WHIP offer requires local tracks");
    return { type: "offer", sdp: this.offerSdp };
  }

  async setLocalDescription(desc: RTCSessionDescriptionInit) {
    this.localDescription = {
      type: desc.type ?? "offer",
      sdp: this.gatheredSdp,
      toJSON() {
        return { type: this.type, sdp: this.sdp };
      },
    } as RTCSessionDescription;
    this.iceGatheringState = "gathering";
    if (this.holdGathering) {
      return;
    }
    queueMicrotask(() => {
      this.iceGatheringState = "complete";
      this.dispatchEvent(new Event("icegatheringstatechange"));
    });
  }

  async setRemoteDescription(desc?: RTCSessionDescriptionInit) {
    if (desc?.sdp) {
      this.remoteDescription = {
        type: desc.type ?? "answer",
        sdp: desc.sdp,
        toJSON() {
          return { type: this.type, sdp: this.sdp };
        },
      } as RTCSessionDescription;
    }
    if (!this.connectOnAnswer) {
      return;
    }
    queueMicrotask(() => {
      this.connectionState = "connected";
      this.iceConnectionState = "connected";
      this.dispatchEvent(new Event("connectionstatechange"));
    });
  }
}

async function run() {
  const studio = readFileSync(join(process.cwd(), "components/live-studio.tsx"), "utf8");
  const whipSrc = readFileSync(join(process.cwd(), "lib/live/whip-connection.ts"), "utf8");
  const establishSrc = whipSrc.slice(whipSrc.indexOf("export async function establishWhipBroadcast"));
  assert(studio.includes("establishWhipBroadcast"), "B: LiveStudio must establish WHIP before /api/live/start");
  assert(studio.includes("addTransceiver(track, { direction: \"sendonly\" })"), "WHIP adds local sendonly tracks");
  assert(!studio.includes("signal: whipAbort"), "WHIP establishment must not use a React abort signal");
  assert(establishSrc.includes("waitForWhipIceGathering"), "WHIP must use the WHIP-specific ICE wait");
  assert(!establishSrc.includes("waitForIceGatheringComplete"), "WHIP establishment must not use the WHEP ICE wait");
  assert(!establishSrc.includes("input.signal"), "WHIP POST must not take a React AbortSignal");
  assert(
    establishSrc.indexOf("setLocalDescription") < establishSrc.indexOf("waitForWhipIceGathering"),
    "WHIP must setLocalDescription before ICE wait",
  );
  assert(studio.includes("canCallLiveStart"), "B: LiveStudio must gate start on connection");
  assert(studio.includes("BROADCAST_RTC_CONFIGURATION"), "LiveStudio must use the shared RTCConfiguration");
  assert((BROADCAST_RTC_CONFIGURATION.iceServers?.length ?? 0) > 0, "ICE servers must be configured");
  assert(
    (BROADCAST_RTC_CONFIGURATION.iceServers ?? []).every((server) => !("username" in server) && !("credential" in server)),
    "ICE servers must be STUN-only without credentials",
  );

  assert(!whipHttpSuccessMarksLive(), "A: WHIP HTTP success alone does not mark LIVE");
  assert(
    !canCallLiveStart({ protocol: "webrtc", whipHttpOk: true, connectionState: "connecting" }),
    "A: connecting after WHIP HTTP must not allow /api/live/start",
  );
  assert(
    canCallLiveStart({ protocol: "webrtc", whipHttpOk: true, connectionState: "connected" }),
    "B: connected is required before /api/live/start on webrtc",
  );
  assert(canCallLiveStart({ protocol: "mock" }), "G: mock protocol may start without WebRTC");

  assert(LIVE_PEER_CONNECT_TIMEOUT_MS >= 15_000 && LIVE_PEER_CONNECT_TIMEOUT_MS <= 20_000, "C: connect timeout is 15–20s");
  assert(shouldFailBroadcastForConnectionState("failed"), "D: failed peer state must fail the broadcast");
  assert(!shouldFailBroadcastForConnectionState("disconnected", 100), "disconnected must not fail immediately");
  assert(shouldFailBroadcastForConnectionState("disconnected", 8_000), "D: persistent disconnect eventually fails");

  const hanging = new FakePeer();
  hanging.connectOnAnswer = false;
  hanging.connectionState = "connecting";
  await waitForPeerConnected(hanging, 40).then(
    () => {
      throw new Error("C: timeout must reject");
    },
    (error) => {
      assert(error instanceof Error && error.message === "live-connection-timeout", "C: timeout error code");
      assert(!canCallLiveStart({ protocol: "webrtc", whipHttpOk: true, connectionState: hanging.connectionState }), "C: timeout is not LIVE");
    },
  );

  let postedBody = "";
  let deleted = false;
  const connectedPeer = new FakePeer();
  const result = await establishWhipBroadcast({
    pc: connectedPeer as unknown as RTCPeerConnection,
    whipUrl: "https://example.invalid/whip",
    iceGatherTimeoutMs: 200,
    connectTimeoutMs: 200,
    fetchFn: async (_url, init) => {
      if (init?.method === "DELETE") {
        deleted = true;
        return new Response(null, { status: 204 });
      }
      postedBody = String(init?.body ?? "");
      return new Response("v=0-answer", {
        status: 201,
        headers: { Location: "/session/1" },
      });
    },
  });
  assert(postedBody === connectedPeer.gatheredSdp, "WHIP POST must use localDescription after ICE gathering");
  assert(postedBody !== connectedPeer.offerSdp, "WHIP POST must not use the original offer SDP");
  assert(result.whipStatus === 201, "WHIP signaling status is recorded");
  assert(Boolean(result.sessionUrl), "WHIP Location is preserved for cleanup");
  assert(!deleted, "successful connect must not DELETE the WHIP session");

  let timeoutPosts = 0;
  const gatherTimeoutPeer = new FakePeer();
  gatherTimeoutPeer.holdGathering = true;
  await establishWhipBroadcast({
    pc: gatherTimeoutPeer as unknown as RTCPeerConnection,
    whipUrl: "https://example.invalid/whip",
    iceGatherTimeoutMs: 40,
    connectTimeoutMs: 200,
    fetchFn: async (_url, init) => {
      if (init?.method === "DELETE") {
        return new Response(null, { status: 204 });
      }
      timeoutPosts += 1;
      assert(gatherTimeoutPeer.iceGatheringState !== "complete", "WHIP may POST while gathering after ICE wait timeout");
      assert(String(init?.body ?? "") === gatherTimeoutPeer.gatheredSdp, "WHIP POST after ICE timeout still uses localDescription");
      return new Response("v=0-answer", {
        status: 201,
        headers: { Location: "/session/timeout" },
      });
    },
  });
  assert(timeoutPosts === 1, "WHIP ICE wait timeout must not kill establishment or skip POST");

  const hangingBodyPeer = new FakePeer();
  hangingBodyPeer.connectOnAnswer = false;
  await establishWhipBroadcast({
    pc: hangingBodyPeer as unknown as RTCPeerConnection,
    whipUrl: "https://example.invalid/whip",
    iceGatherTimeoutMs: 200,
    connectTimeoutMs: 5_000,
    bodyTimeoutMs: 40,
    fetchFn: async () =>
      new Response(
        new ReadableStream({
          start() {
            // Intentionally never enqueue or close, matching a stalled WHIP body.
          },
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/sdp" },
        },
      ),
  }).then(
    () => {
      throw new Error("hanging WHIP body must time out");
    },
    (error) => {
      assert(error instanceof Error && error.name === "TimeoutError", "WHIP body read timeout");
    },
  );

  const timeoutPeer = new FakePeer();
  timeoutPeer.connectOnAnswer = false;
  let cleanupDelete = false;
  await establishWhipBroadcast({
    pc: timeoutPeer as unknown as RTCPeerConnection,
    whipUrl: "https://example.invalid/whip",
    iceGatherTimeoutMs: 200,
    connectTimeoutMs: 40,
    fetchFn: async (_url, init) => {
      if (init?.method === "DELETE") {
        cleanupDelete = true;
        return new Response(null, { status: 204 });
      }
      return new Response("v=0-answer", { status: 201, headers: { Location: "/session/2" } });
    },
  }).then(
    () => {
      throw new Error("C: establishWhipBroadcast must fail on connect timeout");
    },
    (error) => {
      assert(error instanceof Error && error.message === "live-connection-timeout", "C: connect timeout");
    },
  );
  assert(cleanupDelete, "C: failed startup must DELETE the WHIP session");

  throws(
    () => assertSupabaseLiveCreateAllowed(isCloudflareLiveConfigured({ CLOUDFLARE_ACCOUNT_ID: "", CLOUDFLARE_STREAM_API_TOKEN: "" })),
    LIVE_UNAVAILABLE_CODE,
    "E: missing Cloudflare still fails closed",
  );
  throws(() => assertSupabaseCanMarkLive("local-x"), LIVE_UNAVAILABLE_CODE, "F: local-* cannot start a supabase stream");
  throws(() => assertSupabaseCanMarkLive("mock-live-x"), LIVE_UNAVAILABLE_CODE, "F: mock ids cannot start a supabase stream");
  assert(allowMockLiveProtocol("mock"), "G: mock data source still allows mock live protocol");
  const session = await mockLiveBroadcastSession(
    "22222222-2222-4222-8222-222222222222",
    "13131313-1313-4131-8131-131313131311",
  );
  assert(session.protocol === "mock", "G: mock session protocol still works");

  console.log("live WHIP connection tests passed");
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
