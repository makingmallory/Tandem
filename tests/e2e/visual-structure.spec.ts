import { expect, test } from "@playwright/test";

test("Home uses the branded hierarchy, integrated progress, and quiet completion controls", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator(".page-header__brand-name").last()).toHaveText("Tandem");
  await expect(page.getByRole("heading", { level: 1, name: "Today at Home" }).last()).toBeVisible();
  await expect(page.locator(".page-header__subtitle").last()).toBeVisible();
  await expect(page.locator(".progress-card__title")).toHaveText("Today");

  const row = page.locator('.occurrence-card[data-presentation="home"]').filter({ hasText: "Wipe kitchen counters" }).first();
  const completion = row.getByRole("button", { name: "Mark Wipe kitchen counters as complete" });
  await expect(completion).toBeVisible();
  await expect(row.getByLabel("More actions for Wipe kitchen counters")).toHaveCount(0);
  const size = await completion.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { width: box.width, height: box.height };
  });
  expect(size.width).toBeGreaterThanOrEqual(44);
  expect(size.height).toBeGreaterThanOrEqual(44);
});

test("Calendar, Chores, and Settings retain their compact structural hierarchy", async ({ page }) => {
  await page.goto("/calendar?date=2026-09-18");
  await expect(page.locator('.week-day[aria-current="date"]')).toHaveCount(1);
  await expect(page.locator(".week-picker")).toBeVisible();

  await page.goto("/chores");
  await expect(page.locator(".chore-card")).toHaveCount(2);
  const active = page.locator(".chore-card").filter({ hasText: "Water plants" });
  await expect(active.locator(".chore-icon")).toBeVisible();
  await expect(active.getByText("Active", { exact: true })).toBeVisible();
  await expect(active.locator(".chore-card__chevron")).toBeVisible();

  await page.goto("/household");
  const settingsRows = page.locator(".settings-list__item");
  await expect(settingsRows).toHaveCount(2);
  await expect(settingsRows.locator(".settings-list__icon")).toHaveCount(2);
});
