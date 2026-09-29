export const LIVE_ICE_GATHER_TIMEOUT_MS = 10_000;
export const LIVE_ICE_GATHER_TIMEOUT_CODE = "live-ice-gather-timeout";
export const LIVE_PEER_CONNECT_TIMEOUT_MS = 18_000;
export const LIVE_DISCONNECT_GRACE_MS = 8_000;
export const LIVE_WHIP_BODY_TIMEOUT_MS = 8_000;

/** STUN only. No TURN credentials. Used so Safari can gather server-reflexive candidates. */
export const BROADCAST_RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
};

export const LIVE_CONNECTION_FAILED_MESSAGE =
  "Could not establish the live connection. Please try again.";

type IceGatheringPeer = {
  iceGatheringState: RTCIceGatheringState;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
};

type ConnectingPeer = {
  connectionState: RTCPeerConnectionState;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
};

export function logLiveBroadcast(message: string) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }
  console.info(`[Firsthand Live] ${message}`);
}

export function canCallLiveStart(input: {
  protocol: "webrtc" | "mock";
  whipHttpOk?: boolean;
  connectionState?: RTCPeerConnectionState | string;
}) {
  if (input.protocol === "mock") {
    return true;
  }
  return input.connectionState === "connected";
}

export function whipHttpSuccessMarksLive() {
  return false;
}

export function shouldFailBroadcastForConnectionState(
  state: RTCPeerConnectionState | string,
  disconnectedForMs = 0,
) {
  if (state === "failed" || state === "closed") {
    return true;
  }
  if (state === "disconnected" && disconnectedForMs >= LIVE_DISCONNECT_GRACE_MS) {
    return true;
  }
  return false;
}

function classifyWhipContentType(value: string | null) {
  if (!value) {
    return "missing";
  }
  return value.toLowerCase().includes("application/sdp") ? "application/sdp" : "other";
}

async function readWhipAnswerText(response: Response, timeoutMs: number) {
  logLiveBroadcast("WHIP body read: started");
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const text = await Promise.race([
      response.text(),
      new Promise<string>((_, reject) => {
        timer = globalThis.setTimeout(() => {
          const error = new Error("live-connection-timeout");
          error.name = "TimeoutError";
          reject(error);
        }, timeoutMs);
      }),
    ]);
    logLiveBroadcast("WHIP body read: completed");
    logLiveBroadcast(`WHIP answer bytes: ${new TextEncoder().encode(text).length}`);
    return text;
  } catch (error) {
    logFailure("read-answer", error);
    throw error;
  } finally {
    if (timer) {
      globalThis.clearTimeout(timer);
    }
  }
}

function countSdpCandidateLines(sdp: string | null | undefined) {
  if (!sdp) {
    return 0;
  }
  let count = 0;
  for (const line of sdp.split(/\r?\n/)) {
    if (line.startsWith("a=candidate:")) {
      count += 1;
    }
  }
  return count;
}

function errorName(error: unknown) {
  if (error instanceof Error && error.name) {
    return error.name;
  }
  return "Error";
}

function logFailure(stage: string, error?: unknown) {
  logLiveBroadcast(`Failure stage: ${stage}`);
  if (error) {
    logLiveBroadcast(`Error: ${errorName(error)}`);
  }
}

function attachWhipRtcDiagnostics(pc: RTCPeerConnection) {
  let localCandidates = 0;
  const onIceCandidate: EventListener = (event) => {
    const candidate = (event as RTCPeerConnectionIceEvent).candidate;
    if (candidate) {
      localCandidates += 1;
      logLiveBroadcast("ICE candidate event: candidate");
    } else {
      logLiveBroadcast("ICE candidate event: complete");
    }
  };
  pc.addEventListener("icecandidate", onIceCandidate);
  pc.addEventListener("icegatheringstatechange", () => {
    logLiveBroadcast(`ICE gathering: ${pc.iceGatheringState}`);
    if (pc.iceGatheringState === "complete") {
      logLiveBroadcast("ICE gathering complete");
    }
  });
  pc.addEventListener("iceconnectionstatechange", () => {
    logLiveBroadcast(`ICE connection: ${pc.iceConnectionState}`);
  });
  pc.addEventListener("connectionstatechange", () => {
    logLiveBroadcast(`Peer connection: ${pc.connectionState}`);
  });
  pc.addEventListener("signalingstatechange", () => {
    logLiveBroadcast(`Signaling state: ${pc.signalingState}`);
  });
  logLiveBroadcast(`ICE gathering: ${pc.iceGatheringState}`);
  logLiveBroadcast(`ICE connection: ${pc.iceConnectionState}`);
  logLiveBroadcast(`Peer connection: ${pc.connectionState}`);
  logLiveBroadcast(`Signaling state: ${pc.signalingState}`);
  return {
    localCandidateCount: () => localCandidates,
    logCandidateCounts: () => {
      logLiveBroadcast(`Local candidates: ${localCandidates}`);
      logLiveBroadcast(`Remote candidates: ${countSdpCandidateLines(pc.remoteDescription?.sdp)}`);
    },
  };
}

function toSessionDescription(init: RTCSessionDescriptionInit): RTCSessionDescriptionInit {
  if (typeof RTCSessionDescription === "function") {
    return new RTCSessionDescription(init);
  }
  return init;
}

function logIceWait(message: string) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }
  console.info(`[Firsthand ICE WAIT] ${message}`);
}

function iceCandidateEventType(event: Event) {
  const candidate = (event as RTCPeerConnectionIceEvent).candidate;
  if (!candidate) {
    return "end";
  }
  return candidate.type || "unknown";
}

/** WHIP: timeout resolves so establishment can still POST. Does not take an AbortSignal. */
export function waitForWhipIceGathering(pc: IceGatheringPeer, timeoutMs = LIVE_ICE_GATHER_TIMEOUT_MS) {
  return new Promise<void>((resolve) => {
    if (pc.iceGatheringState === "complete") {
      resolve();
      return;
    }
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      pc.removeEventListener("icegatheringstatechange", onChange);
      globalThis.clearTimeout(timer);
      resolve();
    };
    const onChange: EventListener = () => {
      if (pc.iceGatheringState === "complete") {
        finish();
      }
    };
    pc.addEventListener("icegatheringstatechange", onChange);
    const timer = globalThis.setTimeout(finish, timeoutMs);
  });
}

/** WHEP: timeout rejects; abort rejects. Do not use for WHIP. */
export function waitForWhepIceGathering(
  pc: IceGatheringPeer,
  timeoutMs = LIVE_ICE_GATHER_TIMEOUT_MS,
  signal?: AbortSignal,
) {
  return new Promise<void>((resolve, reject) => {
    logIceWait(`entered state=${pc.iceGatheringState}`);
    let settled = false;
    let previous = pc.iceGatheringState;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      pc.removeEventListener("icegatheringstatechange", onState);
      pc.removeEventListener("icecandidate", onCandidate);
      signal?.removeEventListener("abort", onAbort);
      if (timer !== undefined) {
        globalThis.clearTimeout(timer);
      }
    };

    const succeed = (reason: string) => {
      if (settled) {
        return;
      }
      if (pc.iceGatheringState !== "complete") {
        return;
      }
      settled = true;
      cleanup();
      logIceWait(`resolved reason=${reason}`);
      logIceWait(`exit state=${pc.iceGatheringState}`);
      resolve();
    };

    const fail = (reason: string, error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      logIceWait(`resolved reason=${reason}`);
      logIceWait(`exit state=${pc.iceGatheringState}`);
      reject(error);
    };

    const onState: EventListener = () => {
      logIceWait(`ICE gathering state changed: ${previous} → ${pc.iceGatheringState}`);
      previous = pc.iceGatheringState;
      succeed("state-complete");
    };

    const onCandidate: EventListener = (event) => {
      logIceWait(`candidate event type=${iceCandidateEventType(event)}`);
      succeed("state-complete");
    };

    const onAbort = () => fail("abort", Object.assign(new Error("Aborted"), { name: "AbortError" }));

    pc.addEventListener("icegatheringstatechange", onState);
    pc.addEventListener("icecandidate", onCandidate);
    signal?.addEventListener("abort", onAbort);

    timer = globalThis.setTimeout(() => {
      fail("timeout", new Error(LIVE_ICE_GATHER_TIMEOUT_CODE));
    }, timeoutMs);

    if (signal?.aborted) {
      onAbort();
      return;
    }

    queueMicrotask(() => {
      if (pc.iceGatheringState === "complete") {
        succeed("already-complete");
      }
    });
  });
}

export function waitForIceGatheringComplete(
  pc: IceGatheringPeer,
  timeoutMs = LIVE_ICE_GATHER_TIMEOUT_MS,
  signal?: AbortSignal,
) {
  return waitForWhepIceGathering(pc, timeoutMs, signal);
}

export function waitForPeerConnected(pc: ConnectingPeer, timeoutMs = LIVE_PEER_CONNECT_TIMEOUT_MS) {
  return new Promise<void>((resolve, reject) => {
    if (pc.connectionState === "connected") {
      logLiveBroadcast("Connection wait: connected");
      resolve();
      return;
    }
    let settled = false;
    const cleanup = () => {
      pc.removeEventListener("connectionstatechange", onChange);
      globalThis.clearTimeout(timer);
    };
    const onChange: EventListener = () => {
      if (pc.connectionState === "connected") {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        logLiveBroadcast("Connection wait: connected");
        resolve();
        return;
      }
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        logLiveBroadcast("Connection wait: failed");
        logFailure("wait-connected");
        reject(new Error("live-connection-failed"));
      }
    };
    pc.addEventListener("connectionstatechange", onChange);
    const timer = globalThis.setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      logLiveBroadcast("Connection wait: timeout");
      logFailure("wait-connected");
      const timeout = new Error("live-connection-timeout");
      timeout.name = "TimeoutError";
      reject(timeout);
    }, timeoutMs);
  });
}

export async function deleteWhipSession(sessionUrl: string | null | undefined, fetchFn: typeof fetch = fetch) {
  if (!sessionUrl) {
    return;
  }
  await fetchFn(sessionUrl, { method: "DELETE" }).catch(() => undefined);
}

export async function establishWhipBroadcast(input: {
  pc: RTCPeerConnection;
  whipUrl: string;
  fetchFn?: typeof fetch;
  iceGatherTimeoutMs?: number;
  connectTimeoutMs?: number;
  bodyTimeoutMs?: number;
}): Promise<{ sessionUrl: string | null; whipStatus: number }> {
  const fetchFn = input.fetchFn ?? fetch;
  const diagnostics = attachWhipRtcDiagnostics(input.pc);
  let stage = "attach-listeners";

  try {
    stage = "create-offer";
    const offer = await input.pc.createOffer();
    stage = "set-local-description";
    await input.pc.setLocalDescription(offer);
    stage = "ice-gather";
    await waitForWhipIceGathering(input.pc, input.iceGatherTimeoutMs ?? LIVE_ICE_GATHER_TIMEOUT_MS);
    logLiveBroadcast(`Local candidates before WHIP: ${diagnostics.localCandidateCount()}`);

    const sdp = input.pc.localDescription?.sdp;
    if (!sdp) {
      logFailure("local-sdp");
      throw new Error("live-connection-failed");
    }

    stage = "whip-post";
    const whip = await fetchFn(input.whipUrl, {
      method: "POST",
      headers: { "Content-Type": "application/sdp" },
      body: sdp,
    });
    logLiveBroadcast("WHIP headers received");
    logLiveBroadcast(`WHIP content-type: ${classifyWhipContentType(whip.headers.get("Content-Type"))}`);
    logLiveBroadcast(`WHIP content-length: ${whip.headers.has("Content-Length") ? "present" : "missing"}`);
    logLiveBroadcast(`WHIP signaling: ${whip.status}`);
    if (!whip.ok) {
      logFailure("whip-post");
      throw new Error("live-connection-failed");
    }

    stage = "read-answer";
    const answer = await readWhipAnswerText(whip, input.bodyTimeoutMs ?? LIVE_WHIP_BODY_TIMEOUT_MS);
    if (!answer.trim()) {
      logFailure("empty-answer");
      throw new Error("live-connection-failed");
    }
    logLiveBroadcast("WHIP answer received");

    stage = "set-remote-description";
    logLiveBroadcast("Remote description: starting");
    await input.pc.setRemoteDescription(toSessionDescription({ type: "answer", sdp: answer }));
    logLiveBroadcast("Remote description: set");

    const location = whip.headers.get("Location");
    let sessionUrl: string | null = null;
    if (location) {
      sessionUrl = new URL(location, input.whipUrl).toString();
    }
    logLiveBroadcast(`WHIP session location: ${sessionUrl ? "present" : "missing"}`);
    logLiveBroadcast(`Local candidates after WHIP: ${diagnostics.localCandidateCount()}`);
    diagnostics.logCandidateCounts();

    try {
      stage = "wait-connected";
      await waitForPeerConnected(input.pc, input.connectTimeoutMs ?? LIVE_PEER_CONNECT_TIMEOUT_MS);
      return { sessionUrl, whipStatus: whip.status };
    } catch (error) {
      await deleteWhipSession(sessionUrl, fetchFn);
      throw error;
    }
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "live-connection-timeout" || error.message === "live-connection-failed")
    ) {
      throw error;
    }
    logFailure(stage, error);
    throw error instanceof Error ? error : new Error("live-connection-failed");
  }
}

export function liveConnectionUserMessage(error: unknown) {
  if (error instanceof Error && error.name === "AbortError") {
    return LIVE_CONNECTION_FAILED_MESSAGE;
  }
  const message = error instanceof Error ? error.message : "";
  if (
    message === "live-connection-timeout" ||
    message === "live-connection-failed" ||
    message === LIVE_ICE_GATHER_TIMEOUT_CODE
  ) {
    return LIVE_CONNECTION_FAILED_MESSAGE;
  }
  return message;
}
