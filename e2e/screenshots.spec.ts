import { test, expect } from "@playwright/test";

// Generates the PNGs embedded in the README. Run with:
//   pnpm screenshots
// Output lands in docs/screenshots/.

test("capture README screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.screenshot({
    path: "docs/screenshots/empty-state.png",
    fullPage: true,
  });

  await page.getByRole("button", { name: /Claude Code session/i }).click();
  await expect(page.getByRole("option").first()).toBeVisible();
  await page.keyboard.press("j");
  await page.keyboard.press("j");
  await page.screenshot({
    path: "docs/screenshots/overview.png",
    fullPage: true,
  });

  await page.keyboard.press("?");
  await expect(
    page.getByRole("dialog", { name: /keyboard shortcuts/i }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/help-overlay.png",
    fullPage: true,
  });
});
