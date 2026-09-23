import { expect, test } from "@playwright/test";

test("Today shows scheduled, overdue, and upcoming occurrence data", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 of 2 done", { exact: true })).toBeVisible();
  await expect(page.locator(".occurrence-card").filter({ hasText: "Overdue" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Today's chores" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Coming up" })).toBeVisible();
  await expect(page.getByText("Done by Nik", { exact: false })).toBeVisible();
  await expect(page.getByText("Skipped", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Mark .* as complete/ }).first()).toBeVisible();
  const completedChore = page.locator(".occurrence-card").filter({ hasText: "Done by Nik" });
  await expect(completedChore.getByRole("button", { name: "Mark Water plants as incomplete" })).toHaveText("Completed");
  await expect(completedChore.getByTestId("occurrence-action-cluster").getByLabel("More actions for Water plants")).toBeVisible();
});

test("History shows real household activity rather than a placeholder", async ({ page }) => {
  await page.goto("/history");
  await expect(page.getByRole("heading", { name: "History", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  await expect(page.getByText("Take trash out", { exact: true })).toBeVisible();
  await expect(page.getByText(/Nik ·/)).toBeVisible();
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
