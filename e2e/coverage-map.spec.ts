import { test, expect } from "@playwright/test";

test.describe("Coverage Wanted map", () => {
  test("renders one world without longitude copies", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/wanted");
    const map = page.locator('[data-world-copies="off"]');
    await expect(map).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".leaflet-container")).toBeVisible();

    const wrap = await page.evaluate(() => {
      const container = document.querySelector('[data-world-copies="off"]') as HTMLElement | null;
      const tiles = [...document.querySelectorAll(".leaflet-tile")];
      const xs = tiles.map((tile) => {
        const el = tile as HTMLElement;
        const match = (el.style.transform || "").match(/translate3d\(([-\d.]+)px/);
        return match ? Number(match[1]) : el.offsetLeft;
      });
      const min = Math.min(...xs, 0);
      const max = Math.max(...xs, 0);
      return {
        noWrap: container?.dataset.worldCopies === "off",
        tileCount: tiles.length,
        span: max - min,
        width: container?.clientWidth ?? 0,
      };
    });
    expect(wrap.noWrap).toBe(true);
    expect(wrap.tileCount).toBeGreaterThan(0);
    expect(wrap.span).toBeLessThan(wrap.width * 1.8);
  });
});
