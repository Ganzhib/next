import { test, expect } from "@playwright/test";

const defaultOrder = ["下班倒计时", "流萤简历", "面试岛", "墨构"];

test("首页展示淘气工具铺品牌、正确工具顺序和可用链接", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "淘气工具铺首页" }).first(),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /少一点寻找/ })).toBeVisible();
  await expect(page.locator(".journey-card h3")).toHaveText(defaultOrder);
  await expect(page.locator(".journey-card")).toHaveCount(4);
  await expect(page.locator(".journey-frame-number")).toHaveText([
    "01",
    "02",
    "03",
    "04",
  ]);

  await expect(
    page.getByRole("link", { name: /下载 Windows 版：下班倒计时/ }),
  ).toHaveAttribute("href", /taoqi\.zhongtao\.me\/download\//);
  await expect(
    page.getByRole("link", { name: /制作简历：流萤简历/ }),
  ).toHaveAttribute("href", "https://flowing-resume.ganzhibin.icu/zh");
  await expect(
    page.getByRole("link", { name: /打开面试岛：面试岛/ }),
  ).toHaveAttribute("href", "https://mianshidao.zhongtao.me");
  await expect(
    page.getByRole("link", { name: /打开墨构：墨构/ }),
  ).toHaveAttribute("href", "https://moddraw.zhongtao.me");

  const imageTransition = await page
    .locator(".journey-illustration img")
    .first()
    .evaluate((element) => getComputedStyle(element).transition);
  expect(imageTransition).toContain("transform");
  expect(imageTransition).toContain("0.35s");

  await page.getByRole("button", { name: "切换明暗主题" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(errors).toEqual([]);
});

test("后台可选择配图、拖拽排序并发布到首页", async ({ page }) => {
  await page.goto("/admin/tools");
  await page.getByLabel("设置本地访问口令").fill("test-secret-2026");
  await page.getByRole("button", { name: "创建并进入" }).click();

  await expect(
    page.getByRole("heading", { name: "工具集合", exact: true }),
  ).toBeVisible();
  const cards = page.locator(".tool-config-card");
  await expect(cards).toHaveCount(4);
  await expect(cards.locator("h2")).toHaveText(defaultOrder);
  await expect(
    page.getByLabel("使用现有插画").first().locator("option"),
  ).toHaveCount(15);

  const resumeHandle = page.getByLabel("拖动流萤简历排序");
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await resumeHandle.dispatchEvent("dragstart", { dataTransfer });
  await cards.first().dispatchEvent("dragover", { dataTransfer });
  await cards.first().dispatchEvent("drop", { dataTransfer });
  await expect(cards.locator("h2")).toHaveText([
    "流萤简历",
    "下班倒计时",
    "面试岛",
    "墨构",
  ]);

  await page.getByRole("button", { name: "发布工具集合" }).click();
  await expect(page.getByRole("status")).toContainText("工具集合已发布");
  await page.goto("/");
  await expect(page.locator(".journey-card h3")).toHaveText([
    "流萤简历",
    "下班倒计时",
    "面试岛",
    "墨构",
  ]);
});

test("后台仍提供无拖拽环境可用的上下移动按钮", async ({ page }) => {
  await page.goto("/admin");
  await page.getByLabel("设置本地访问口令").fill("test-secret-2026");
  await page.getByRole("button", { name: "创建并进入" }).click();

  const cards = page.locator(".tool-config-card");
  await page.getByRole("button", { name: "下移流萤简历" }).click();
  await expect(cards.locator("h2")).toHaveText([
    "下班倒计时",
    "面试岛",
    "流萤简历",
    "墨构",
  ]);
});
