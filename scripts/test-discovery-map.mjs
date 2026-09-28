import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const map = readFileSync(join(root, "components/discovery-map.tsx"), "utf8");
const config = readFileSync(join(root, "lib/discovery-map-config.ts"), "utf8");

assert(config.includes("DISCOVERY_MAP_TILE_NO_WRAP = true"), "OSM tiles must disable longitude wrap");
assert(config.includes("DISCOVERY_MAP_WORLD_COPY_JUMP = false"), "Leaflet must not jump between world copies");
assert(map.includes("noWrap: DISCOVERY_MAP_TILE_NO_WRAP"), "DiscoveryMap tile layer must use noWrap");
assert(map.includes("worldCopyJump: DISCOVERY_MAP_WORLD_COPY_JUMP"), "DiscoveryMap must disable worldCopyJump");
assert(map.includes("maxBounds"), "DiscoveryMap must clamp pan to one world");
assert(map.includes('data-world-copies="off"'), "Map container must declare one-world mode");
assert(!map.includes("renderWorldCopies"), "Do not use Mapbox-only world-copy flags on Leaflet");

console.log("discovery map invariants passed");
