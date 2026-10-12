import { expect, test } from "@playwright/test";

test("Category Calendar cards show visible checklists and separate title/location at phone widths",async({page})=>{
  for(const width of [320,375,430]) {
    await page.setViewportSize({width,height:780});await page.goto("/calendar");
    const card=page.locator(".occurrence-card--category").filter({hasText:"Clean Bathroom"});
    await expect(card.getByRole("link",{name:"Clean Bathroom",exact:true})).toBeVisible();
    await expect(card.locator(".occurrence-card__location")).toHaveText("Upstairs Bathroom");
    await expect(card.getByLabel("Clean toilet")).toBeChecked();
    await expect(card.getByLabel("Clean mirror")).toBeVisible();
    await expect(card.getByRole("button",{name:"Mark Clean Bathroom · Upstairs Bathroom as complete"})).toHaveText("Complete all");
    const metrics=await card.evaluate((element)=>{
      const title=element.querySelector(".occurrence-card__name")!.getBoundingClientRect();
      const room=element.querySelector(".occurrence-card__location")!.getBoundingClientRect();
      return {overflow:element.scrollWidth-element.clientWidth,titleBottom:title.bottom,roomTop:room.top};
    });
    expect(metrics.roomTop).toBeGreaterThanOrEqual(metrics.titleBottom);expect(metrics.overflow).toBeLessThanOrEqual(1);
    const standalone=page.locator(".occurrence-card").filter({hasText:"Wipe kitchen counters"}).first();
    await expect(standalone.locator(".occurrence-checklist")).toHaveCount(0);
  }
});

test("Category creation shows collapsed optional rooms and explicit variant target selection",async({page})=>{
  await page.goto("/chores/new");await expect(page.getByLabel("Category name")).toHaveCount(0);
  await page.getByRole("button",{name:/Category A group/}).click();
  await expect(page.getByLabel("Category name")).toBeVisible();await expect(page.getByRole("button",{name:"Add subtask"})).toBeVisible();
  const roomSelector=page.locator(".room-selector");await expect(roomSelector).not.toHaveAttribute("open","");
  await roomSelector.locator("summary").click();await page.getByLabel("Master Bathroom",{exact:true}).check();
  await roomSelector.locator("summary").click();await expect(roomSelector.locator("summary")).toContainText("1 selected");
  await page.locator(".variant-editor > summary").click();await page.getByRole("button",{name:"Add variant"}).click();
  await page.getByLabel("Variant 1",{exact:true}).fill("Sheets");
  await expect(page.getByText("Room + Variant targets",{exact:false})).toBeVisible();
  await page.getByLabel("Target room").selectOption({label:"Master Bathroom"});await page.getByLabel("Target variant").selectOption({label:"Sheets"});
  await page.getByRole("button",{name:"Add target"}).click();await expect(page.locator(".target-editor__row")).toHaveCount(1);
});
