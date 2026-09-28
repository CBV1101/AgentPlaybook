import { test, expect } from "@playwright/test";

test.describe("Stream discovery routes to reporter profiles", () => {
  test("Home live thumbnail and reporter name open the reporter, not an investigation", async ({ page }) => {
    await page.goto("/");
    const tile = page.locator(".fh-live-tile").filter({ hasText: "Times Square crossing" });
    await tile.getByRole("link", { name: "Maya Chen reporter profile" }).click();
    await expect(page).toHaveURL(/\/u\/maya-c/);
    await expect(page).not.toHaveURL(/investigations/);
    await expect(page.getByRole("heading", { name: "Maya Chen" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Live now" })).toBeVisible();

    await page.goto("/");
    await page
      .locator(".fh-live-tile")
      .filter({ hasText: "Times Square crossing" })
      .getByRole("link", { name: "Maya Chen", exact: true })
      .click();
    await expect(page).toHaveURL(/\/u\/maya-c/);
  });

  test("Home investigation cards still open investigations", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Fraud Investigation — Minnesota" }).first().click();
    await expect(page).toHaveURL(/\/u\/.+\/investigations\//);
  });

  test("Explore next stays on Explore; video follows the current reporter", async ({ page }) => {
    await page.goto("/browse");
    await page.getByRole("button", { name: "Paris, France Outside Gare du Nord LIVE" }).last().click();
    const popup = page.locator(".fh-going-on-now");
    await expect(popup).toBeVisible({ timeout: 15_000 });
    await expect(popup).toHaveAttribute("data-reporter-href", "/u/camille-l");

    const next = popup.getByRole("button", { name: "Next live stream" });
    await next.click();
    await expect(page).toHaveURL(/\/browse/);
    await expect(popup).toHaveAttribute("data-stream-index", "1");
    await expect(popup).toHaveAttribute("data-reporter-href", "/u/luc-m");

    await popup.getByRole("link", { name: "Luc Moreau reporter profile" }).first().click();
    await expect(page).toHaveURL(/\/u\/luc-m/);
    await expect(page).not.toHaveURL(/investigations/);
  });

  test("Explore close and previous do not navigate", async ({ page }) => {
    await page.goto("/browse");
    await page.getByRole("button", { name: "Paris, France Outside Gare du Nord LIVE" }).last().click();
    const popup = page.locator(".fh-going-on-now");
    await expect(popup).toBeVisible({ timeout: 15_000 });
    await popup.getByRole("button", { name: "Next live stream" }).click();
    await popup.getByRole("button", { name: "Previous live stream" }).click();
    await expect(page).toHaveURL(/\/browse/);
    await expect(popup).toHaveAttribute("data-stream-index", "0");
    await popup.getByRole("button", { name: "Close live stream" }).click();
    await expect(page).toHaveURL(/\/browse/);
    await expect(popup).toHaveCount(0);
  });
});
