import { test, expect } from "@playwright/test";

test("冷启动只请求响应式首屏图，不请求原始 PNG 或屏幕外校园图", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "image") requests.push(request.url());
  });
  await page.goto("/");
  await expect(
    page.locator('.journey-illustration picture[data-loaded="true"]'),
  ).toHaveCount(5);
  expect(requests.some((url) => /\.png/.test(url))).toBe(false);
  expect(requests.some((url) => url.includes("campus-"))).toBe(false);
  const variants = requests.filter((url) => url.includes("/media/"));
  expect(variants).toHaveLength(5);
  expect(variants.every((url) => /-256-[a-f0-9]+\.avif$/.test(url))).toBe(true);
  await page.locator("#campus").scrollIntoViewIfNeeded();
  await expect(
    page.locator('.campus-art picture[data-loaded="true"]'),
  ).toHaveCount(3);
  await expect(page.locator(".campus-art img").first()).toHaveJSProperty(
    "complete",
    true,
  );
});

test("手机高分屏选择合适尺寸，WebP 回退可以正常解码", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(
    page.locator('.journey-illustration picture[data-loaded="true"]').first(),
  ).toBeVisible();
  const first = page.locator(".journey-illustration img").first();
  await expect
    .poll(() => first.evaluate((img) => (img as HTMLImageElement).currentSrc))
    .toMatch(/-512-[a-f0-9]+\.avif$/);
  // 移除 AVIF source 模拟不支持 AVIF 的浏览器选择 img 的 WebP srcset。
  await page
    .locator(".journey-illustration picture")
    .first()
    .locator("source")
    .evaluate((source) => source.remove());
  await expect
    .poll(() => first.evaluate((img) => (img as HTMLImageElement).currentSrc))
    .toMatch(/-512-[a-f0-9]+\.webp$/);
  await expect
    .poll(() =>
      first.evaluate(
        (img) =>
          (img as HTMLImageElement).complete &&
          (img as HTMLImageElement).naturalWidth > 0,
      ),
    )
    .toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await context.close();
});
