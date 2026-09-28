import { test, expect } from "@playwright/test";

test.describe("Home Live Now compact grid", () => {
  test.use({ viewport: { width: 1600, height: 1000 } });

  test("five compact tiles sit on one row and open the reporter", async ({ page }) => {
    await page.goto("/");
    const grid = page.locator("[data-live-grid=compact]");
    await expect(grid).toBeVisible();

    const previews = page.locator(".fh-live-section [data-live-preview=grid]");
    expect(await previews.count()).toBeGreaterThanOrEqual(5);

    const boxes = [];
    for (let i = 0; i < 5; i += 1) {
      const box = await previews.nth(i).boundingBox();
      expect(box).toBeTruthy();
      boxes.push(box!);
    }

    const rowY = boxes[0]!.y;
    for (const box of boxes) {
      expect(Math.abs(box.y - rowY)).toBeLessThan(8);
      expect(box.width).toBeGreaterThan(220);
      expect(box.width).toBeLessThan(330);
      expect(box.height / box.width).toBeGreaterThan(0.5);
      expect(box.height / box.width).toBeLessThan(0.65);
    }

    const gridBox = await grid.boundingBox();
    expect(gridBox).toBeTruthy();
    expect(boxes[0]!.width).toBeLessThan(gridBox!.width * 0.45);

    await previews.first().click();
    await expect(page).toHaveURL(/\/u\//);
    await expect(page).not.toHaveURL(/investigations/);
  });
});
