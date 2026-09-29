import { readFileSync } from "node:fs";
import { join } from "node:path";
import { applyHomepageShowcase, HOMEPAGE_SHOWCASE_ID_PREFIX, mergeHomepageLiveStreams } from "../lib/homepage-showcase";
import { rankLiveNow } from "../lib/live-rank";
import {
  cloudflareCustomerLiveIframeUrl,
  cloudflareCustomerWhepPlaybackUrl,
  isCloudflareCustomerLiveIframeUrl,
  isGenericCloudflareIframeHost,
} from "../lib/live/customer-player";
import {
  liveCardUsesLivePreview,
  livePreviewAllowsAutoplay,
  livePreviewHasNavigationOverlay,
  livePreviewIframeIsInteractive,
  livePreviewSurface,
} from "../lib/live/preview-source";
import { liveViewerSelectedRenderer } from "../lib/live/viewer-render";
import { tryClaimLivePreviewSlot, releaseLivePreviewSlot } from "../lib/live/preview-slot";
import { inboundVideoFromStats, mediaStreamForRemoteTrack, summarizeRtcTransport, summarizeSdp } from "../lib/live/whep-stats";
import { toLiveStreamSummary } from "../lib/data/live-map";
import { isCloudflareLiveInputConnected } from "../lib/media/cloudflare-live";
import { MOCK_LIVE_SAMPLE_VIDEO, type LiveStreamSummary } from "../lib/live";
import type { LiveStreamRecord } from "../lib/database.types";
import type { LocationRow } from "../lib/data/mappers";
import type { LocationSummary } from "../lib/types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const location: LocationSummary = {
  id: "loc",
  slug: "karlstad-sweden",
  href: "/place/karlstad-sweden",
  label: "Karlstad",
  place: null,
  city: "Karlstad",
  country: "Sweden",
  latitude: 59.4,
  longitude: 13.5,
};

const CUSTOMER_HLS = "https://customer-examplecode.cloudflarestream.com/live-input-uid/manifest/video.m3u8";

const WHEP_PLAYBACK = "https://customer-examplecode.cloudflarestream.com/live-input-uid/webRTC/play";

function stream(overrides: Partial<LiveStreamSummary>): LiveStreamSummary {
  return {
    id: "real-live-1",
    title: "Karlstad live",
    status: "live",
    startedAt: "2026-09-29T11:00:00.000Z",
    endedAt: null,
    location,
    reporterId: "user-1",
    reporterName: "Chris",
    reporterUsername: "chris",
    eventId: null,
    eventTitle: null,
    requestId: null,
    requestTitle: null,
    reportId: null,
    playbackKind: "whep",
    playbackUrl: WHEP_PLAYBACK,
    thumbnailUrl: null,
    sensitiveContent: false,
    recordingAssetId: null,
    viewerCount: null,
    ...overrides,
  };
}

const emptyHome = {
  liveStreams: [] as LiveStreamSummary[],
  requests: [],
  reports: [],
  places: [],
  events: [],
  cities: [],
};

function run() {
  const derived = cloudflareCustomerLiveIframeUrl("live-input-uid", CUSTOMER_HLS);
  assert(derived !== null, "customer iframe URL can be derived from HLS playback");
  assert(isCloudflareCustomerLiveIframeUrl(derived), "derived URL is the documented customer player");
  assert(derived.endsWith("/live-input-uid/iframe"), "player path is /{LIVE_INPUT_ID}/iframe");
  assert(!isGenericCloudflareIframeHost(derived), "customer player is not the generic iframe host");
  const whepDerived = cloudflareCustomerWhepPlaybackUrl("live-input-uid", CUSTOMER_HLS);
  assert(whepDerived !== null, "WHEP playback URL can be derived from customer-domain HLS");
  assert(whepDerived.endsWith("/webRTC/play"), "derived WHEP path is /{LIVE_INPUT_ID}/webRTC/play");
  assert(!whepDerived.includes("/webRTC/publish"), "derived WHEP is not the WHIP publish credential");

  const rowLocation: LocationRow = {
    id: "loc",
    slug: "karlstad-sweden",
    place: "Karlstad",
    city: "Karlstad",
    country: "Sweden",
    latitude: 59.4,
    longitude: 13.5,
  };
  const mapped = toLiveStreamSummary({
    row: {
      id: "real-live-1",
      reporter_id: "user-1",
      location_id: "loc",
      event_id: null,
      coverage_request_id: null,
      report_id: null,
      cloudflare_live_input_id: "live-input-uid",
      recording_asset_id: null,
      status: "live",
      title: "Karlstad live",
      started_at: "2026-09-29T11:00:00.000Z",
      ended_at: null,
      last_seen_at: null,
      created_at: "2026-09-29T11:00:00.000Z",
      sensitive_content: false,
      viewer_count: null,
      viewer_count_checked_at: null,
    } as LiveStreamRecord,
    location: rowLocation,
    reporterName: "Chris",
    reporterUsername: "chris",
    liveWhepUrl: WHEP_PLAYBACK,
  });
  assert(mapped.playbackKind === "whep", "mapped real live uses WHEP");
  assert(livePreviewSurface(mapped) === "whep", "mapped real live preview surface is WHEP");
  assert(liveViewerSelectedRenderer(mapped) === "whep", "home renderer selects WHEP for real live");
  assert(liveViewerSelectedRenderer({ ...mapped, playbackKind: "iframe", playbackUrl: derived }) === "fallback", "active live must not fall back to the Cloudflare iframe");

  const realLive = stream({});
  assert(livePreviewSurface(realLive) === "whep", "real live stream chooses WHEP");
  assert(liveViewerSelectedRenderer(realLive) === "whep", "selected renderer is WHEP");
  assert(!livePreviewIframeIsInteractive(realLive), "WHEP live is not the Cloudflare iframe player");
  assert(
    !livePreviewHasNavigationOverlay(realLive, "grid", { whepMounted: true }),
    "mounted WHEP player is not covered by the card navigation overlay",
  );
  assert(
    livePreviewHasNavigationOverlay(realLive, "grid", { whepMounted: false }),
    "unmounted preview may keep reporter navigation",
  );
  assert(livePreviewAllowsAutoplay(realLive, true) === true, "normal live may autoplay");
  assert(livePreviewAllowsAutoplay({ ...realLive, sensitiveContent: true }, true) === false, "sensitive live must not autoplay");
  assert(liveCardUsesLivePreview(realLive), "reporter profile live streams use LivePreview");
  assert(
    liveCardUsesLivePreview({ ...realLive, sensitiveContent: true }),
    "sensitive live streams still use LivePreview behind the gate",
  );

  const fileLive = stream({
    playbackKind: "file",
    playbackUrl: MOCK_LIVE_SAMPLE_VIDEO,
  });
  assert(livePreviewSurface(fileLive) === "file", "file playback still works");
  assert(!livePreviewIframeIsInteractive(fileLive), "file previews are not treated as Cloudflare players");
  assert(
    livePreviewHasNavigationOverlay(fileLive, "grid", { iframeMounted: false }),
    "showcase/static file previews keep the navigation overlay",
  );

  const missing = stream({ playbackKind: "whep", playbackUrl: null });
  assert(livePreviewSurface(missing) === "placeholder", "missing WHEP uses placeholder");
  assert(liveViewerSelectedRenderer(missing) === "fallback", "live without WHEP does not select iframe");

  const ended = stream({
    status: "ended",
    playbackKind: "iframe",
    playbackUrl: "https://iframe.cloudflarestream.com/recording-uid",
  });
  assert(!liveCardUsesLivePreview(ended), "recorded/non-live cards do not switch to live preview");
  assert(!livePreviewIframeIsInteractive(ended), "ended recordings are not live-player interactive");

  const showcase = applyHomepageShowcase(emptyHome, { NODE_ENV: "development" });
  assert(showcase.usingShowcase, "0 real streams may use development showcase");
  assert(showcase.liveStreams.every((item) => item.id.startsWith(HOMEPAGE_SHOWCASE_ID_PREFIX)), "0 real → showcase lives");
  assert(
    showcase.liveStreams.every((item) => item.playbackKind === "file"),
    "showcase streams keep file playback",
  );

  const oneReal = applyHomepageShowcase({ ...emptyHome, liveStreams: [realLive] }, { NODE_ENV: "development" });
  assert(oneReal.liveStreams[0]?.id === realLive.id, "1 real + showcase → real first");
  assert(liveViewerSelectedRenderer(oneReal.liveStreams[0]!) === "whep", "home real stream selects WHEP");
  assert(oneReal.liveStreams[0]?.playbackKind === "whep", "showcase merge keeps WHEP on the real live stream");
  assert(
    oneReal.liveStreams.slice(1).every((item) => liveViewerSelectedRenderer(item) === "file"),
    "showcase streams still select file",
  );
  assert(oneReal.liveStreams.slice(1).every((item) => item.id.startsWith(HOMEPAGE_SHOWCASE_ID_PREFIX)), "remaining slots may be showcase");
  assert(
    oneReal.liveStreams.slice(1).every((item) => item.playbackKind === "file" && !livePreviewIframeIsInteractive(item)),
    "showcase fillers stay non-interactive file previews",
  );

  const threeReal = [
    stream({ id: "real-1" }),
    stream({ id: "real-2", startedAt: "2026-09-29T10:00:00.000Z" }),
    stream({ id: "real-3", startedAt: "2026-09-29T09:00:00.000Z" }),
  ];
  const mergedThree = mergeHomepageLiveStreams(threeReal, showcase.liveStreams);
  assert(mergedThree.slice(0, 3).every((item) => item.id.startsWith("real-")), "3 real + showcase → all real first");

  const ranked = rankLiveNow([...showcase.liveStreams, realLive], [], []);
  assert(ranked[0]?.stream.id === realLive.id, "rankLiveNow must not let showcase outrank a real live stream");

  const production = applyHomepageShowcase({ ...emptyHome, liveStreams: [realLive] }, {
    NODE_ENV: "production",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
  });
  assert(!production.usingShowcase, "production → showcase impossible");
  assert(production.liveStreams.length === 1 && production.liveStreams[0]?.id === realLive.id, "production keeps only real streams");
  assert(
    production.liveStreams.every((item) => !item.id.startsWith(HOMEPAGE_SHOWCASE_ID_PREFIX)),
    "production cannot receive showcase playback",
  );

  assert(isCloudflareLiveInputConnected("connected"), "string connected status is connected");
  assert(isCloudflareLiveInputConnected({ current: { state: "connected" } }), "nested current.state connected is connected");
  assert(!isCloudflareLiveInputConnected({ current: { state: "disconnected" } }), "nested disconnected is not connected");

  const slots = new Set<string>();
  assert(tryClaimLivePreviewSlot(slots, "real-live-1"), "first LivePreview may load WHEP");
  assert(!tryClaimLivePreviewSlot(slots, "real-live-1"), "second LivePreview for the same stream.id must not start another WHEP session");
  releaseLivePreviewSlot(slots, "real-live-1");
  assert(tryClaimLivePreviewSlot(slots, "real-live-1"), "after release the stream may mount WHEP again");

  const existingTracks: MediaStreamTrack[] = [];
  const existing = {
    getTracks: () => existingTracks,
    addTrack(track: MediaStreamTrack) {
      existingTracks.push(track);
    },
  } as MediaStream;
  const peerStream = { getTracks: () => [], addTrack() {} } as unknown as MediaStream;
  const track = { kind: "video", id: "v1" } as MediaStreamTrack;
  assert(mediaStreamForRemoteTrack(existing, [peerStream], track) === peerStream, "ontrack uses the remote MediaStream from the peer");
  const fallback = mediaStreamForRemoteTrack(existing, [], track);
  assert(fallback === existing, "missing event.streams falls back to the local recv stream");
  assert(existingTracks.includes(track), "fallback stream receives the remote track");

  const codecId = "codec-vp8";
  const inbound = {
    type: "inbound-rtp",
    kind: "video",
    bytesReceived: 1200,
    packetsReceived: 9,
    framesReceived: 4,
    framesDecoded: 4,
    framesDropped: 0,
    frameWidth: 1280,
    frameHeight: 720,
    codecId,
  };
  const fakeStats = {
    forEach(callback: (value: unknown) => void) {
      callback({ type: "codec", id: codecId, mimeType: "video/VP8" });
      callback(inbound);
    },
  } as RTCStatsReport;
  const snap = inboundVideoFromStats(fakeStats);
  assert(snap.exists === true, "kind=video inbound-rtp is detected");
  assert(snap.bytesReceived === 1200, "inbound stats expose bytesReceived");
  assert(snap.framesDecoded === 4, "inbound stats expose framesDecoded");
  assert(snap.codec === "video/VP8", "inbound stats resolve codec mime");
  const safariKind = {
    forEach(callback: (value: unknown) => void) {
      callback({ type: "inbound-rtp", mediaType: "audio", bytesReceived: 40, packetsReceived: 2 });
    },
  } as RTCStatsReport;
  const transport = summarizeRtcTransport(safariKind);
  assert(transport.inboundAudio.exists, "Safari mediaType=audio counts as inbound audio RTP");
  assert(!transport.inboundVideo.exists, "audio-only stats do not invent a video inbound report");
  const sdp = [
    "m=video 9 UDP/TLS/RTP/SAVPF 96",
    "a=recvonly",
    "a=rtpmap:96 VP8/90000",
    "m=audio 9 UDP/TLS/RTP/SAVPF 111",
    "a=recvonly",
    "a=rtpmap:111 opus/48000/2",
    "a=candidate:1 1 udp 1 0.0.0.0 9 typ host",
  ].join("\n");
  const offerSdp = summarizeSdp(sdp);
  assert(offerSdp.video.present && offerSdp.video.direction === "recvonly", "offer video m-line is recvonly");
  assert(offerSdp.video.codecs.includes("VP8"), "offer video codecs parsed from rtpmap");
  assert(offerSdp.iceCandidateTypes.includes("host"), "ICE candidate types are parsed without logging addresses");
  const rejected = summarizeSdp("m=video 0 UDP/TLS/RTP/SAVPF 96\na=inactive");
  assert(rejected.video.inactive, "answer video port 0 / inactive is detected");

  const root = process.cwd();
  const previewSrc = readFileSync(join(root, "components/live-preview.tsx"), "utf8");
  assert(previewSrc.includes("LiveWhepVideo"), "LivePreview mounts the WHEP video for real live");
  assert(previewSrc.includes("logFirsthandViewer"), "DEV viewer diagnostics remain in LivePreview");
  assert(previewSrc.includes("data-live-iframe-interactive"), "LivePreview marks interactive live iframes");
  assert(previewSrc.includes("showNavigationOverlay && href"), "LivePreview omits the overlay over an interactive player");
  assert(previewSrc.includes("[Firsthand Playback] kind: iframe"), "DEV playback diagnostics remain in LivePreview");
  assert(previewSrc.includes("SensitiveContentGate"), "sensitive live streams remain gated");
  const cardSrc = readFileSync(join(root, "components/live-card.tsx"), "utf8");
  assert(cardSrc.includes("LivePreview"), "reporter LiveCard mounts LivePreview for live streams");
  const profileSrc = readFileSync(join(root, "app/u/[username]/page.tsx"), "utf8");
  assert(profileSrc.includes("page.liveNow.map"), "reporter profile still maps liveNow");
  assert(profileSrc.includes("<LiveCard"), "reporter profile still uses LiveCard chrome");
  const compactSrc = readFileSync(join(root, "components/compact-live-stream-card.tsx"), "utf8");
  assert(compactSrc.includes("ReporterRow"), "home metadata/reporter navigation remains");
  assert(compactSrc.includes("stream.location.href"), "home place metadata still navigates");
  assert(previewSrc.includes("tryClaimLivePreviewSlot"), "home/location LivePreview uses exclusive per-stream slots");
  assert(!previewSrc.includes("if (playingIds.has(id)) {\n    return true;"), "same stream.id must not grant a second WHEP slot");
  const whepSrc = readFileSync(join(root, "lib/live/whep-viewer.ts"), "utf8");
  assert(whepSrc.includes("mediaStreamForRemoteTrack"), "WHEP reassigns srcObject from the remote ontrack stream");
  assert(whepSrc.includes("video.srcObject = stream"), "Safari receives srcObject after remote tracks, not only an empty MediaStream");
  assert(whepSrc.includes("method: \"DELETE\""), "WHEP cleanup ends the playback session");
  assert(whepSrc.includes("PRE-WHEP-POST iceGatheringState"), "WHEP logs PRE-WHEP-POST gathering state");
  assert(whepSrc.includes('iceGatheringState !== "complete"'), "WHEP refuses POST unless ICE gathering is complete");
  assert(whepSrc.includes("localDescription?.sdp"), "WHEP posts the gathered localDescription");
  const whipSrc = readFileSync(join(root, "lib/live/whip-connection.ts"), "utf8");
  assert(whipSrc.includes("establishWhipBroadcast"), "WHIP publishing file is untouched by this viewer task");

  console.log("live preview and homepage priority tests passed");
}

run();
