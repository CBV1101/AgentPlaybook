"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/page";
import { LiveWhepVideo } from "@/components/live-whep-video";
import type { LiveStreamSummary } from "@/lib/live";
import {
  LIVE_DISCONNECT_GRACE_MS,
  BROADCAST_RTC_CONFIGURATION,
  canCallLiveStart,
  deleteWhipSession,
  establishWhipBroadcast,
  liveConnectionUserMessage,
  logLiveBroadcast,
  shouldFailBroadcastForConnectionState,
} from "@/lib/live/whip-connection";
import { LIVE_STREAM_PUBLISHING_RULES } from "@/lib/moderation";
import {
  LIVE_STUDIO_ON_AIR_BUTTON_CLASS,
  LIVE_STUDIO_ON_AIR_MESSAGE,
  liveStudioStartControl,
} from "@/lib/live/studio-controls";
import {
  liveStudioAllowsNewWhipConnection,
  liveStudioShouldRequestCamera,
  liveStudioShowsCameraRetry,
  liveStudioVideoSurface,
} from "@/lib/live/studio-surface";

type LiveStudioProps = {
  stream: LiveStreamSummary;
};

type Session = {
  whipUrl: string;
  protocol: "webrtc" | "mock";
};

export function LiveStudio({ stream }: LiveStudioProps) {
  const router = useRouter();
  const previewRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const sessionUrlRef = useRef<string | null>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const disconnectTimerRef = useRef<number | null>(null);
  const disconnectedSinceRef = useRef<number | null>(null);
  const [permissionError, setPermissionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ownsLocalBroadcaster, setOwnsLocalBroadcaster] = useState(false);
  const [live, setLive] = useState(stream.status === "live");
  const [message, setMessage] = useState(stream.status === "live" ? LIVE_STUDIO_ON_AIR_MESSAGE : "");
  const whepUrl = stream.playbackKind === "whep" ? stream.playbackUrl : null;
  const videoSurface = liveStudioVideoSurface({
    serverStatus: stream.status,
    ownsLocalBroadcaster,
    whepUrl,
  });
  const shouldRequestCamera = liveStudioShouldRequestCamera({
    serverStatus: stream.status,
    ownsLocalBroadcaster,
  });
  const showCameraRetry = liveStudioShowsCameraRetry(permissionError, shouldRequestCamera);
  const startControl = liveStudioStartControl({
    live,
    busy,
    message,
    streamStatus: stream.status,
  });

  useEffect(() => {
    if (stream.status === "live") {
      setLive(true);
      setMessage(LIVE_STUDIO_ON_AIR_MESSAGE);
    }
  }, [stream.status]);

  useEffect(() => {
    if (!shouldRequestCamera) {
      return;
    }
    void enablePreview();
    // New studio only: do not request camera on a resumed live tab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRequestCamera]);

  useEffect(() => {
    return () => {
      logLiveBroadcast("Studio unmount");
      if (disconnectTimerRef.current) {
        window.clearTimeout(disconnectTimerRef.current);
      }
      mediaRef.current?.getTracks().forEach((track) => track.stop());
      peerRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!live || !ownsLocalBroadcaster) {
      return;
    }
    const timer = window.setInterval(() => {
      void fetch("/api/live/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamId: stream.id }),
      });
    }, 20000);
    return () => window.clearInterval(timer);
  }, [live, ownsLocalBroadcaster, stream.id]);

  async function markBroadcastFailed(userMessage: string) {
    if (disconnectTimerRef.current) {
      window.clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }
    await deleteWhipSession(sessionUrlRef.current);
    sessionUrlRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    await fetch("/api/live/fail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ streamId: stream.id }),
    });
    setLive(false);
    setMessage(userMessage);
  }

  function watchPeerHealth(pc: RTCPeerConnection) {
    pc.oniceconnectionstatechange = () => {
      logLiveBroadcast(`ICE connection: ${pc.iceConnectionState}`);
    };
    pc.onconnectionstatechange = () => {
      logLiveBroadcast(`Peer connection: ${pc.connectionState}`);
      if (pc.connectionState === "connected") {
        disconnectedSinceRef.current = null;
        if (disconnectTimerRef.current) {
          window.clearTimeout(disconnectTimerRef.current);
          disconnectTimerRef.current = null;
        }
        return;
      }
      if (shouldFailBroadcastForConnectionState(pc.connectionState)) {
        void markBroadcastFailed("The live connection dropped. This report is no longer marked live.");
        return;
      }
      if (pc.connectionState === "disconnected") {
        disconnectedSinceRef.current = Date.now();
        if (disconnectTimerRef.current) {
          window.clearTimeout(disconnectTimerRef.current);
        }
        disconnectTimerRef.current = window.setTimeout(() => {
          const elapsed = disconnectedSinceRef.current ? Date.now() - disconnectedSinceRef.current : LIVE_DISCONNECT_GRACE_MS;
          if (shouldFailBroadcastForConnectionState(pc.connectionState, elapsed)) {
            void markBroadcastFailed("The live connection dropped. This report is no longer marked live.");
          }
        }, LIVE_DISCONNECT_GRACE_MS);
      }
    };
  }

  async function enablePreview() {
    setPermissionError("");
    try {
      let videoStream: MediaStream;
      try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch (error) {
        const name = error instanceof DOMException ? error.name : "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setPermissionError("Camera permission was denied. Enable the camera to go live.");
          return;
        }
        if (name === "NotFoundError") {
          setPermissionError("No camera was found on this device.");
          return;
        }
        throw error;
      }

      let audioStream: MediaStream;
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      } catch (error) {
        videoStream.getTracks().forEach((track) => track.stop());
        const name = error instanceof DOMException ? error.name : "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setPermissionError("Microphone permission was denied. Enable the microphone to go live.");
          return;
        }
        if (name === "NotFoundError") {
          setPermissionError("No microphone was found on this device.");
          return;
        }
        throw error;
      }

      const media = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioStream.getAudioTracks(),
      ]);
      mediaRef.current = media;
      if (previewRef.current) {
        previewRef.current.srcObject = media;
      }
    } catch {
      setPermissionError("Could not access camera and microphone.");
    }
  }

  async function startBroadcast() {
    if (!liveStudioAllowsNewWhipConnection({ serverStatus: stream.status, ownsLocalBroadcaster })) {
      return;
    }
    if (!mediaRef.current) {
      await enablePreview();
    }
    if (!mediaRef.current) {
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const sessionResponse = await fetch("/api/live/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamId: stream.id }),
      });
      const session = (await sessionResponse.json()) as Session & { error?: string };
      if (!sessionResponse.ok) {
        throw new Error(session.error || "Could not create a broadcast session.");
      }

      if (session.protocol === "webrtc") {
        if (!session.whipUrl || session.whipUrl.startsWith("mock:")) {
          throw new Error("live-connection-failed");
        }
        const pc = new RTCPeerConnection(BROADCAST_RTC_CONFIGURATION);
        peerRef.current = pc;
        mediaRef.current.getTracks().forEach((track) => {
          pc.addTransceiver(track, { direction: "sendonly" });
        });
        const established = await establishWhipBroadcast({
          pc,
          whipUrl: session.whipUrl,
        });
        sessionUrlRef.current = established.sessionUrl;
        if (!canCallLiveStart({ protocol: "webrtc", whipHttpOk: true, connectionState: pc.connectionState })) {
          throw new Error("live-connection-failed");
        }
        watchPeerHealth(pc);
      } else if (session.protocol !== "mock") {
        throw new Error("live-connection-failed");
      }

      const start = await fetch("/api/live/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamId: stream.id }),
      });
      if (!start.ok) {
        const payload = (await start.json()) as { error?: string };
        throw new Error(payload.error || "Could not go live.");
      }
      setOwnsLocalBroadcaster(true);
      setLive(true);
      setMessage(LIVE_STUDIO_ON_AIR_MESSAGE);
    } catch (error) {
      await markBroadcastFailed(liveConnectionUserMessage(error) || "Could not start the broadcast.");
    } finally {
      setBusy(false);
    }
  }

  async function endBroadcast() {
    setBusy(true);
    try {
      await deleteWhipSession(sessionUrlRef.current);
      sessionUrlRef.current = null;
      peerRef.current?.close();
      peerRef.current = null;
      mediaRef.current?.getTracks().forEach((track) => track.stop());
      const response = await fetch("/api/live/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamId: stream.id }),
      });
      const payload = (await response.json()) as { reportId?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Could not end the broadcast.");
      }
      router.push(`/live/${stream.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not end the broadcast.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div
        className="aspect-video w-full overflow-hidden rounded-lg border border-line bg-black"
        data-studio-surface={videoSurface}
      >
        {videoSurface === "whep-playback" && whepUrl ? (
          <LiveWhepVideo playbackUrl={whepUrl} className="h-full w-full" />
        ) : videoSurface === "whep-playback" ? (
          <div className="flex h-full items-center justify-center px-4">
            <p className="text-center text-sm text-surface/80">This live broadcast is on air. Playback is unavailable in this tab.</p>
          </div>
        ) : (
          <video
            ref={previewRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full"
            data-studio-local-preview="true"
          />
        )}
      </div>
      {permissionError ? <ErrorState>{permissionError}</ErrorState> : null}
      {startControl.statusMessage ? <p className="fh-meta">{startControl.statusMessage}</p> : null}
      <div className="flex flex-wrap gap-3">
        {showCameraRetry ? (
          <Button type="button" variant="secondary" onClick={() => void enablePreview()}>
            Retry camera
          </Button>
        ) : null}
        {startControl.appearance === "on-air" ? (
          <button
            type="button"
            disabled
            aria-disabled="true"
            aria-label="Stream is live"
            data-studio-start="on-air"
            className={LIVE_STUDIO_ON_AIR_BUTTON_CLASS}
          >
            Stream is live
          </button>
        ) : (
          <Button
            type="button"
            variant="live"
            disabled={startControl.disabled}
            aria-disabled={startControl.disabled}
            aria-label={startControl.label}
            data-studio-start={startControl.appearance}
            onClick={() => void startBroadcast()}
            className="min-w-[10.5rem]"
          >
            {startControl.label}
          </Button>
        )}
        <Button
          type="button"
          variant={live ? "live" : "secondary"}
          disabled={busy || (!live && stream.status !== "live")}
          onClick={() => void endBroadcast()}
          className="min-w-[10.5rem]"
        >
          End broadcast
        </Button>
      </div>
      <div className="fh-alert bg-warn-soft text-ink">
        <p className="font-medium">Live reporting rules</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {LIVE_STREAM_PUBLISHING_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>
      <p className="fh-meta">
        Firsthand uses Cloudflare Stream Live (WHIP) in the browser. Camera and microphone permission
        are required. This is a firsthand live report, not a verified finding.
      </p>
    </div>
  );
}
