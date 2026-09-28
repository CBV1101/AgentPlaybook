import { test, expect } from "@playwright/test";

test.describe("Explore Going On Now arrows", () => {
  test("Paris showcase has next/previous on the video, without moving the globe", async ({ page }) => {
    await page.goto("/browse");
    await expect(page.getByRole("heading", { name: "Where do you want to look?" })).toBeVisible();
    await page.getByRole("button", { name: "Paris, France Outside Gare du Nord LIVE" }).last().click();

    const popup = page.locator(".fh-going-on-now");
    await expect(popup).toBeVisible({ timeout: 15_000 });
    await expect(popup).toHaveAttribute("data-stream-count", "3");
    await expect(popup.getByText("1 of 3")).toBeVisible();

    const next = popup.getByRole("button", { name: "Next live stream" });
    await expect(next).toBeVisible();
    const face = next.locator(".fh-going-on-now-nav-face");
    const faceBox = await face.boundingBox();
    expect(faceBox).toBeTruthy();
    expect(faceBox!.width).toBeGreaterThanOrEqual(26);
    expect(faceBox!.width).toBeLessThanOrEqual(30);
    expect(faceBox!.height).toBeGreaterThanOrEqual(26);
    expect(faceBox!.height).toBeLessThanOrEqual(30);

    const nextBox = await next.boundingBox();
    expect(nextBox!.width).toBeGreaterThan(0);
    expect(nextBox!.height).toBeGreaterThan(0);

    const popupBox = await popup.boundingBox();
    expect(popupBox!.width).toBeLessThanOrEqual(280);

    const video = popup.locator(".relative.aspect-video");
    const videoBox = await video.boundingBox();
    expect(Math.abs(nextBox!.y + nextBox!.height / 2 - (videoBox!.y + videoBox!.height / 2))).toBeLessThan(12);

    const city = await page.locator("[data-canonical-place]").getAttribute("data-city");
    const focusBefore = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      return canvas ? canvas.toDataURL().slice(0, 80) : "";
    });
    const leftBefore = popupBox!.x;

    await next.click();
    await expect(popup).toHaveAttribute("data-stream-index", "1");
    await expect(popup.getByText("2 of 3")).toBeVisible();
    await expect(page.locator("[data-canonical-place]")).toHaveAttribute("data-city", city ?? "Paris");

    const prev = popup.getByRole("button", { name: "Previous live stream" });
    await expect(prev).toBeVisible();
    const popupAfter = await popup.boundingBox();
    expect(Math.abs(popupAfter!.x - leftBefore)).toBeLessThan(8);

    const focusAfter = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      return canvas ? canvas.toDataURL().slice(0, 80) : "";
    });
    expect(focusAfter).toBe(focusBefore);

    await prev.click();
    await expect(popup.getByText("1 of 3")).toBeVisible();
  });
});
