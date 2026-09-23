import { expect, test } from "@playwright/test";

const WIDTHS = [320, 375, 390, 430];
const ROUTES = ["/", "/calendar?date=2026-09-18", "/chores/new", "/history", "/household", "/settings/notifications"];

test("primary routes stay inside realistic phone viewports", async ({ page }) => {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 780 });
    for (const route of ROUTES) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await expect(page.getByTestId("page-header-title").last()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${route} overflowed at ${width}px`).toBeLessThanOrEqual(1);
    }
  }
});

test("shared page chrome and forms expose essential accessibility semantics", async ({ page }) => {
  await page.goto("/chores/new");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { level: 1, name: "Add a Chore" })).toBeVisible();
  const unlabeledFields = await page.locator("input:not([type='hidden']), textarea, select").evaluateAll((fields) =>
    fields.filter((field) => !(field as HTMLInputElement).labels?.length && !field.getAttribute("aria-label")).length,
  );
  expect(unlabeledFields).toBe(0);

  await page.goto("/");
  const navMetrics = await page.locator(".bottom-nav").evaluate((nav) => {
    const box = nav.getBoundingClientRect();
    return { bottom: Math.abs(window.innerHeight - box.bottom), width: box.width };
  });
  expect(navMetrics.bottom).toBeLessThanOrEqual(1);
  expect(navMetrics.width).toBeLessThanOrEqual(430);
  await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link")).toHaveCount(5);
});

test("occurrence action clusters stay compact and overflow-free at supported phone widths", async ({ page }) => {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 780 });
    await page.goto("/");
    const card = page.locator(".occurrence-card").filter({ hasText: "Wipe kitchen counters" }).first();
    await expect(card).toBeVisible();
    const metrics = await card.evaluate((element) => {
      const icon = element.querySelector(".chore-icon")!.getBoundingClientRect();
      const body = element.querySelector(".occurrence-card__body")!.getBoundingClientRect();
      const actions = element.querySelector(".occurrence-actions")!.getBoundingClientRect();
      return {
        overflow: element.scrollWidth - element.clientWidth,
        iconCenter: icon.top + icon.height / 2,
        bodyCenter: body.top + body.height / 2,
        actionCenter: actions.top + actions.height / 2,
      };
    });
    expect(metrics.overflow, `occurrence card overflowed at ${width}px`).toBeLessThanOrEqual(1);
    expect(Math.abs(metrics.iconCenter - metrics.bodyCenter)).toBeLessThanOrEqual(2);
    if (width >= 375) expect(Math.abs(metrics.actionCenter - metrics.bodyCenter)).toBeLessThanOrEqual(2);
  }
});

test("settings stay discoverable and detail back navigation follows in-app history", async ({ page }) => {
  await page.goto("/calendar");
  await page.getByRole("link", { name: "Open settings" }).click();
  await expect(page).toHaveURL(/\/household$/);
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Notifications/ })).toHaveAttribute("href", "/settings/notifications");
  await expect(page.getByRole("link", { name: /Account/ })).toHaveAttribute("href", "/settings/account");

  await page.getByRole("link", { name: /Notifications/ }).click();
  await expect(page).toHaveURL(/\/settings\/notifications$/);
  await page.getByRole("button", { name: "Go back" }).click();
  await expect(page).toHaveURL(/\/household$/);
});
