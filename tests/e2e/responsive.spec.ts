import { test, expect } from "@playwright/test";

test("工具卡片在桌面、平板和手机宽度下正确排列且不横向溢出", async ({
  page,
}) => {
  await page.goto("/");

  for (const width of [320, 390, 520, 720, 900, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const cards = page.locator(".tool-collection-grid .journey-card");
    await expect(cards).toHaveCount(4);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `page width ${width}`,
    ).toBe(true);

    for (const card of await cards.all()) {
      const box = await card.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }

    const firstRowY = (await cards.nth(0).boundingBox())!.y;
    const secondCardY = (await cards.nth(1).boundingBox())!.y;
    if (width <= 520) expect(secondCardY).toBeGreaterThan(firstRowY);
    else expect(Math.abs(secondCardY - firstRowY)).toBeLessThan(2);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/toolbox-mobile.png",
    fullPage: true,
  });
});
