import type { MediaProvenanceType } from "@/lib/database.types";

export type { MediaProvenanceType };

export const MEDIA_PROVENANCE_TYPES = [
  "creator_declared",
  "platform_capture",
  "c2pa_verified",
  "unknown",
] as const satisfies readonly MediaProvenanceType[];

/** Values the current product is allowed to assign. */
export const ASSIGNABLE_PROVENANCE_TYPES = ["creator_declared", "unknown"] as const;
export type AssignableProvenanceType = (typeof ASSIGNABLE_PROVENANCE_TYPES)[number];

const SHA256_HEX = /^[0-9a-f]{64}$/;

export function isMediaProvenanceType(value: string): value is MediaProvenanceType {
  return (MEDIA_PROVENANCE_TYPES as readonly string[]).includes(value);
}

export function normalizeProvenanceType(value: string | null | undefined): MediaProvenanceType {
  return value && isMediaProvenanceType(value) ? value : "unknown";
}

export function parseOriginalSha256(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const hex = value.trim().toLowerCase();
  return SHA256_HEX.test(hex) ? hex : null;
}

export function uploadProvenanceFields(originalSha256?: string | null) {
  return {
    provenance_type: "creator_declared" as const,
    original_sha256: parseOriginalSha256(originalSha256),
  };
}

export function liveRecordingProvenanceFields() {
  return {
    provenance_type: "unknown" as const,
    original_sha256: null as string | null,
  };
}

export function provenanceHeadline(type: MediaProvenanceType) {
  if (type === "creator_declared") {
    return "Creator says they captured this media.";
  }
  if (type === "platform_capture") {
    return "Recorded through a trusted capture path.";
  }
  if (type === "c2pa_verified") {
    return "This file included signed capture metadata.";
  }
  return "Media origin not established.";
}

export function combinedProvenanceHeadline(types: MediaProvenanceType[]) {
  if (types.length === 0) {
    return "Media origin not established.";
  }
  if (types.every((type) => type === "creator_declared")) {
    return provenanceHeadline("creator_declared");
  }
  if (types.every((type) => type === types[0])) {
    return provenanceHeadline(types[0]);
  }
  return "Media origin varies by file. Open media origin for each asset.";
}

export async function sha256File(file: Blob): Promise<string | null> {
  try {
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}
