import { expect, test } from "@playwright/test";

test("Today shows scheduled, overdue, and upcoming occurrence data", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("2 chores today", { exact: true })).toBeVisible();
  await expect(page.getByText("Overdue", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Today's chores" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Coming up" })).toBeVisible();
  await expect(page.getByText(/of 5 done/i)).toHaveCount(0);
});

test("Calendar provides a mobile week selector backed by occurrences", async ({ page }) => {
  await page.goto("/calendar?date=2026-09-18");
  await expect(page.getByRole("heading", { name: "Calendar", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Previous week" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Next week" })).toBeVisible();
  await expect(page.getByLabel("Choose a day").getByRole("link")).toHaveCount(9);
  await expect(page.getByText("Wipe kitchen counters", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Next week" }).click();
  await expect(page).toHaveURL(/date=2026-09-20/);
});
