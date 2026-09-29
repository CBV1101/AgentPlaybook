"use client";

import { summarizeRtcTransport, summarizeSdp } from "@/lib/live/whep-stats";

function logWhep(message: string) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }
  console.info(`[Firsthand WHEP] ${message}`);
}

function signalingStatus(status: number) {
  if (status >= 200 && status < 300) {
    return "2xx";
  }
  if (status >= 400 && status < 500) {
    return "4xx";
  }
  if (status >= 500) {
    return "5xx";
  }
  return "other";
}

function logSdp(label: string, sdp: string | null | undefined) {
  const summary = summarizeSdp(sdp);
  logWhep(`${label} video m-line: ${summary.video.present ? "yes" : "no"}`);
  logWhep(`${label} video port: ${summary.video.port ?? "none"}`);
  logWhep(`${label} video direction: ${summary.video.direction ?? "none"}`);
  logWhep(`${label} video inactive: ${summary.video.inactive ? "yes" : "no"}`);
  logWhep(`${label} video codecs: ${summary.video.codecs.join(",") || "none"}`);
  logWhep(`${label} audio m-line: ${summary.audio.present ? "yes" : "no"}`);
  logWhep(`${label} audio direction: ${summary.audio.direction ?? "none"}`);
  logWhep(`${label} audio codecs: ${summary.audio.codecs.join(",") || "none"}`);
  logWhep(`${label} ICE candidate count: ${summary.iceCandidateCount}`);
  logWhep(`${label} ICE candidate types: ${summary.iceCandidateTypes.join(",") || "none"}`);
}

function logTransportSnapshot(elapsedSec: number, snapshot: ReturnType<typeof summarizeRtcTransport>) {
  logWhep(`stats ${elapsedSec}s types: ${snapshot.statTypes.join(",") || "none"}`);
  logWhep(`stats ${elapsedSec}s candidate-pair count: ${snapshot.candidatePairCount}`);
  logWhep(`stats ${elapsedSec}s selected candidate pair: ${snapshot.selectedPairState ?? "none"}`);
  logWhep(`stats ${elapsedSec}s nominated: ${snapshot.selectedPairNominated == null ? "none" : snapshot.selectedPairNominated ? "yes" : "no"}`);
  logWhep(`stats ${elapsedSec}s pair bytesSent: ${snapshot.selectedBytesSent ?? "none"}`);
  logWhep(`stats ${elapsedSec}s pair bytesReceived: ${snapshot.selectedBytesReceived ?? "none"}`);
  logWhep(
    `stats ${elapsedSec}s local candidate: ${snapshot.localCandidateType ?? "none"} ${snapshot.localCandidateProtocol ?? "none"} ${snapshot.localCandidateFamily ?? "none"}`,
  );
  logWhep(
    `stats ${elapsedSec}s remote candidate: ${snapshot.remoteCandidateType ?? "none"} ${snapshot.remoteCandidateProtocol ?? "none"} ${snapshot.remoteCandidateFamily ?? "none"}`,
  );
  logWhep(`stats ${elapsedSec}s DTLS state: ${snapshot.dtlsState ?? "none"}`);
  logWhep(`stats ${elapsedSec}s transport iceState: ${snapshot.iceState ?? "none"}`);
  logWhep(`stats ${elapsedSec}s inbound-rtp VIDEO: ${snapshot.inboundVideo.exists ? "yes" : "no"}`);
  logWhep(`stats ${elapsedSec}s inbound-rtp AUDIO: ${snapshot.inboundAudio.exists ? "yes" : "no"}`);
  logWhep(`stats ${elapsedSec}s audio bytesReceived: ${snapshot.inboundAudio.bytesReceived ?? "none"}`);
  logWhep(`stats ${elapsedSec}s audio packetsReceived: ${snapshot.inboundAudio.packetsReceived ?? "none"}`);
  logWhep(`stats ${elapsedSec}s video bytesReceived: ${snapshot.inboundVideo.bytesReceived ?? "none"}`);
  logWhep(`stats ${elapsedSec}s video packetsReceived: ${snapshot.inboundVideo.packetsReceived ?? "none"}`);
  logWhep(`stats ${elapsedSec}s video framesReceived: ${snapshot.inboundVideo.framesReceived ?? "none"}`);
  logWhep(`stats ${elapsedSec}s video framesDecoded: ${snapshot.inboundVideo.framesDecoded ?? "none"}`);
  logWhep(`stats ${elapsedSec}s video codec: ${snapshot.inboundVideo.codec ?? "none"}`);
}

function abortError() {
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw abortError();
  }
}

export async function establishWhepPlayback(input: {
  pc: RTCPeerConnection;
  whepUrl: string;
  fetchFn?: typeof fetch;
  signal?: AbortSignal;
  logStates?: (reason: string) => void;
}) {
  const fetchFn = input.fetchFn ?? fetch;
  const logStates = input.logStates ?? (() => undefined);
  throwIfAborted(input.signal);
  const offer = await input.pc.createOffer();
  logWhep("Offer created");
  logSdp("OFFER createOffer", offer.sdp);
  throwIfAborted(input.signal);
  await input.pc.setLocalDescription(offer);
  logWhep("Local description: set");
  logStates("setLocalDescription");
  logWhep(`iceGatheringState at POST: ${input.pc.iceGatheringState}`);
  logSdp("OFFER posted", offer.sdp);
  throwIfAborted(input.signal);

  const response = await fetchFn(input.whepUrl, {
    method: "POST",
    headers: { "Content-Type": "application/sdp" },
    body: offer.sdp,
    signal: input.signal,
  });
  logWhep(`WHEP signaling: ${signalingStatus(response.status)}`);
  logWhep(`ANSWER HTTP status: ${response.status}`);
  if (!response.ok) {
    throw new Error("Could not connect to the live player.");
  }
  logWhep("SUCCESSFUL WHEP HTTP: 2xx");
  const location = response.headers.get("Location");
  const sessionUrl = location ? new URL(location, input.whepUrl).toString() : null;
  const answer = await response.text();
  logWhep("Answer received");
  logSdp("ANSWER", answer);
  throwIfAborted(input.signal);
  await input.pc.setRemoteDescription({ type: "answer", sdp: answer });
  logWhep("Remote description: set");
  logStates("setRemoteDescription");
  return { sessionUrl, status: response.status };
}

export async function attachWhepViewer(input: {
  video: HTMLVideoElement;
  whepUrl: string;
  signal?: AbortSignal;
}) {
  logWhep("Peer connection: new");
  const pc = new RTCPeerConnection();
  pc.addTransceiver("video", { direction: "recvonly" });
  pc.addTransceiver("audio", { direction: "recvonly" });

  const stream = new MediaStream();
  input.video.srcObject = stream;
  let stateSeq = 0;
  const logPeerStates = (reason: string) => {
    stateSeq += 1;
    logWhep(
      `state #${stateSeq} ${reason} connectionState=${pc.connectionState} iceConnectionState=${pc.iceConnectionState} iceGatheringState=${pc.iceGatheringState} signalingState=${pc.signalingState}`,
    );
  };

  pc.ontrack = (event) => {
    stream.addTrack(event.track);
    logWhep(`Remote track: ${event.track.kind}`);
    logPeerStates(`ontrack-${event.track.kind}`);
    void input.video.play().catch(() => undefined);
  };
  pc.oniceconnectionstatechange = () => logPeerStates("iceconnectionstatechange");
  pc.onconnectionstatechange = () => logPeerStates("connectionstatechange");
  pc.onicegatheringstatechange = () => logPeerStates("icegatheringstatechange");
  pc.onsignalingstatechange = () => logPeerStates("signalingstatechange");
  logPeerStates("created");

  let sessionUrl: string | null = null;
  try {
    const result = await establishWhepPlayback({
      pc,
      whepUrl: input.whepUrl,
      signal: input.signal,
      logStates: logPeerStates,
    });
    sessionUrl = result.sessionUrl;
  } catch (error) {
    logWhep("peer close: establish-failed");
    pc.close();
    throw error;
  }
  void input.video.play().catch(() => undefined);

  const statTimers = [1000, 3000, 5000, 10000].map((ms) =>
    globalThis.setTimeout(() => {
      logPeerStates(`timer-${ms / 1000}s`);
      void pc.getStats().then((report) => {
        logTransportSnapshot(ms / 1000, summarizeRtcTransport(report));
      });
    }, ms),
  );

  return () => {
    for (const timer of statTimers) {
      globalThis.clearTimeout(timer);
    }
    if (sessionUrl) {
      void fetch(new URL(sessionUrl, input.whepUrl).toString(), { method: "DELETE" }).catch(() => undefined);
    }
    logWhep("peer close: cleanup");
    pc.close();
    input.video.srcObject = null;
  };
}
