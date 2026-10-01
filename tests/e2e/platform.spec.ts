import { test, expect } from "@playwright/test";
test("首页视觉、收藏持久化和移动端布局", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /学好一门课/ })).toBeVisible();
  await expect(page.locator(".site-header nav")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "切换导航" })).toHaveCount(0);
  await page.getByRole("button", { name: "打开全局搜索" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Magic Resume/ })
    .click();
  await expect(page).toHaveURL(/\/products\/magic-resume$/);
  await page.locator(".site-header .brand").click();
  await expect(page.locator(".journey-card")).toHaveCount(5);
  await expect(page.locator(".journey-illustration img")).toHaveCount(5);
  await expect
    .poll(() =>
      page
        .locator(".journey-illustration img")
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).currentSrc.includes('/media/') &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  expect(
    await page
      .locator("html")
      .evaluate((element) =>
        getComputedStyle(element).getPropertyValue("--accent").trim(),
      ),
  ).toBe("#466653");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(250, 248, 243)",
  );
  await expect(page.locator(".journey-illustration").first()).toHaveCSS(
    "background-color",
    "rgb(232, 238, 223)",
  );
  await expect(page.locator(".journey-card h3")).toHaveText([
    "打磨简历",
    "技术准备",
    "练习面试",
    "寻找机会",
    "选择 Offer",
  ]);
  await expect(page.locator(".journey-card.is-upcoming")).toHaveCount(3);
  await expect(page.locator(".journey-coming-soon")).toHaveText([
    "敬请期待",
    "敬请期待",
    "敬请期待",
  ]);
  await expect(page.locator(".journey-card.is-upcoming a")).toHaveCount(0);
  await expect(page.locator("#journey-prepare h4")).toHaveText("Magic Resume");
  await expect(page.locator("#journey-mock h4")).toHaveText("Interview Lab");
  await page
    .locator(".stage-ribbon")
    .getByRole("link", { name: /技术准备/ })
    .click();
  await expect(page).toHaveURL(/#journey-practice$/);
  await expect(page.locator("#journey-practice")).toBeInViewport();
  await page
    .locator("#featured")
    .screenshot({ path: "test-results/journey-desktop.png" });
  await page.goto("/");
  await page.screenshot({ path: "test-results/comic-home-viewport.png" });
  await expect(page.locator("#categories, #collections, #toolbox")).toHaveCount(
    0,
  );
  await expect(page.locator(".campus-story h3")).toHaveText([
    "课程与自学",
    "项目与竞赛",
    "科研与升学",
  ]);
  await expect(page.locator(".campus-status.upcoming")).toHaveCount(3);
  await expect(page.locator(".campus-story a")).toHaveCount(0);
  await page.locator("#campus").scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page
        .locator(".campus-art img")
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).currentSrc.includes('/media/') &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await page
    .locator("#campus")
    .screenshot({ path: "test-results/campus-desktop.png" });
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  await page.goto("/products");
  await expect(page.locator(".product-card")).toHaveCount(2);
  await page.getByRole("button", { name: "收藏 Magic Resume" }).click();
  await page.goto("/favorites");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.setViewportSize({ width: 360, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /学好一门课/ })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await expect(
    page.getByRole("button", { name: "打开全局搜索" }),
  ).toBeVisible();
  await expect(
    page.locator(".site-header").getByRole("link", { name: "我的收藏" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("后台创建产品、配置链接、前台搜索和归档闭环", async ({ page }) => {
  await page.goto("/admin");
  await page.getByLabel("设置本地访问口令").fill("test-secret-2026");
  await page.getByRole("button", { name: "创建并进入" }).click();
  await expect(
    page.getByRole("heading", { name: "今天，也让好产品被看见。" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/admin-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "新增产品", exact: true }).click();
  await page.getByLabel("产品名称", { exact: true }).fill("测试求职产品");
  await page.getByLabel("产品标识 Slug").fill("test-career-product");
  await page.getByLabel("一句话介绍").fill("用于验证后台到前台的数据闭环。");
  await page
    .getByRole("combobox", { name: /产品分类/ })
    .selectOption("campus-study");
  await page
    .getByRole("combobox", { name: /求职阶段/ })
    .selectOption("practice");
  await page.getByRole("button", { name: "链接与归因", exact: true }).click();
  await page.getByLabel("独立产品网址").fill("https://example.com/career");
  await page.getByRole("button", { name: "从网址提取允许域名" }).click();
  await page.getByRole("button", { name: "展示与发布", exact: true }).click();
  await page.getByLabel("发布状态").selectOption("published");
  await page.getByRole("button", { name: "保存产品", exact: true }).click();
  await page.getByLabel("搜索后台产品").fill("测试求职");
  await expect(
    page.locator(".table-product").filter({ hasText: "测试求职产品" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "查看网站" }).getAttribute("href");
  await page.goto("/");
  await expect(page.locator("#journey-practice h4")).toHaveText("测试求职产品");
  await expect(page.locator(".journey-card.is-upcoming")).toHaveCount(2);
  await expect(page.locator(".campus-study .campus-status")).toHaveText(
    "探索工具",
  );
  await expect(page.locator(".campus-study a")).toHaveAttribute(
    "href",
    "/categories/campus-study",
  );
  await page.goto("/products?q=测试求职");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "测试求职产品" }),
  ).toBeVisible();
  await page.goto("/go/test-career-product");
  await expect(page.getByRole("button", { name: "继续访问" })).toBeVisible();
  await page.goto("/admin");
  await page
    .getByLabel("本地访问口令", { exact: true })
    .fill("test-secret-2026");
  await page.getByRole("button", { name: "进入运营后台" }).click();
  await page.getByRole("link", { name: "产品管理", exact: true }).click();
  await page.getByLabel("搜索后台产品").fill("测试求职");
  await page.getByRole("button", { name: "归档 测试求职产品" }).click();
  await page.getByRole("button", { name: "确认归档" }).click();
  await expect(page.locator(".data-table").getByText("已归档")).toBeVisible();
  await page.goto("/");
  await expect(
    page.locator("#journey-practice .journey-coming-soon"),
  ).toHaveText("敬请期待");
  await expect(page.locator(".campus-study .campus-status")).toHaveText(
    "敬请期待",
  );
  await page.goto("/products?q=测试求职");
  await expect(
    page.getByRole("heading", { name: "这次还没有找到" }),
  ).toBeVisible();
});
test("隐私默认关闭、开启后的真实事件与对比", async ({ page }) => {
  await page.goto("/settings/privacy");
  await expect(
    page.getByLabel("本地行为分析", { exact: true }),
  ).not.toBeChecked();
  await page.getByLabel("本地行为分析", { exact: true }).check();
  await page.goto("/products");
  await page.getByRole("button", { name: "对比 Magic Resume" }).click();
  await page.getByRole("button", { name: "对比 Interview Lab" }).click();
  await page.getByRole("link", { name: "开始对比" }).click();
  await expect(page.locator(".comparison-table")).toBeVisible();
  await expect(page.locator(".comparison-table th")).toHaveCount(3);
  await page.goto("/go/magic-resume");
  await expect(
    page.getByRole("heading", { name: "还差一个连接" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const database = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open("next-career-v1");
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        const events = await new Promise<unknown[]>((resolve) => {
          const request = database
            .transaction("events")
            .objectStore("events")
            .getAll();
          request.onsuccess = () => resolve(request.result);
        });
        database.close();
        return events.length;
      }),
    )
    .toBeGreaterThan(0);
});

test("首页模块发布、导航管理、演示目录分页和深色模式", async ({ page }) => {
  await page.goto("/admin");
  await page.getByLabel("设置本地访问口令").fill("test-secret-2026");
  await page.getByRole("button", { name: "创建并进入" }).click();
  await page.getByRole("link", { name: "首页编排", exact: true }).click();
  await page
    .locator(".module-row")
    .filter({ hasText: "求职阶段入口" })
    .getByRole("checkbox")
    .uncheck();
  await page.getByRole("button", { name: "发布编排" }).click();
  await expect(page.getByRole("status")).toHaveText("首页编排已生效");
  await page.getByRole("link", { name: "导航管理", exact: true }).click();
  await page.getByLabel("导航名称", { exact: true }).first().fill("首页发现");
  await page.locator(".navigation-row").first().getByRole("checkbox").check();
  await page.getByRole("button", { name: "保存导航", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("导航已保存");
  await page.getByRole("link", { name: "站点设置", exact: true }).click();
  await page.getByLabel("显示演示产品", { exact: true }).check();
  await page.getByRole("button", { name: "保存站点配置" }).click();
  await expect(page.getByRole("status")).toHaveText("站点设置已保存");
  await page.goto("/");
  await expect(page.locator("#stages")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "首页发现", exact: true }),
  ).toBeVisible();
  await page.goto("/products");
  await expect(page.locator(".product-card")).toHaveCount(9);
  await page.goto("/products?page=3");
  await expect(page.locator(".product-card")).toHaveCount(4);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "切换明暗主题" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({
    path: "test-results/catalog-dark.png",
    fullPage: true,
  });
  await page.goto("/");
  await page.screenshot({ path: "test-results/comic-home-dark.png" });
});
