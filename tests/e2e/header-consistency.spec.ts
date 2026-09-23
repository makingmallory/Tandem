import { expect, test } from "@playwright/test";

const ROOT_ROUTES = ["/", "/calendar", "/chores", "/history", "/household"];
const DETAIL_ROUTES = ["/chores/new", "/settings/notifications", "/auth/sign-up"];

type HeaderMetrics = {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  textAlign: string;
  left: number;
  top: number;
  headerHeight: number;
  logoLeft?: number;
  logoSize?: number;
};

async function readHeaderMetrics(page: import("@playwright/test").Page): Promise<HeaderMetrics> {
  const title = page.getByTestId("page-header-title").last();
  await expect(title).toBeVisible();
  return title.evaluate((element) => {
    const style = getComputedStyle(element);
    const titleBox = element.getBoundingClientRect();
    const headerBox = element.closest("[data-testid='page-header']")!.getBoundingClientRect();
    const logoBox = element.closest("[data-testid='page-header']")?.querySelector(".page-header__logo")?.getBoundingClientRect();
    return {
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      lineHeight: style.lineHeight,
      textAlign: style.textAlign,
      left: titleBox.left,
      top: titleBox.top,
      headerHeight: headerBox.height,
      logoLeft: logoBox?.left,
      logoSize: logoBox?.width,
    };
  });
}

function expectMatchingHeaders(results: HeaderMetrics[], alignment: "left" | "center") {
  const [baseline, ...comparisons] = results;
  for (const metrics of comparisons) {
    expect(metrics.fontFamily).toBe(baseline.fontFamily);
    expect(metrics.fontSize).toBe(baseline.fontSize);
    expect(metrics.fontWeight).toBe(baseline.fontWeight);
    expect(metrics.lineHeight).toBe(baseline.lineHeight);
    expect(metrics.textAlign).toBe(alignment);
    expect(Math.abs(metrics.left - baseline.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(metrics.top - baseline.top)).toBeLessThanOrEqual(1);
    expect(Math.abs(metrics.headerHeight - baseline.headerHeight)).toBeLessThanOrEqual(1);
    expect(metrics.logoLeft).toBe(baseline.logoLeft);
    expect(metrics.logoSize).toBe(baseline.logoSize);
  }
}

test("root page headers share typography, alignment, and position", async ({ page }) => {
  const results: HeaderMetrics[] = [];

  for (const route of ROOT_ROUTES) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");

    results.push(await readHeaderMetrics(page));
  }

  expectMatchingHeaders(results, "left");
  expect(results[0]?.logoSize ?? 0).toBeGreaterThan(0);
});

test("detail page headers share typography, alignment, position, and back navigation", async ({ page }) => {
  const results: HeaderMetrics[] = [];
  for (const route of DETAIL_ROUTES) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("page-header").last()).toHaveAttribute("data-variant", "detail");
    await expect(page.getByRole("button", { name: "Go back" }).last()).toBeVisible();
    results.push(await readHeaderMetrics(page));
  }
  expectMatchingHeaders(results, "center");
});
