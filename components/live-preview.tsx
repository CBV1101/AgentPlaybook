"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LiveBadge, LocationLabel } from "@/components/ui/badge";
import { SensitiveContentGate } from "@/components/sensitive-content-gate";
import { LiveWhepVideo } from "@/components/live-whep-video";
import { reporterProfileHref, withLivePreviewIframeParams, type LiveStreamSummary } from "@/lib/live";
import { isCloudflareCustomerLiveIframeUrl } from "@/lib/live/customer-player";
import {
  livePreviewAllowsAutoplay,
  livePreviewHasNavigationOverlay,
  livePreviewIframeIsInteractive,
} from "@/lib/live/preview-source";
import { MAX_SIMULTANEOUS_PREVIEWS, releaseLivePreviewSlot, tryClaimLivePreviewSlot } from "@/lib/live/preview-slot";
import {
  liveViewerSelectedRenderer,
  logFirsthandViewer,
  type LiveViewerSurface,
} from "@/lib/live/viewer-render";

const playingIds = new Set<string>();

function claimPreview(id: string) {
  return tryClaimLivePreviewSlot(playingIds, id, MAX_SIMULTANEOUS_PREVIEWS);
}

function releasePreview(id: string) {
  releaseLivePreviewSlot(playingIds, id);
}

export type LivePreviewVariant = "grid" | "globeThumbnail" | "full";

function previewClass(variant: LivePreviewVariant) {
  if (variant === "grid") {
    return "fh-live-preview-grid";
  }
  if (variant === "globeThumbnail") {
    return "fh-live-preview-thumb";
  }
  return "fh-live-preview-full";
}

export function LivePreview({
  stream,
  featured = false,
  autoplay = true,
  chrome = true,
  variant,
  viewerSurface = "home",
}: {
  stream: LiveStreamSummary;
  featured?: boolean;
  autoplay?: boolean;
  chrome?: boolean;
  variant: LivePreviewVariant;
  viewerSurface?: LiveViewerSurface;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reducedMotion = useRef(false);
  const [inView, setInView] = useState(false);
  const [slot, setSlot] = useState(false);
  const href = reporterProfileHref(stream.reporterUsername);
  const selected = liveViewerSelectedRenderer(stream);
  const fileUrl = selected === "file" ? stream.playbackUrl : null;
  const iframeUrl = selected === "iframe" ? stream.playbackUrl : null;
  const whepUrl = selected === "whep" ? stream.playbackUrl : null;
  const allowsAutoplay = livePreviewAllowsAutoplay(stream, autoplay);
  const mayAutoplayFile = allowsAutoplay && Boolean(fileUrl) && inView && slot;
  const mayLoadIframe = Boolean(iframeUrl) && (stream.sensitiveContent || (inView && slot));
  const mayLoadWhep = Boolean(whepUrl) && (stream.sensitiveContent || (inView && slot));
  const iframeSrc = iframeUrl
    ? withLivePreviewIframeParams(iframeUrl, { autoplay: allowsAutoplay && inView && slot, muted: true })
    : null;
  const playerInteractive = livePreviewIframeIsInteractive(stream);
  const showNavigationOverlay = livePreviewHasNavigationOverlay(stream, variant, {
    iframeMounted: Boolean(mayLoadIframe && iframeSrc),
    whepMounted: mayLoadWhep,
  });
  const isGrid = variant === "grid";
  const isThumb = variant === "globeThumbnail";
  const showChrome = isGrid || isThumb ? false : chrome;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.current = media.matches;
    const onChange = () => {
      reducedMotion.current = media.matches;
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(Boolean(entry?.isIntersecting && (entry.intersectionRatio ?? 0) >= 0.35));
      },
      { threshold: [0, 0.35, 0.6, 1], rootMargin: "80px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const wantsWhepSlot = Boolean(whepUrl) && inView;
    const wantsIframeSlot = Boolean(iframeUrl) && inView;
    const wantsFileSlot = allowsAutoplay && Boolean(fileUrl) && inView && !reducedMotion.current;
    if ((wantsWhepSlot || wantsIframeSlot || wantsFileSlot) && claimPreview(stream.id)) {
      setSlot(true);
      return () => {
        releasePreview(stream.id);
        setSlot(false);
      };
    }
    if (process.env.NODE_ENV === "development" && wantsWhepSlot && playingIds.has(stream.id)) {
      console.info("[Firsthand Viewer] duplicate WHEP skipped: same stream already mounted");
    }
    setSlot(false);
    return undefined;
    return undefined;
  }, [allowsAutoplay, fileUrl, iframeUrl, whepUrl, inView, stream.id, stream.sensitiveContent]);

  useEffect(() => {
    logFirsthandViewer({
      surface: viewerSurface,
      stream,
      selected,
      whepMounted: mayLoadWhep,
    });
  }, [mayLoadWhep, selected, stream, viewerSurface]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !mayLoadIframe || !iframeSrc) {
      return;
    }
    console.info("[Firsthand Playback] kind: iframe");
    console.info(`[Firsthand Playback] customer player: ${isCloudflareCustomerLiveIframeUrl(iframeUrl) ? "yes" : "no"}`);
    console.info("[Firsthand Playback] iframe mounted");
    console.info(`[Firsthand Playback] stream status: ${stream.status}`);
  }, [iframeSrc, iframeUrl, mayLoadIframe, stream.status]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    if (mayAutoplayFile && !reducedMotion.current) {
      void video.play().catch(() => undefined);
      return;
    }
    video.pause();
  }, [mayAutoplayFile]);

  return (
    <SensitiveContentGate active={stream.sensitiveContent}>
      <div
        ref={wrapRef}
        className={previewClass(variant)}
        data-live-preview={variant}
      >
        {mayAutoplayFile && fileUrl ? (
          <video
            ref={videoRef}
            src={fileUrl}
            muted
            playsInline
            loop
            preload="none"
            className="pointer-events-none h-full w-full object-cover"
          />
        ) : mayLoadWhep && whepUrl ? (
          <LiveWhepVideo playbackUrl={whepUrl} className="h-full w-full object-cover" />
        ) : mayLoadIframe && iframeSrc ? (
          <iframe
            src={iframeSrc}
            title={stream.title}
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
            className={playerInteractive ? "h-full w-full border-0" : "pointer-events-none h-full w-full border-0"}
            tabIndex={playerInteractive ? 0 : -1}
            data-live-iframe-interactive={playerInteractive ? "true" : "false"}
          />
        ) : stream.thumbnailUrl && selected !== "whep" && !iframeUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={stream.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-black px-4">
            <span className="text-center text-sm text-surface/80">
              {stream.status === "live" && selected === "fallback"
                ? process.env.NODE_ENV === "development"
                  ? "Live playback is unavailable. WHEP was not used with the Cloudflare iframe."
                  : "This live firsthand report cannot be played right now."
                : stream.status === "live"
                  ? "Live firsthand report"
                  : "Firsthand report"}
            </span>
          </div>
        )}
        {showChrome ? (
          <>
            <span className="pointer-events-none absolute left-2 top-2">
              <LiveBadge />
            </span>
            {stream.startedAt && stream.status === "live" ? (
              <ElapsedOverlay startedAt={stream.startedAt} />
            ) : null}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-2 pb-2 pt-8">
              <LocationLabel
                city={stream.location.city}
                country={stream.location.country}
                size="overlay"
                className={featured ? "sm:text-lg" : "text-[0.65rem] tracking-[0.12em] sm:text-xs"}
              />
            </div>
          </>
        ) : isThumb ? null : (
          <>
            {stream.status === "live" ? (
              <span className="pointer-events-none absolute left-2 top-2">
                <LiveBadge />
              </span>
            ) : (
              <span className="pointer-events-none absolute left-2 top-2">
                <span className="inline-flex bg-ink/80 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-surface">
                  Recent
                </span>
              </span>
            )}
            {stream.startedAt && stream.status === "live" ? (
              <ElapsedOverlay startedAt={stream.startedAt} />
            ) : null}
          </>
        )}
        {showNavigationOverlay && href ? (
          <Link href={href} className="absolute inset-0" aria-label={`${stream.reporterName} reporter profile`} />
        ) : null}
      </div>
    </SensitiveContentGate>
  );
}

function ElapsedOverlay({ startedAt }: { startedAt: string }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    function tick() {
      const started = new Date(startedAt).getTime();
      const seconds = Number.isNaN(started) ? 0 : Math.max(0, Math.floor((Date.now() - started) / 1000));
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const rest = seconds % 60;
      const pad = (value: number) => String(value).padStart(2, "0");
      setLabel(hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${minutes}:${pad(rest)}`);
    }
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  if (!label) {
    return null;
  }
  return (
    <span className="pointer-events-none absolute bottom-2 right-2 rounded-sm bg-ink/80 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-surface">
      {label}
    </span>
  );
}
