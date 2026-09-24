"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/page";
import type { LiveStreamSummary } from "@/lib/live";
import { LIVE_STREAM_PUBLISHING_RULES } from "@/lib/moderation";

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
  const [permissionError, setPermissionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(stream.status === "live");
  const [message, setMessage] = useState("");

  useEffect(() => {
    return () => {
      mediaRef.current?.getTracks().forEach((track) => track.stop());
      peerRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!live) {
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
  }, [live, stream.id]);

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

      if (session.protocol === "webrtc" && session.whipUrl && !session.whipUrl.startsWith("mock:")) {
        const pc = new RTCPeerConnection();
        peerRef.current = pc;
        mediaRef.current.getTracks().forEach((track) => {
          pc.addTransceiver(track, { direction: "sendonly" });
        });
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const whip = await fetch(session.whipUrl, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: offer.sdp,
        });
        if (!whip.ok) {
          throw new Error("Cloudflare rejected the live connection.");
        }
        const answer = await whip.text();
        await pc.setRemoteDescription({ type: "answer", sdp: answer });
        const location = whip.headers.get("Location");
        if (location) {
          sessionUrlRef.current = new URL(location, session.whipUrl).toString();
        }
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
            void fetch("/api/live/fail", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ streamId: stream.id }),
            });
            setLive(false);
            setMessage("The live connection dropped. This report is no longer marked live.");
          }
        };
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
      setLive(true);
      setMessage("You are live. Keep this page open while broadcasting.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start the broadcast.");
      await fetch("/api/live/fail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamId: stream.id }),
      });
    } finally {
      setBusy(false);
    }
  }

  async function endBroadcast() {
    setBusy(true);
    try {
      if (sessionUrlRef.current) {
        await fetch(sessionUrlRef.current, { method: "DELETE" }).catch(() => undefined);
      }
      peerRef.current?.close();
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
      <video
        ref={previewRef}
        autoPlay
        muted
        playsInline
        className="aspect-video w-full rounded-lg border border-line bg-black"
      />
      {permissionError ? <ErrorState>{permissionError}</ErrorState> : null}
      {message ? <p className="fh-meta">{message}</p> : null}
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={() => void enablePreview()}>
          Enable camera
        </Button>
        <Button type="button" variant="live" disabled={busy || live} onClick={() => void startBroadcast()}>
          {busy ? "Working…" : "Start broadcast"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busy || (!live && stream.status !== "live")}
          onClick={() => void endBroadcast()}
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
