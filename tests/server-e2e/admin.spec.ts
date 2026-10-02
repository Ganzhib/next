import { test, expect } from "@playwright/test";
test("超级管理员通过后台新增、停用并删除运营账号", async ({ page }) => {
  await page.goto("/admin/users");
  await page.getByLabel("管理员账号").fill("test-owner");
  await page.getByLabel("登录密码").fill("test-owner-password-123!");
  await page.getByRole("button", { name: "进入运营后台" }).click();
  await page.getByRole("button", { name: "新增管理员" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("账号", { exact: true }).fill("browser-editor");
  await dialog.getByLabel("显示名称").fill("浏览器运营");
  await dialog
    .getByLabel("密码", { exact: true })
    .fill("browser-editor-password-123!");
  await dialog.getByRole("button", { name: "保存账号" }).click();
  await expect(dialog).not.toBeVisible();
  const row = page
    .locator(".setting-row")
    .filter({ hasText: "@browser-editor" });
  await expect(row).toContainText("可登录");
  await row.getByRole("button", { name: "编辑" }).click();
  await dialog.getByLabel("停用账号").check();
  await dialog.getByRole("button", { name: "保存账号" }).click();
  await expect(row).toContainText("已停用");
  page.once("dialog", (d) => d.accept());
  await row.getByRole("button", { name: "删除 browser-editor" }).click();
  await expect(row).toHaveCount(0);
});
test("真实后台登录、宣传页草稿隔离、发布跨浏览器可见、首页配置", async ({
  page,
  browser,
}) => {
  await page.goto("/admin");
  await page.getByLabel("管理员账号").fill("test-owner");
  await page.getByLabel("登录密码").fill("test-owner-password-123!");
  await page.getByRole("button", { name: "进入运营后台" }).click();
  await expect(page.getByText("服务器数据", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "宣传页面", exact: true }).click();
  await page.getByRole("link", { name: "新建宣传页" }).click();
  await page.getByLabel("页面标题", { exact: true }).fill("校园图文测试");
  await page.getByLabel("链接标识").fill("campus-browser-test");
  await page.getByLabel("页面摘要").fill("从一个好问题，开始新的探索。");
  await page.getByLabel("使用现有插画").selectOption({ index: 1 });
  await page.getByRole("button", { name: "添加图文段落" }).click();
  await page.getByLabel("段落标题", { exact: true }).fill("给想法一个开始");
  await page
    .getByLabel("正文", { exact: true })
    .fill("这段图文通过数据库发布。");
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "校园图文测试" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/backend-promotion-preview.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "保存草稿", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/pages$/);
  const context = await browser.newContext();
  const visitor = await context.newPage();
  await visitor.goto("http://127.0.0.1:5180/p/campus-browser-test");
  await expect(visitor.getByText("页面尚未发布或已下线")).toBeVisible();
  await page.getByRole("link", { name: "编辑", exact: true }).click();
  await page.getByRole("button", { name: "发布页面", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/pages$/);
  await visitor.reload();
  await expect(
    visitor.getByRole("heading", { name: "校园图文测试" }),
  ).toBeVisible();
  await expect(visitor.getByText("这段图文通过数据库发布。")).toBeVisible();
  await page.getByRole("link", { name: "首页图文", exact: true }).click();
  await page
    .getByLabel("校园区标题", { exact: true })
    .fill("在校园，探索更多可能。");
  await page.getByRole("button", { name: "发布首页图文" }).click();
  await expect(page.getByRole("status")).toContainText("首页图文已发布");
  await visitor.goto("http://127.0.0.1:5180/");
  await expect(
    visitor.getByRole("heading", { name: "在校园，探索更多可能。" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("校园区标题", { exact: true })).toHaveValue(
    "在校园，探索更多可能。",
  );
  await page
    .getByLabel("校园区标题", { exact: true })
    .fill("在学校，也有自己的下一程。");
  await page.getByRole("button", { name: "发布首页图文" }).click();
  await page.getByRole("link", { name: "宣传页面", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "删除 校园图文测试" }).click();
  await expect(page.getByText("第一张宣传页，从一个主题开始。")).toBeVisible();
  await page.getByRole("button", { name: "锁定后台" }).click();
  await expect(page.getByLabel("管理员账号")).toBeVisible();
  await context.close();
});
