import { expect, test } from "@playwright/test";

test("PWA manifest, service worker, install help, and notification settings are available", async ({ page, request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ sizes: "192x192", type: "image/png" }),
    expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
  ]));

  const serviceWorker = await (await request.get("/sw.js")).text();
  expect(serviceWorker).toContain('addEventListener("push"');
  expect(serviceWorker).toContain('addEventListener("notificationclick"');

  await page.goto("/");
  await expect(page.getByText(/Add Tandem to your Home Screen/)).toBeVisible();

  await page.goto("/settings/notifications");
  await expect(page.getByRole("heading", { name: "Notification Settings" })).toBeVisible();
  await expect(page.getByText(/notifications|Web Push/i).first()).toBeVisible();
});
