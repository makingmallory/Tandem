import { expect, test } from "@playwright/test";

test("room selection and schedule customization stay compact on phones", async ({ page }) => {
  for (const width of [320, 375, 430]) {
    await page.setViewportSize({ width, height: 780 });
    await page.goto("/chores/new");
    await page.getByRole("button", { name: /Category A group/ }).click();
    const selector = page.locator(".room-selector");
    await expect(selector).not.toHaveAttribute("open", "");
    await selector.locator("summary").click();
    await expect(page.getByLabel("Master Bathroom")).not.toBeChecked();
    await page.getByLabel("Master Bathroom").check();
    await page.getByLabel("Downstairs Bathroom").check();
    await expect(page.getByLabel("Kitchen")).not.toBeChecked();
    await expect(page.getByRole("button", { name: "Apply same schedule" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Customize schedule by room" }).click();
    await page.locator("summary").filter({ hasText: "Downstairs Bathroom" }).click();
    await expect(page.locator(".room-schedule").filter({ hasText: "Downstairs Bathroom" }).getByLabel("Starts")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.goto("/household");
    await page.getByRole("button", { name: "Rename Master Bathroom" }).click();
    await expect(page.getByLabel("Room name", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  }
});
