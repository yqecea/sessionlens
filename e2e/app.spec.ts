import { test, expect } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

test("loads with an empty state that teaches what to paste", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/sessionlens/);
  await expect(
    page.getByRole("heading", { name: /sessionlens/i }),
  ).toBeVisible();
  await expect(page.getByLabel(/paste a \.jsonl transcript/i)).toBeVisible();
});

test("sample data renders timeline rows", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Claude Code session/i }).click();
  const options = page.getByRole("option");
  await expect(options.first()).toBeVisible();
  expect(await options.count()).toBeGreaterThan(10);
});

test("j and k move the selection", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Claude Code session/i }).click();
  const first = page.getByRole("option").first();
  await expect(first).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("j");
  const second = page.getByRole("option").nth(1);
  await expect(second).toHaveAttribute("aria-selected", "true");
  await expect(second).toHaveAttribute("aria-current", "true");
  await page.keyboard.press("k");
  await expect(first).toHaveAttribute("aria-selected", "true");
});

test("slash focuses the filter and narrows rows", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Claude Code session/i }).click();
  await expect(page.getByRole("option").first()).toBeVisible();
  await page.keyboard.press("/");
  await expect(page.getByLabel(/filter timeline/i)).toBeFocused();
  await page.keyboard.type("ship it");
  await expect(page.getByRole("option")).toHaveCount(1);
});

test("question mark opens help and Escape closes it", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("?");
  await expect(
    page.getByRole("dialog", { name: /keyboard shortcuts/i }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: /keyboard shortcuts/i }),
  ).toHaveCount(0);
});

test("loading and driving the app produces no console or page errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto("/");
  await page.getByRole("button", { name: /Claude Code session/i }).click();
  await page.keyboard.press("j");
  await page.keyboard.press("/");
  await page.keyboard.type("bash");
  await page.keyboard.press("Escape");
  expect(errors).toEqual([]);
});

test("main view has no serious axe violations", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Claude Code session/i }).click();
  await expect(page.getByRole("option").first()).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(serious).toEqual([]);
});
