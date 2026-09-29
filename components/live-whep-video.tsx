"use client";

import { useEffect, useRef, useState } from "react";
import { attachWhepViewer } from "@/lib/live/whep-viewer";

export function LiveWhepVideo({
  playbackUrl,
  className,
}: {
  playbackUrl: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackUrl) {
      return;
    }
    video.setAttribute("webkit-playsinline", "true");
    video.muted = true;
    video.playsInline = true;
    const abort = new AbortController();
    let release: (() => void) | undefined;
    setFailed(false);
    void attachWhepViewer({ video, whepUrl: playbackUrl, signal: abort.signal })
      .then((cleanup) => {
        release = cleanup;
      })
      .catch(() => {
        if (!abort.signal.aborted) {
          setFailed(true);
        }
      });
    return () => {
      abort.abort();
      release?.();
    };
  }, [playbackUrl]);

  return (
    <>
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        className={className}
        data-live-whep="true"
      />
      {failed && process.env.NODE_ENV === "development" ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink/80 px-3 text-center text-sm text-surface">
          WHEP playback failed. The Cloudflare iframe is not used for this live stream.
        </span>
      ) : null}
    </>
  );
}
