import { expect, test } from "@playwright/test";

const ROOT_ROUTES = ["/", "/calendar", "/chores", "/history", "/household"];

type HeaderMetrics = {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  textAlign: string;
  left: number;
  top: number;
  headerHeight: number;
};

test("root page headers share typography, alignment, and position", async ({ page }) => {
  const results: HeaderMetrics[] = [];

  for (const route of ROOT_ROUTES) {
    await page.goto(route);
    // Next can briefly retain the route loading fallback while streaming the
    // final header. Measure only the settled page header.
    const title = page.getByTestId("page-header-title").filter({ hasNotText: "Loading your home" });
    await expect(title).toBeVisible();

    results.push(
      await title.evaluate((element) => {
        const style = getComputedStyle(element);
        const titleBox = element.getBoundingClientRect();
        const headerBox = element.closest("[data-testid='page-header']")!.getBoundingClientRect();

        return {
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          textAlign: style.textAlign,
          left: titleBox.left,
          top: titleBox.top,
          headerHeight: headerBox.height,
        };
      }),
    );
  }

  const [baseline, ...comparisons] = results;

  for (const metrics of comparisons) {
    expect(metrics.fontFamily).toBe(baseline.fontFamily);
    expect(metrics.fontSize).toBe(baseline.fontSize);
    expect(metrics.fontWeight).toBe(baseline.fontWeight);
    expect(metrics.lineHeight).toBe(baseline.lineHeight);
    expect(metrics.textAlign).toBe("left");
    expect(Math.abs(metrics.left - baseline.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(metrics.top - baseline.top)).toBeLessThanOrEqual(1);
    expect(Math.abs(metrics.headerHeight - baseline.headerHeight)).toBeLessThanOrEqual(1);
  }
});
