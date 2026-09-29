export const LIVE_UNAVAILABLE_CODE = "live-unavailable";
export const LIVE_UNAVAILABLE_USER_MESSAGE =
  "Live streaming is currently unavailable. Please try again later.";

export function isPlaceholderLiveInputId(id: string | null | undefined) {
  if (!id) {
    return true;
  }
  return (
    id.startsWith("local-") ||
    id.startsWith("mock-") ||
    id.startsWith("dev-showcase-")
  );
}

export function isRealCloudflareLiveInputId(id: string | null | undefined): id is string {
  return Boolean(id) && !isPlaceholderLiveInputId(id);
}

export function allowMockLiveProtocol(dataSource: "mock" | "supabase") {
  return dataSource === "mock";
}

export function canMarkSupabaseStreamLive(liveInputId: string | null | undefined) {
  return isRealCloudflareLiveInputId(liveInputId);
}

export function assertSupabaseLiveCreateAllowed(configured: boolean) {
  if (!configured) {
    throw new Error(LIVE_UNAVAILABLE_CODE);
  }
}

export function assertSupabaseLiveSessionAllowed(configured: boolean, liveInputId: string | null | undefined) {
  if (!configured || !canMarkSupabaseStreamLive(liveInputId)) {
    throw new Error(LIVE_UNAVAILABLE_CODE);
  }
}

export function assertSupabaseCanMarkLive(liveInputId: string | null | undefined) {
  if (!canMarkSupabaseStreamLive(liveInputId)) {
    throw new Error(LIVE_UNAVAILABLE_CODE);
  }
}

export function supabaseEndPublishesSampleVideo() {
  return false;
}

export function liveUserFacingMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "live-privilege") {
    return "Live streaming is temporarily disabled for this account.";
  }
  if (
    message === "That live report was not found." ||
    message === "This broadcast has already ended." ||
    message === "This livestream was removed from public view."
  ) {
    return message;
  }
  return LIVE_UNAVAILABLE_USER_MESSAGE;
}
