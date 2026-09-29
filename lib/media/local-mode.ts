import { getDataSource, isProductionEnv, type DataSource, type DataSourceEnv } from "@/lib/data/mode";

export function canUseLocalMedia(env: DataSourceEnv = process.env) {
  if (isProductionEnv(env)) {
    return false;
  }
  try {
    return getDataSource(env) === "mock";
  } catch {
    return false;
  }
}

export function assertLocalMediaAllowed(env: DataSourceEnv = process.env) {
  if (!canUseLocalMedia(env)) {
    throw new Error("Local media storage is not available.");
  }
}

export function localMediaEndpointDenied(env: DataSourceEnv = process.env) {
  if (canUseLocalMedia(env)) {
    return null;
  }
  return {
    status: 403 as const,
    error: "Local media storage is not available.",
  };
}

export function localMediaFallbackOnStorageFailure() {
  return false;
}

export function chooseRecordedMediaBackend(input: {
  mediaType: "photo" | "video";
  dataSource: DataSource;
  cloudflareStreamConfigured: boolean;
}): { backend: "supabase-storage" | "cloudflare-stream" | "local" } | { error: string } {
  if (input.dataSource === "mock") {
    return { backend: "local" };
  }

  if (input.mediaType === "photo") {
    return { backend: "supabase-storage" };
  }

  if (input.cloudflareStreamConfigured) {
    return { backend: "cloudflare-stream" };
  }

  return { error: "Recorded video upload is unavailable." };
}
