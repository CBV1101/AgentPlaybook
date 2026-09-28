/** Leaflet options for Coverage Wanted / discovery maps. One world, no longitude copies. */

export const DISCOVERY_MAP_MAX_BOUNDS = {
  south: -85,
  west: -180,
  north: 85,
  east: 180,
} as const;

export const DISCOVERY_MAP_TILE_NO_WRAP = true;
export const DISCOVERY_MAP_WORLD_COPY_JUMP = false;
