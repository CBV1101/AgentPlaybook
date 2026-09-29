export function redactIceErrorUrl(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "unparsed";
  }
}

export function iceCandidateAddressFamily(candidate: RTCIceCandidate | null) {
  if (!candidate) {
    return "unknown";
  }
  const value = candidate.address ?? "";
  if (!value) {
    return "unknown";
  }
  return value.includes(":") ? "ipv6" : "ipv4";
}

export function logRtcPeerConnectionConfig(
  config: RTCConfiguration,
  log: (message: string) => void,
) {
  const servers = config.iceServers ?? [];
  log(`RTCPeerConnection iceServers count: ${servers.length}`);
  for (const server of servers) {
    const urls = Array.isArray(server.urls) ? server.urls : server.urls ? [server.urls] : [];
    for (const url of urls) {
      log(`RTCPeerConnection iceServer: ${String(url).split("?")[0]}`);
    }
    log(`RTCPeerConnection iceServer hasCredential: ${server.username || server.credential ? "yes" : "no"}`);
  }
  const iceTransportPolicy = config.iceTransportPolicy ?? "unset";
  const bundlePolicy = config.bundlePolicy ?? "unset";
  const rtcpMuxPolicy = config.rtcpMuxPolicy ?? "unset";
  const iceCandidatePoolSize = config.iceCandidatePoolSize ?? "unset";
  log(`RTCPeerConnection iceTransportPolicy: ${iceTransportPolicy}`);
  log(`RTCPeerConnection bundlePolicy: ${bundlePolicy}`);
  log(`RTCPeerConnection rtcpMuxPolicy: ${rtcpMuxPolicy}`);
  log(`RTCPeerConnection iceCandidatePoolSize: ${iceCandidatePoolSize}`);
  const urls = servers.flatMap((server) => {
    const value = Array.isArray(server.urls) ? server.urls : server.urls ? [server.urls] : [];
    return value.map((url) => String(url).split("?")[0]);
  });
  log(
    `new RTCPeerConnection({ iceServers: [${urls.map((url) => `{ urls: "${url}" }`).join(", ")}], iceTransportPolicy: ${iceTransportPolicy}, bundlePolicy: ${bundlePolicy}, rtcpMuxPolicy: ${rtcpMuxPolicy}, iceCandidatePoolSize: ${iceCandidatePoolSize} })`,
  );
}

export function attachIceCandidateDiagnostics(
  pc: RTCPeerConnection,
  log: (message: string) => void,
) {
  pc.addEventListener("icecandidate", (event) => {
    const candidate = (event as RTCPeerConnectionIceEvent).candidate;
    log("ICE EVENT fired");
    log(`candidate null=${candidate ? "no" : "yes"}`);
    if (!candidate) {
      log("candidate type=unknown");
      log("candidate protocol=unknown");
      log("candidate address family=unknown");
      return;
    }
    log(`candidate type=${candidate.type || "unknown"}`);
    log(`candidate protocol=${candidate.protocol || "unknown"}`);
    log(`candidate address family=${iceCandidateAddressFamily(candidate)}`);
  });
  pc.addEventListener("icecandidateerror", (event) => {
    const error = event as RTCPeerConnectionIceErrorEvent;
    log(`onicecandidateerror url=${error.url ? redactIceErrorUrl(error.url) : "none"}`);
    log(`onicecandidateerror errorCode=${error.errorCode}`);
    log(`onicecandidateerror errorText=${error.errorText || "none"}`);
  });
}
