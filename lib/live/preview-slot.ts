export const MAX_SIMULTANEOUS_PREVIEWS = 6;

/** One LivePreview WHEP/file/iframe load per stream.id. A second mount of the same id must not start another viewer. */
export function tryClaimLivePreviewSlot(playingIds: Set<string>, id: string, max = MAX_SIMULTANEOUS_PREVIEWS) {
  if (playingIds.has(id)) {
    return false;
  }
  if (playingIds.size >= max) {
    return false;
  }
  playingIds.add(id);
  return true;
}

export function releaseLivePreviewSlot(playingIds: Set<string>, id: string) {
  playingIds.delete(id);
}
