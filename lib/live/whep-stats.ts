export type SdpMediaSummary = {
  present: boolean;
  port: string | null;
  direction: string | null;
  codecs: string[];
  inactive: boolean;
};

export type SdpTransportSummary = {
  video: SdpMediaSummary;
  audio: SdpMediaSummary;
  iceCandidateTypes: string[];
  iceCandidateCount: number;
};

const DIRECTION = /\ba=(recvonly|sendonly|sendrecv|inactive)\b/;

function mediaSection(sdp: string, kind: "video" | "audio"): string | null {
  const marker = `m=${kind}`;
  const start = sdp.indexOf(marker);
  if (start < 0) {
    return null;
  }
  const rest = sdp.slice(start);
  const next = rest.search(/\nm=[a-z]/);
  return next < 0 ? rest : rest.slice(0, next);
}

function summarizeMedia(section: string | null): SdpMediaSummary {
  if (!section) {
    return { present: false, port: null, direction: null, codecs: [], inactive: false };
  }
  const line = section.split(/\r?\n/)[0] ?? "";
  const parts = line.trim().split(/\s+/);
  const port = parts[1] ?? null;
  const directions = [...section.matchAll(new RegExp(DIRECTION, "g"))].map((item) => item[1]);
  const direction = directions[directions.length - 1] ?? null;
  const codecs = [...section.matchAll(/^a=rtpmap:\d+\s+([^\s/]+)/gim)].map((item) => item[1].toUpperCase());
  return {
    present: true,
    port,
    direction,
    codecs: [...new Set(codecs)],
    inactive: direction === "inactive" || port === "0",
  };
}

export function summarizeSdp(sdp: string | null | undefined): SdpTransportSummary {
  const text = sdp ?? "";
  const types = [...text.matchAll(/\btyp\s+(host|srflx|prflx|relay)\b/gi)].map((item) => item[1].toLowerCase());
  return {
    video: summarizeMedia(mediaSection(text, "video")),
    audio: summarizeMedia(mediaSection(text, "audio")),
    iceCandidateTypes: [...new Set(types)],
    iceCandidateCount: types.length,
  };
}

function mediaKind(row: Record<string, unknown>) {
  if (typeof row.kind === "string" && row.kind) {
    return row.kind;
  }
  if (typeof row.mediaType === "string" && row.mediaType) {
    return row.mediaType;
  }
  return "";
}

function addressFamily(row: Record<string, unknown>) {
  const value = typeof row.address === "string" ? row.address : typeof row.ip === "string" ? row.ip : "";
  if (!value) {
    return "none";
  }
  return value.includes(":") ? "ipv6" : "ipv4";
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export type InboundRtpSnapshot = {
  exists: boolean;
  bytesReceived: number | null;
  packetsReceived: number | null;
  framesReceived: number | null;
  framesDecoded: number | null;
  framesDropped: number | null;
  frameWidth: number | null;
  frameHeight: number | null;
  codec: string | null;
};

export type TransportStatsSnapshot = {
  statTypes: string[];
  candidatePairCount: number;
  selectedPairState: string | null;
  selectedPairNominated: boolean | null;
  selectedBytesSent: number | null;
  selectedBytesReceived: number | null;
  localCandidateType: string | null;
  localCandidateProtocol: string | null;
  localCandidateFamily: string | null;
  remoteCandidateType: string | null;
  remoteCandidateProtocol: string | null;
  remoteCandidateFamily: string | null;
  dtlsState: string | null;
  iceState: string | null;
  inboundVideo: InboundRtpSnapshot;
  inboundAudio: InboundRtpSnapshot;
};

function inboundFromRow(row: Record<string, unknown> | undefined, codecs: Map<string, string>): InboundRtpSnapshot {
  if (!row) {
    return {
      exists: false,
      bytesReceived: null,
      packetsReceived: null,
      framesReceived: null,
      framesDecoded: null,
      framesDropped: null,
      frameWidth: null,
      frameHeight: null,
      codec: null,
    };
  }
  const codecId = typeof row.codecId === "string" ? row.codecId : "";
  return {
    exists: true,
    bytesReceived: numberOrNull(row.bytesReceived),
    packetsReceived: numberOrNull(row.packetsReceived),
    framesReceived: numberOrNull(row.framesReceived),
    framesDecoded: numberOrNull(row.framesDecoded),
    framesDropped: numberOrNull(row.framesDropped),
    frameWidth: numberOrNull(row.frameWidth),
    frameHeight: numberOrNull(row.frameHeight),
    codec: codecId ? codecs.get(codecId) ?? null : null,
  };
}

export function summarizeRtcTransport(report: RTCStatsReport): TransportStatsSnapshot {
  const byId = new Map<string, Record<string, unknown>>();
  const types = new Set<string>();
  const codecs = new Map<string, string>();
  let inboundVideo: Record<string, unknown> | undefined;
  let inboundAudio: Record<string, unknown> | undefined;
  const pairs: Record<string, unknown>[] = [];
  const transports: Record<string, unknown>[] = [];

  report.forEach((entry) => {
    const row = entry as Record<string, unknown>;
    const type = String(row.type ?? "");
    types.add(type);
    if (typeof row.id === "string") {
      byId.set(row.id, row);
    }
    if (type === "codec" && typeof row.id === "string") {
      codecs.set(row.id, typeof row.mimeType === "string" ? row.mimeType : "");
    }
    if (type === "inbound-rtp") {
      const kind = mediaKind(row);
      if (kind === "video") {
        inboundVideo = row;
      }
      if (kind === "audio") {
        inboundAudio = row;
      }
    }
    if (type === "candidate-pair") {
      pairs.push(row);
    }
    if (type === "transport") {
      transports.push(row);
    }
  });

  const selected =
    pairs.find((row) => row.nominated === true) ??
    pairs.find((row) => row.selected === true) ??
    (transports[0] && typeof transports[0].selectedCandidatePairId === "string"
      ? byId.get(transports[0].selectedCandidatePairId)
      : undefined) ??
    pairs[0];

  const local =
    selected && typeof selected.localCandidateId === "string" ? byId.get(selected.localCandidateId) : undefined;
  const remote =
    selected && typeof selected.remoteCandidateId === "string" ? byId.get(selected.remoteCandidateId) : undefined;
  const transport = transports[0];

  return {
    statTypes: [...types].sort(),
    candidatePairCount: pairs.length,
    selectedPairState: typeof selected?.state === "string" ? selected.state : null,
    selectedPairNominated: typeof selected?.nominated === "boolean" ? selected.nominated : null,
    selectedBytesSent: numberOrNull(selected?.bytesSent),
    selectedBytesReceived: numberOrNull(selected?.bytesReceived),
    localCandidateType: typeof local?.candidateType === "string" ? local.candidateType : null,
    localCandidateProtocol: typeof local?.protocol === "string" ? local.protocol : null,
    localCandidateFamily: local ? addressFamily(local) : null,
    remoteCandidateType: typeof remote?.candidateType === "string" ? remote.candidateType : null,
    remoteCandidateProtocol: typeof remote?.protocol === "string" ? remote.protocol : null,
    remoteCandidateFamily: remote ? addressFamily(remote) : null,
    dtlsState: typeof transport?.dtlsState === "string" ? transport.dtlsState : null,
    iceState: typeof transport?.iceState === "string" ? transport.iceState : null,
    inboundVideo: inboundFromRow(inboundVideo, codecs),
    inboundAudio: inboundFromRow(inboundAudio, codecs),
  };
}

export type InboundVideoStatSnapshot = InboundRtpSnapshot;

export function inboundVideoFromStats(report: RTCStatsReport): InboundVideoStatSnapshot {
  return summarizeRtcTransport(report).inboundVideo;
}

export function mediaStreamForRemoteTrack(existing: MediaStream, streams: readonly MediaStream[], track: MediaStreamTrack) {
  const fromPeer = streams[0];
  if (fromPeer) {
    return fromPeer;
  }
  if (!existing.getTracks().includes(track)) {
    existing.addTrack(track);
  }
  return existing;
}
