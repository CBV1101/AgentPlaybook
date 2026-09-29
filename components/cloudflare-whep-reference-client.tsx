"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState, Notice } from "@/components/ui/page";
import { summarizeRtcTransport, summarizeSdp } from "@/lib/live/whep-stats";

function log(message: string) {
  console.info(`[Firsthand CF WHEP TEST] ${message}`);
}

async function runOfficialCloudflareWhep(video: HTMLVideoElement, whepUrl: string) {
  const pc = new RTCPeerConnection();
  pc.addTransceiver("video", { direction: "recvonly" });
  pc.addTransceiver("audio", { direction: "recvonly" });

  const stream = new MediaStream();
  video.srcObject = stream;
  pc.ontrack = (event) => {
    stream.addTrack(event.track);
    log(`ontrack ${event.track.kind}: yes`);
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const offerSummary = summarizeSdp(offer.sdp);
  log(`offer candidateCount: ${offerSummary.iceCandidateCount}`);
  log(`iceGatheringState at POST: ${pc.iceGatheringState}`);

  const response = await fetch(whepUrl, {
    method: "POST",
    headers: { "Content-Type": "application/sdp" },
    body: offer.sdp,
  });
  log(`HTTP status: ${response.status}`);
  if (!response.ok) {
    throw new Error(`WHEP request failed: ${response.status}`);
  }

  const answer = await response.text();
  log(`answer received: ${answer.trim() ? "yes" : "no"}`);
  log(`answer candidateCount: ${summarizeSdp(answer).iceCandidateCount}`);
  await pc.setRemoteDescription({ type: "answer", sdp: answer });

  const playResult = await video.play().then(
    () => "ok",
    (error: unknown) => (error instanceof Error ? error.name : "failed"),
  );
  log(`video.play(): ${playResult}`);

  const logSnapshot = async (label: string) => {
    log(`ontrack video: ${stream.getVideoTracks().length ? "yes" : "no"}`);
    log(`ontrack audio: ${stream.getAudioTracks().length ? "yes" : "no"}`);
    log(`connectionState: ${pc.connectionState}`);
    log(`iceConnectionState: ${pc.iceConnectionState}`);
    const snapshot = summarizeRtcTransport(await pc.getStats());
    log(
      `selected candidate pair: ${snapshot.selectedPairState ?? "none"} nominated=${snapshot.selectedPairNominated == null ? "none" : snapshot.selectedPairNominated ? "yes" : "no"}`,
    );
    log(`DTLS: ${snapshot.dtlsState ?? "none"}`);
    log(`inbound video bytes: ${snapshot.inboundVideo.bytesReceived ?? "none"}`);
    log(`inbound video packets: ${snapshot.inboundVideo.packetsReceived ?? "none"}`);
    log(`framesReceived: ${snapshot.inboundVideo.framesReceived ?? "none"}`);
    log(`framesDecoded: ${snapshot.inboundVideo.framesDecoded ?? "none"}`);
    log(`videoWidth/videoHeight: ${video.videoWidth}/${video.videoHeight}`);
    log(`snapshot ${label}`);
  };

  await logSnapshot("immediate");
  const timers = [1000, 3000, 5000, 10000].map((ms) =>
    globalThis.setTimeout(() => {
      void logSnapshot(`${ms / 1000}s`);
    }, ms),
  );

  const location = response.headers.get("Location");
  const sessionUrl = location ? new URL(location, whepUrl).toString() : null;
  return () => {
    for (const timer of timers) {
      globalThis.clearTimeout(timer);
    }
    if (sessionUrl) {
      void fetch(sessionUrl, { method: "DELETE" }).catch(() => undefined);
    }
    pc.close();
    video.srcObject = null;
  };
}

export function CloudflareWhepReferenceClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function start() {
    cleanupRef.current?.();
    cleanupRef.current = null;
    setBusy(true);
    setMessage("");
    try {
      const lookup = await fetch("/api/dev/cloudflare-whep-test");
      const payload = (await lookup.json()) as { whepUrl?: string | null; connected?: boolean; error?: string };
      if (!lookup.ok || !payload.whepUrl) {
        throw new Error("No connected Cloudflare live input with a public WHEP URL.");
      }
      const video = videoRef.current;
      if (!video) {
        throw new Error("Video element is missing.");
      }
      cleanupRef.current = await runOfficialCloudflareWhep(video, payload.whepUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start the reference WHEP client.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <video ref={videoRef} className="aspect-video w-full bg-ink" playsInline controls />
      <div className="mt-4">
        <Button type="button" disabled={busy} onClick={() => void start()}>
          Connect official WHEP
        </Button>
      </div>
      {message ? (
        <div className="mt-4">
          <ErrorState>{message}</ErrorState>
        </div>
      ) : (
        <div className="mt-4">
          <Notice>
            Open the console for offer candidateCount, iceGatheringState at POST, HTTP status, answer, ICE, DTLS, inbound
            RTP, frames, dimensions, and video.play().
          </Notice>
        </div>
      )}
    </div>
  );
}
