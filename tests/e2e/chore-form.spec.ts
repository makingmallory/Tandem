import { expect, test } from "@playwright/test";

test("add chore uses the shared detail shell and friendly recurrence builder", async ({ page }) => {
  await page.goto("/chores/new");
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("heading", { name: "Add a Chore", exact: true })).toBeVisible();
  await page.evaluate(() => window.sessionStorage.clear());
  await page.getByRole("button", { name: "Go back" }).click();
  await expect(page).toHaveURL(/\/chores$/);
  await page.goto("/chores/new");
  await expect(page.getByLabel("Chore name")).toBeVisible();
  await expect(page.getByLabel("Starts")).toBeVisible();
  await expect(page.getByRole("radio", { name: "Pet care" })).toBeAttached();
  await expect(page.getByRole("radio", { name: "Mint" })).toBeAttached();

  const intervalDays = page.getByRole("radio", { name: /Every N days/ });
  await intervalDays.evaluate((element: HTMLInputElement) => element.click());
  await expect(intervalDays).toBeChecked();
  await page.getByLabel("Repeat every how many days?").fill("3");
  await expect(page.getByText("Every 3 days", { exact: true })).toBeVisible();

  const intervalWeeks = page.getByRole("radio", { name: /Every N weeks/ });
  await intervalWeeks.evaluate((element: HTMLInputElement) => element.click());
  await page.getByLabel("Starts").fill("2026-09-21");
  await page.getByRole("checkbox", { name: "Monday" }).evaluate((element: HTMLInputElement) => element.click());
  await expect(page.getByText("Starts Sep 21", { exact: true })).toBeVisible();

  await expect(page.getByText(/Either of us|Both of us|Assignment/i)).toHaveCount(0);
});
