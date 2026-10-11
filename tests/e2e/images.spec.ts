import { test, expect } from "@playwright/test";

test("首页只加载优化后的工具图片，不请求生成用 PNG", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "image") requests.push(request.url());
  });

  await page.goto("/");
  const images = page.locator(".journey-illustration img");
  await expect(images).toHaveCount(4);
  await expect
    .poll(() =>
      images.evaluateAll((items) =>
        items.every((item) => {
          const image = item as HTMLImageElement;
          return image.complete && image.naturalWidth > 0;
        }),
      ),
    )
    .toBe(true);

  const loadedSources = await images.evaluateAll((items) =>
    items.map((item) => (item as HTMLImageElement).currentSrc),
  );
  expect(loadedSources).toHaveLength(4);
  expect(
    loadedSources.every((url) =>
      /\/media\/tool-[\w-]+-768-[a-f0-9]+\.webp$/.test(url),
    ),
  ).toBe(true);
  expect(
    requests.some((url) => /\/assets\/illustrations\/|\.png(?:\?|$)/.test(url)),
  ).toBe(false);
});

test("手机高分屏图片可解码且页面没有横向溢出", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();
  await page.goto("/");

  const first = page.locator(".journey-illustration img").first();
  await expect(first).toBeVisible();
  await expect
    .poll(() =>
      first.evaluate((item) => {
        const image = item as HTMLImageElement;
        return image.complete && image.naturalWidth > 0;
      }),
    )
    .toBe(true);
  await expect
    .poll(() => first.evaluate((item) => (item as HTMLImageElement).currentSrc))
    .toMatch(/\/media\/tool-[\w-]+-768-[a-f0-9]+\.webp$/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);

  await context.close();
});
