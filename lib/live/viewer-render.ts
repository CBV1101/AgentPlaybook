import type { LiveStreamSummary } from "@/lib/live";

export type LiveViewerSurface = "home" | "location" | "profile" | "full";
export type LiveViewerRenderer = "whep" | "iframe" | "file" | "fallback";

export function liveViewerWhepAvailable(stream: LiveStreamSummary) {
  return stream.playbackKind === "whep" && Boolean(stream.playbackUrl);
}

export function liveViewerIframeAvailable(stream: LiveStreamSummary) {
  return stream.playbackKind === "iframe" && Boolean(stream.playbackUrl);
}

export function liveViewerSelectedRenderer(stream: LiveStreamSummary): LiveViewerRenderer {
  if (stream.status === "live" && stream.playbackKind === "iframe") {
    return "fallback";
  }
  if (liveViewerWhepAvailable(stream)) {
    return "whep";
  }
  if (stream.status === "live" && stream.playbackKind === "whep") {
    return "fallback";
  }
  if (stream.playbackKind === "iframe" && stream.playbackUrl) {
    return "iframe";
  }
  if (stream.playbackKind === "file" && stream.playbackUrl) {
    return "file";
  }
  return "fallback";
}

export function logFirsthandViewer(input: {
  surface: LiveViewerSurface;
  stream: LiveStreamSummary;
  selected: LiveViewerRenderer;
  whepMounted: boolean;
}) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }
  const source = input.stream.id.startsWith("dev-showcase-") ? "showcase" : "real";
  console.info(`[Firsthand Viewer] source: ${source}`);
  console.info(`[Firsthand Viewer] title: ${input.stream.title}`);
  console.info(`[Firsthand Viewer] surface: ${input.surface}`);
  console.info(`[Firsthand Viewer] stream status: ${input.stream.status}`);
  console.info(`[Firsthand Viewer] playback kind: ${input.stream.playbackKind}`);
  console.info(`[Firsthand Viewer] WHEP available: ${liveViewerWhepAvailable(input.stream) ? "yes" : "no"}`);
  console.info(`[Firsthand Viewer] iframe available: ${liveViewerIframeAvailable(input.stream) ? "yes" : "no"}`);
  console.info(`[Firsthand Viewer] selected renderer: ${input.selected}`);
  if (input.whepMounted) {
    console.info("[Firsthand Viewer] WHEP component mounted");
  }
}
