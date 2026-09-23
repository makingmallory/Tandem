import { expect, test } from "@playwright/test";

const WIDTHS = [320, 375, 390, 430];

test("reminder time selectors stay readable and contained on supported phone widths", async ({ page }) => {
  await page.goto("/chores/new");
  await page.waitForLoadState("networkidle");

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 780 });
    await page.evaluate(() => document.querySelectorAll("#reminder-time-selector-fixture").forEach((fixture) => fixture.remove()));
    await page.evaluate(() => {
      const content = [...document.querySelectorAll<HTMLElement>(".page-content")]
        .find((element) => element.getBoundingClientRect().width > 0);
      if (!content) throw new Error("No visible page content");
      const fixture = document.createElement("section");
      fixture.id = "reminder-time-selector-fixture";
      fixture.className = "card";
      fixture.innerHTML = `
        <div class="reminder-builder">
          <fieldset class="reminder-builder-row">
            <div class="reminder-builder-row__timing"><span class="reminder-builder-row__relation">On the due date</span></div>
            <div class="reminder-builder-row__time">
              <span>Time</span>
              <div class="reminder-time-selector">
                <label><select class="text-field" aria-label="Hour"><option value="10" selected>10</option></select></label>
                <span>:</span>
                <label><select class="text-field" aria-label="Minute"><option value="40" selected>40</option></select></label>
                <label><select class="text-field" aria-label="AM or PM"><option value="PM" selected>PM</option></select></label>
              </div>
            </div>
            <button class="reminder-builder-row__remove" type="button" aria-label="Remove notification">×</button>
          </fieldset>
        </div>`;
      content.append(fixture);
    });

    const fixture = page.locator("#reminder-time-selector-fixture");
    const selectors = fixture.locator(".reminder-time-selector select");
    await expect(selectors).toHaveCount(3);
    await expect(selectors.nth(0)).toHaveValue("10");
    await expect(selectors.nth(1)).toHaveValue("40");
    await expect(selectors.nth(2)).toHaveValue("PM");

    const metrics = await fixture.evaluate((element) => {
      const selectors = [...element.querySelectorAll<HTMLSelectElement>(".reminder-time-selector select")];
      return {
        overflow: element.scrollWidth - element.clientWidth,
        selectors: selectors.map((select) => {
          const style = getComputedStyle(select);
          const context = document.createElement("canvas").getContext("2d")!;
          context.font = style.font;
          const horizontalPadding = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
          const horizontalBorders = Number.parseFloat(style.borderLeftWidth) + Number.parseFloat(style.borderRightWidth);
          return {
            appearance: style.appearance,
            backgroundImage: style.backgroundImage,
            contentWidth: select.getBoundingClientRect().width - horizontalPadding - horizontalBorders,
            textWidth: context.measureText(select.value).width,
            width: select.getBoundingClientRect().width,
          };
        }),
      };
    });
    expect(metrics.overflow, `time selector overflowed at ${width}px`).toBeLessThanOrEqual(1);
    expect(metrics.selectors[0]!.width).toBeGreaterThanOrEqual(width <= 360 ? 64 : 72);
    expect(metrics.selectors[1]!.width).toBeGreaterThanOrEqual(width <= 360 ? 64 : 72);
    expect(metrics.selectors[2]!.width).toBeGreaterThanOrEqual(width <= 360 ? 68 : 80);
    for (const selector of metrics.selectors) {
      expect(selector.appearance).toBe("none");
      expect(selector.backgroundImage).not.toBe("none");
      expect(selector.contentWidth).toBeGreaterThanOrEqual(selector.textWidth + 4);
    }
  }
});
