import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "app/globals.css"), "utf8");
const preview = readFileSync(join(root, "components/live-preview.tsx"), "utf8");
const grid = readFileSync(join(root, "components/live-stream-grid.tsx"), "utf8");
const card = readFileSync(join(root, "components/compact-live-stream-card.tsx"), "utf8");
const goingOnNow = readFileSync(join(root, "components/going-on-now.tsx"), "utf8");
const liveNow = readFileSync(join(root, "components/live-now-section.tsx"), "utf8");
const showcase = readFileSync(join(root, "lib/homepage-showcase.ts"), "utf8");

assert(css.includes(".fh-live-grid"), "LiveStreamGrid layout class is missing");
assert(
  css.includes("@media (min-width: 1500px)") && css.includes("repeat(5, minmax(0, 1fr))"),
  "Home/Following compact grid must be 5 equal tracks from 1500px, sized by the grid not a player max-width",
);
assert(css.includes(".fh-live-tile"), "Compact tiles must exist");
assert(!css.includes(".fh-live-tile {\n  width: 100%;\n  max-width: 290px"), "Tile width must come from the grid, not a 290px cap");
assert(css.includes(".fh-live-preview-grid"), "Grid player variant class is missing");
assert(!css.includes(".fh-live-preview-grid {\n  max-width: 290px"), "Grid player must fill its cell, not hard-code 290px");
assert(css.includes(".fh-live-preview-thumb"), "Globe thumbnail player class is missing");
assert(css.includes("max-width: none"), "Globe thumbnail must not inherit a grid cap");
assert(!/^video\s*\{/m.test(css) && !/^iframe\s*\{/m.test(css), "Do not size every video/iframe globally");
assert(!preview.includes('variant = "full"'), "LivePreview must not default to full; Home would inherit a page-level player");
assert(preview.includes('"grid" | "globeThumbnail" | "full"'), "LivePreview must expose explicit variants");
assert(preview.includes("variant: LivePreviewVariant"), "LivePreview variant must be required");
assert(preview.includes("reporterProfileHref"), "Discovery previews must link to reporter profiles");
assert(card.includes("reporterProfileHref"), "Compact live cards must link to reporter profiles");
assert(card.includes('variant="grid"'), "Home/Following tiles must use the grid player variant");
assert(!card.includes("liveHref"), "Compact live cards must not send discovery clicks to /live");
assert(liveNow.includes("LiveStreamGrid"), "Home Live Now must render LiveStreamGrid");
assert(!liveNow.includes("FeaturedLiveStream"), "Home Live Now must not render a featured player");
assert(grid.includes('data-live-grid="compact"'), "LiveStreamGrid must mark compact collection layout");
assert(goingOnNow.includes('variant="globeThumbnail"'), "Going On Now must use the globe thumbnail variant");
assert(goingOnNow.includes("z-40"), "Going On Now nav overlay must sit above the player");
assert(goingOnNow.includes("z-20"), "Going On Now video click target must sit under nav");
assert(goingOnNow.includes("pointer-events-none absolute inset-0 z-40"), "Going On Now nav overlay must sit above the video link");
assert(preview.includes("isThumb || !href"), "Globe thumbnail LivePreview must not draw its own covering link");
assert(grid.includes("fh-live-grid"), "LiveStreamGrid must own collection layout");
assert(showcase.includes("MIN_DEV_LIVE_GRID_STREAMS = 6"), "Development must keep at least 6 live streams for the Home grid");
assert(showcase.includes("liveCount >= MIN_DEV_LIVE_GRID_STREAMS"), "One real live stream must not replace the compact development grid");

console.log("live grid invariants passed");
