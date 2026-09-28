export type GlobeAnchor = {
  x: number;
  y: number;
  visible: boolean;
  wrapW: number;
  wrapH: number;
};

export function thumbnailPosition(
  anchor: GlobeAnchor | null,
  width = 260,
): { left: number; top: number; width: number; hidden: boolean; side: "left" | "right" } {
  const height = Math.round((width * 9) / 16) + 56;
  const wrapW = anchor?.wrapW ?? 640;
  const wrapH = anchor?.wrapH ?? 400;
  if (!anchor?.visible) {
    return { left: 0, top: 0, width, hidden: true, side: "right" };
  }

  const gap = 18;
  let side: "left" | "right" = "right";
  let left = anchor.x + gap;
  if (left + width > wrapW - 8) {
    side = "left";
    left = anchor.x - width - gap;
  }
  if (left < 8) {
    left = 8;
    if (anchor.x < wrapW / 2) {
      side = "right";
      left = Math.min(anchor.x + gap, wrapW - width - 8);
    }
  }
  left = Math.min(Math.max(8, left), Math.max(8, wrapW - width - 8));
  let top = anchor.y - height / 2;
  top = Math.min(Math.max(8, top), Math.max(8, wrapH - height - 8));
  return { left, top, width, hidden: false, side };
}

export function mergeLiveSessionOrder(previous: string[], rankedIds: string[], locationChanged: boolean) {
  if (locationChanged) {
    return rankedIds;
  }
  const keep = previous.filter((id) => rankedIds.includes(id));
  const extras = rankedIds.filter((id) => !keep.includes(id));
  if (keep.length === 0) {
    return rankedIds;
  }
  return [...keep, ...extras];
}
