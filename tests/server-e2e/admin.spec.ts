import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.getByLabel("管理员账号").fill("test-owner");
  await page.getByLabel("登录密码").fill("test-owner-password-123!");
  await page.getByRole("button", { name: "进入运营后台" }).click();
  await expect(page.locator(".sidebar-bottom")).toContainText(
    "服务端数据已连接",
  );
}

test("超级管理员通过后台新增、停用并删除运营账号", async ({
  page,
}, testInfo) => {
  const username = `browser-editor-${testInfo.workerIndex}-${Date.now()}`;
  await page.goto("/admin/users");
  await login(page);
  await page.getByRole("button", { name: "新增管理员" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("账号", { exact: true }).fill(username);
  await dialog.getByLabel("显示名称").fill("浏览器运营");
  await dialog
    .getByLabel("密码", { exact: true })
    .fill("browser-editor-password-123!");
  await dialog.getByRole("button", { name: "保存账号" }).click();
  await expect(dialog).not.toBeVisible();
  const row = page.locator(".setting-row").filter({ hasText: `@${username}` });
  await expect(row).toContainText("可登录");
  await row.getByRole("button", { name: "编辑" }).click();
  await dialog.getByLabel("停用账号").check();
  await dialog.getByRole("button", { name: "保存账号" }).click();
  await expect(row).toContainText("已停用");
  page.once("dialog", (d) => d.accept());
  await row.getByRole("button", { name: `删除 ${username}` }).click();
  await expect(row).toHaveCount(0);
});

test("真实后台登录、工具集合发布并跨浏览器可见", async ({ page, browser }) => {
  await page.goto("/admin/tools");
  await login(page);
  await expect(page.locator(".admin-nav-group a")).toHaveCount(4);
  await expect(
    page.getByRole("heading", { name: "工具集合", exact: true }),
  ).toBeVisible();

  const firstCard = page.locator(".tool-config-card").first();
  const nameInput = firstCard.getByLabel("工具名称");
  const originalName = await nameInput.inputValue();
  const publishedName = `服务端工具测试-${Date.now()}`;

  const context = await browser.newContext();
  const visitor = await context.newPage();
  await visitor.goto("http://127.0.0.1:5180/");
  await expect(
    visitor.getByRole("heading", { name: originalName }),
  ).toBeVisible();

  await nameInput.fill(publishedName);
  await page.getByRole("button", { name: "发布工具集合" }).click();
  await expect(page.getByRole("status")).toContainText("工具集合已发布");
  await visitor.reload();
  await expect(
    visitor.getByRole("heading", { name: publishedName }),
  ).toBeVisible();

  await nameInput.fill(originalName);
  await page.getByRole("button", { name: "发布工具集合" }).click();
  await expect(page.getByRole("status")).toContainText("工具集合已发布");
  await visitor.reload();
  await expect(
    visitor.getByRole("heading", { name: originalName }),
  ).toBeVisible();

  await page.getByRole("button", { name: "锁定后台" }).click();
  await expect(page.getByLabel("管理员账号")).toBeVisible();
  await context.close();
});
