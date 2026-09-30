import {
  LIVE_CREATED_TIMEOUT_MS,
  isOccupyingBroadcastSlot,
  type CloudflareIngestObservation,
} from "@/lib/live";

export type OccupyingBroadcast = {
  id: string;
  reporterId: string;
  status: string;
  createdAt: string;
  cloudflareLiveInputId: string | null;
};

export type OccupancyDecision =
  | { action: "create" }
  | { action: "resume"; id: string; reason: "connected-live" | "unknown-live" | "setup-created" }
  | { action: "reconcile"; id: string; reason: "disconnected-live" | "created-timeout" };

export function occupancyDecision(input: {
  occupying: OccupyingBroadcast | null;
  ingest?: CloudflareIngestObservation;
  now?: number;
  createdTimeoutMs?: number;
}): OccupancyDecision {
  const occupying = input.occupying;
  if (!occupying || !isOccupyingBroadcastSlot(occupying.status)) {
    return { action: "create" };
  }
  if (occupying.status === "created") {
    const timeoutMs = input.createdTimeoutMs ?? LIVE_CREATED_TIMEOUT_MS;
    const age = (input.now ?? Date.now()) - new Date(occupying.createdAt).getTime();
    if (Number.isFinite(age) && age > timeoutMs) {
      return { action: "reconcile", id: occupying.id, reason: "created-timeout" };
    }
    return { action: "resume", id: occupying.id, reason: "setup-created" };
  }
  if (input.ingest === "disconnected") {
    return { action: "reconcile", id: occupying.id, reason: "disconnected-live" };
  }
  if (input.ingest === "unknown") {
    return { action: "resume", id: occupying.id, reason: "unknown-live" };
  }
  return { action: "resume", id: occupying.id, reason: "connected-live" };
}

export function isPostgresUniqueViolation(error: { code?: string; message?: string } | null | undefined) {
  if (!error) {
    return false;
  }
  if (error.code === "23505") {
    return true;
  }
  const message = error.message?.toLowerCase() ?? "";
  return message.includes("duplicate key") || message.includes("unique constraint");
}

export type ClaimBroadcastInput = {
  userId: string;
  title: string;
  locationId: string;
  eventId?: string | null;
  requestId?: string | null;
};

export type ClaimBroadcastResult = {
  id: string;
  reused: boolean;
};

export type ClaimBroadcastDeps = {
  findOccupying: (reporterId: string) => Promise<OccupyingBroadcast | null>;
  observeIngest: (row: OccupyingBroadcast) => Promise<CloudflareIngestObservation>;
  reconcileAbandoned: (row: OccupyingBroadcast) => Promise<void>;
  insertCreated: (input: ClaimBroadcastInput) => Promise<
    { ok: true; id: string } | { ok: false; uniqueConflict: true }
  >;
  attachCloudflare: (streamId: string, input: ClaimBroadcastInput) => Promise<void>;
};

export async function claimReporterBroadcast(
  input: ClaimBroadcastInput,
  deps: ClaimBroadcastDeps,
): Promise<ClaimBroadcastResult> {
  const occupying = await deps.findOccupying(input.userId);
  if (occupying) {
    const ingest = occupying.status === "live" ? await deps.observeIngest(occupying) : "unknown";
    const decision = occupancyDecision({ occupying, ingest });
    if (decision.action === "resume") {
      return { id: decision.id, reused: true };
    }
    if (decision.action === "reconcile") {
      await deps.reconcileAbandoned(occupying);
    }
  }

  const inserted = await deps.insertCreated(input);
  if (!inserted.ok) {
    const winner = await deps.findOccupying(input.userId);
    if (winner) {
      return { id: winner.id, reused: true };
    }
    throw new Error("Could not start a live report. Please try again.");
  }

  await deps.attachCloudflare(inserted.id, input);
  return { id: inserted.id, reused: false };
}
