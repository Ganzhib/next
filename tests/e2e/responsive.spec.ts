import { test, expect } from "@playwright/test";

test("阶段导航在所有窄屏断点自然换行，无横向滚动或竖排标签", async ({
  page,
}) => {
  await page.goto("/");
  for (const width of [320, 390, 540, 720, 800, 820, 900, 1024, 1050, 1100]) {
    await page.setViewportSize({ width, height: 900 });
    const ribbon = page.locator(".stage-ribbon .container");
    await expect(ribbon.locator("a")).toHaveCount(5);
    expect(
      await ribbon.evaluate((el) => el.scrollWidth <= el.clientWidth),
      `ribbon width ${width}`,
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `page width ${width}`,
    ).toBe(true);
    for (const item of await ribbon.locator("a").all()) {
      const box = await item.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
    const label = await ribbon.locator(".ribbon-label").boundingBox();
    expect(label!.height).toBeLessThan(30);
  }
  await page.setViewportSize({ width: 720, height: 1000 });
  await page
    .locator(".stage-ribbon")
    .screenshot({ path: "test-results/stages-tablet.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator(".stage-ribbon")
    .screenshot({ path: "test-results/stages-mobile.png" });
  await page
    .locator(".stage-ribbon")
    .getByRole("link", { name: /选择 Offer/ })
    .click();
  await expect(page.locator("#journey-offer")).toBeInViewport();
});
