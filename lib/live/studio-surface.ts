export type LiveStudioVideoSurface = "local-preview" | "whep-playback";

export function liveStudioOwnsLocalBroadcaster(input: {
  whipSessionUrl?: string | null;
  peerConnection?: { connectionState?: string } | null;
  markedOwned?: boolean;
}) {
  if (input.markedOwned) {
    return true;
  }
  if (input.whipSessionUrl) {
    return true;
  }
  return Boolean(input.peerConnection);
}

/**
 * Server `live` is occupancy/on-air. It is not proof this browser tab owns WHIP.
 */
export function liveStudioVideoSurface(input: {
  serverStatus: string;
  ownsLocalBroadcaster: boolean;
  whepUrl?: string | null;
}): LiveStudioVideoSurface {
  if (input.ownsLocalBroadcaster) {
    return "local-preview";
  }
  if (input.serverStatus === "live") {
    return "whep-playback";
  }
  return "local-preview";
}

export function liveStudioShouldRequestCamera(input: {
  serverStatus: string;
  ownsLocalBroadcaster: boolean;
}) {
  if (input.ownsLocalBroadcaster) {
    return false;
  }
  return input.serverStatus !== "live";
}

export function liveStudioAllowsNewWhipConnection(input: {
  serverStatus: string;
  ownsLocalBroadcaster: boolean;
}) {
  if (input.ownsLocalBroadcaster) {
    return false;
  }
  return input.serverStatus !== "live";
}

export function liveStudioShowsCameraRetry(permissionError: string, shouldRequestCamera: boolean) {
  return Boolean(permissionError.trim()) && shouldRequestCamera;
}
