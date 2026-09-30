"use client";

import { useEffect } from "react";
import { LiveWhepVideo } from "@/components/live-whep-video";
import { Notice } from "@/components/ui/page";
import { isPubliclyLive, type LiveStreamSummary } from "@/lib/live";
import { liveViewerSelectedRenderer, logFirsthandViewer } from "@/lib/live/viewer-render";

type LivePlayerProps = {
  stream: LiveStreamSummary;
  allowAutoplay?: boolean;
};

export function LivePlayer({ stream, allowAutoplay = true }: LivePlayerProps) {
  const selected = liveViewerSelectedRenderer(stream);

  useEffect(() => {
    logFirsthandViewer({
      surface: "full",
      stream,
      selected,
      whepMounted: selected === "whep",
    });
  }, [selected, stream]);

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

  if (selected === "whep" && stream.playbackUrl) {
    return (
      <div className="relative">
        <LiveWhepVideo
          playbackUrl={stream.playbackUrl}
          className="aspect-video w-full rounded-lg border border-line bg-black"
        />
      </div>
    );
  }

  if (selected === "iframe" && stream.playbackUrl) {
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

  if (selected === "file" && stream.playbackUrl) {
    return (
      <video
        src={stream.playbackUrl}
        controls
        playsInline
        autoPlay={allowAutoplay && isPubliclyLive(stream)}
        muted={allowAutoplay && isPubliclyLive(stream)}
        loop={allowAutoplay && isPubliclyLive(stream)}
        className="aspect-video w-full rounded-lg border border-line bg-black"
      />
    );
  }

  if (stream.status === "ended" && !stream.playbackUrl) {
    return (
      <Notice>
        A recording of this live firsthand report is not available.
      </Notice>
    );
  }

  if (isPubliclyLive(stream)) {
    return (
      <Notice>
        {process.env.NODE_ENV === "development"
          ? "Live playback is unavailable. WHEP was selected; the Cloudflare iframe is not used."
          : "This live firsthand report cannot be played right now."}
      </Notice>
    );
  }

  return (
    <p className="rounded-lg border border-line bg-surface p-6 fh-meta">
      The player is not available yet.
    </p>
  );
}
