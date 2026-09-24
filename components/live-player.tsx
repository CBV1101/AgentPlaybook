"use client";

import { useEffect, useRef, useState } from "react";
import { ErrorState, Notice } from "@/components/ui/page";
import type { LiveStreamSummary } from "@/lib/live";

type LivePlayerProps = {
  stream: LiveStreamSummary;
  allowAutoplay?: boolean;
};

export function LivePlayer({ stream, allowAutoplay = true }: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (stream.playbackKind !== "whep" || !stream.playbackUrl || !videoRef.current) {
      return;
    }
    const video = videoRef.current;
    const pc = new RTCPeerConnection();
    const media = new MediaStream();
    video.srcObject = media;
    pc.addTransceiver("video", { direction: "recvonly" });
    pc.addTransceiver("audio", { direction: "recvonly" });
    pc.ontrack = (event) => media.addTrack(event.track);

    void (async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const response = await fetch(stream.playbackUrl!, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: offer.sdp,
        });
        if (!response.ok) {
          throw new Error("Could not connect to the live player.");
        }
        const answer = await response.text();
        await pc.setRemoteDescription({ type: "answer", sdp: answer });
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Playback failed.");
      }
    })();

    return () => {
      pc.close();
      video.srcObject = null;
    };
  }, [stream.playbackKind, stream.playbackUrl]);

  if (stream.status === "created") {
    return (
      <p className="rounded-lg border border-dashed border-line bg-surface p-6 fh-meta">
        The reporter is setting up this live firsthand report.
      </p>
    );
  }

  if (stream.status === "failed") {
    return (
      <Notice>
        This broadcast stopped unexpectedly. It is no longer marked live.
      </Notice>
    );
  }

  if (stream.status === "terminated") {
    if (!stream.playbackUrl) {
      return (
        <Notice tone="danger">
          This livestream was removed from public view. The recording was not published as a normal
          firsthand report.
        </Notice>
      );
    }
  }

  if (stream.playbackKind === "iframe" && stream.playbackUrl) {
    return (
      <iframe
        src={stream.playbackUrl}
        title={stream.title}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        className="aspect-video w-full rounded-lg border border-line bg-black"
      />
    );
  }

  if (stream.playbackKind === "file" && stream.playbackUrl) {
    return (
      <video
        src={stream.playbackUrl}
        controls
        playsInline
        autoPlay={allowAutoplay && stream.status === "live"}
        muted={allowAutoplay && stream.status === "live"}
        loop={allowAutoplay && stream.status === "live"}
        className="aspect-video w-full rounded-lg border border-line bg-black"
      />
    );
  }

  if (stream.playbackKind === "whep" && stream.playbackUrl) {
    return (
      <div>
        <video
          ref={videoRef}
          autoPlay={allowAutoplay}
          playsInline
          controls
          className="aspect-video w-full rounded-lg border border-line bg-black"
        />
        {error ? <ErrorState>{error}</ErrorState> : null}
      </div>
    );
  }

  return (
    <p className="rounded-lg border border-line bg-surface p-6 fh-meta">
      The player is not available yet.
    </p>
  );
}
