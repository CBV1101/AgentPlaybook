import type { LiveStreamSummary } from "@/lib/live";
import { isCloudflareCustomerLiveIframeUrl } from "@/lib/live/customer-player";

export type LivePreviewSurface = "whep" | "iframe" | "file" | "thumbnail" | "placeholder";
export type LivePreviewOverlayVariant = "grid" | "globeThumbnail" | "full";

export function livePreviewSurface(stream: LiveStreamSummary): LivePreviewSurface {
  if (stream.status === "live" && stream.playbackKind === "whep") {
    return stream.playbackUrl ? "whep" : "placeholder";
  }
  if (stream.playbackKind === "iframe" && stream.playbackUrl) {
    return "iframe";
  }
  if (stream.playbackKind === "file" && stream.playbackUrl) {
    return "file";
  }
  if (stream.thumbnailUrl) {
    return "thumbnail";
  }
  return "placeholder";
}

export function livePreviewAllowsAutoplay(stream: LiveStreamSummary, autoplayRequested: boolean) {
  return autoplayRequested && !stream.sensitiveContent;
}

export function livePreviewIframeIsInteractive(stream: LiveStreamSummary) {
  return (
    stream.status === "live" &&
    livePreviewSurface(stream) === "iframe" &&
    isCloudflareCustomerLiveIframeUrl(stream.playbackUrl)
  );
}

export function livePreviewHasNavigationOverlay(
  stream: LiveStreamSummary,
  variant: LivePreviewOverlayVariant,
  options?: { iframeMounted?: boolean; whepMounted?: boolean },
) {
  if (variant === "globeThumbnail") {
    return false;
  }
  if (!stream.reporterUsername?.trim()) {
    return false;
  }
  if (options?.whepMounted && livePreviewSurface(stream) === "whep") {
    return false;
  }
  if (options?.iframeMounted && livePreviewIframeIsInteractive(stream)) {
    return false;
  }
  return true;
}

export function liveCardUsesLivePreview(stream: LiveStreamSummary) {
  return stream.status === "live";
}
