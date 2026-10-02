import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
// 必须提供专门的测试数据库；不清空开发或生产数据库。
if (!process.env.DATABASE_URL?.includes("/next_test"))
  throw new Error("测试仅允许 next_test 数据库");
process.env.APP_ORIGIN = "http://127.0.0.1:5173";
process.env.ADMIN_USERNAME = "test-owner";
process.env.ADMIN_PASSWORD = "test-owner-password-123!";
const { app } = await import("../server/app.js");
const { pool } = await import("../server/db.js");
const { migrate, bootstrap } = await import("../server/migrate.js");
let server: Server,
  base = "",
  cookie = "",
  csrf = "";
async function request(
  path: string,
  method = "GET",
  body?: unknown,
  auth = true,
  headers: Record<string, string> = {},
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: process.env.APP_ORIGIN!,
      ...(auth ? { Cookie: cookie, "X-CSRF-Token": csrf } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { response, status: response.status, data: await response.json() };
}
before(async () => {
  await pool.query("DROP SCHEMA public CASCADE;CREATE SCHEMA public");
  await migrate();
  await bootstrap();
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.on("listening", r));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
after(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  await pool.end();
});
test("未登录和跨站写入被拒绝，公开内容不包含草稿和管理信息", async () => {
  assert.equal((await request("/api/admin/data/products")).status, 401);
  assert.equal(
    (
      await request("/api/admin/batch", "POST", [], false, {
        Origin: "https://evil.example",
      })
    ).status,
    403,
  );
  const content = (await request("/api/content")).data;
  assert.ok(content.products.length > 0);
  assert.ok(
    content.products.every(
      (p: { status: string; demo: boolean }) =>
        p.status === "published" && !p.demo,
    ),
  );
  assert.equal(content.settings[0].adminPinHash, "");
  assert.equal(content.audit, undefined);
});
test("登录、安全 Cookie、CSRF 与真实管理员会话", async () => {
  assert.equal(
    (
      await request(
        "/api/auth/login",
        "POST",
        { username: "test-owner", password: "wrong" },
        false,
      )
    ).status,
    401,
  );
  const login = await request(
    "/api/auth/login",
    "POST",
    { username: "test-owner", password: "test-owner-password-123!" },
    false,
  );
  assert.equal(login.status, 200);
  const header = login.response.headers.get("set-cookie")!;
  assert.match(header, /HttpOnly/);
  assert.match(header, /SameSite=Strict/);
  cookie = header.split(";")[0];
  const session = await request("/api/auth/session");
  csrf = session.data.csrf;
  assert.equal(session.data.role, "owner");
  assert.equal(session.data.password_hash, undefined);
  assert.equal(
    (
      await request("/api/admin/batch", "POST", [], true, {
        "X-CSRF-Token": "wrong",
      })
    ).status,
    403,
  );
});
const page = {
  id: "test-page",
  slug: "test-page",
  title: "校园新方向",
  description: "真实数据库测试",
  eyebrow: "CAMPUS",
  image: "",
  imageAlt: "",
  status: "draft",
  sections: [],
  ctaLabel: "看看工具",
  ctaUrl: "/products",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
test("宣传页创建、草稿隔离、发布、冲突保护、下线、删除完整闭环", async () => {
  assert.equal(
    (
      await request("/api/admin/pages/test-page", "PUT", {
        page,
        expectedUpdatedAt: null,
      })
    ).status,
    200,
  );
  assert.equal(
    (await request("/api/pages/test-page", "GET", undefined, false)).status,
    404,
  );
  let stored = (await request("/api/admin/data/promotions")).data[0];
  assert.equal(
    (
      await request("/api/admin/pages/test-page", "PUT", {
        page: { ...stored, status: "published" },
        expectedUpdatedAt: stored.updatedAt,
      })
    ).status,
    200,
  );
  assert.equal(
    (await request("/api/pages/test-page", "GET", undefined, false)).data.title,
    page.title,
  );
  assert.equal(
    (
      await request("/api/admin/pages/test-page", "PUT", {
        page: stored,
        expectedUpdatedAt: stored.updatedAt,
      })
    ).status,
    409,
  );
  stored = (await request("/api/admin/data/promotions")).data[0];
  assert.equal(
    (
      await request("/api/admin/pages/test-page", "PUT", {
        page: { ...stored, status: "draft" },
        expectedUpdatedAt: stored.updatedAt,
      })
    ).status,
    200,
  );
  assert.equal(
    (await request("/api/pages/test-page", "GET", undefined, false)).status,
    404,
  );
  assert.equal(
    (await request("/api/admin/data/promotions/test-page", "DELETE")).status,
    200,
  );
});
test("服务端字段校验、危险链接与批量事务回滚", async () => {
  assert.equal(
    (
      await request("/api/admin/pages/test-page", "PUT", {
        page: { ...page, ctaUrl: "javascript:alert(1)" },
        expectedUpdatedAt: null,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/api/admin/batch", "POST", [
        {
          store: "taxonomies",
          value: {
            id: "rollback-test",
            name: "test",
            kind: "category",
            description: "",
            icon: "book",
            order: 1,
          },
        },
        { store: "products", value: { id: "broken" } },
      ])
    ).status,
    400,
  );
  assert.equal(
    (await request("/api/admin/data/taxonomies")).data.some(
      (r: { id: string }) => r.id === "rollback-test",
    ),
    false,
  );
  assert.equal(
    (
      await request("/api/admin/batch", "POST", [
        { store: "audit", value: { id: "forged" } },
      ])
    ).status,
    400,
  );
});
test("首页配置由服务器存储，公开浏览器可读取", async () => {
  const settings = (await request("/api/admin/data/settings")).data[0];
  settings.tagline = "数据库同步测试";
  settings.homeContent = {
    introKicker: "校园",
    introTitle: "学习",
    introDescription: "工具",
    journeyTitle: "方向",
    campusTitle: "校园",
    contributionTitle: "反馈",
    cards: [
      {
        id: "career-prepare",
        title: "简历方向",
        description: "简历与作品集",
        image: "",
        alt: "",
        productIds: ["magic-resume", "interview-lab"],
      },
    ],
  };
  assert.equal(
    (
      await request("/api/admin/batch", "POST", [
        { store: "settings", value: settings },
      ])
    ).status,
    200,
  );
  assert.equal(
    (await request("/api/content", "GET", undefined, false)).data.settings[0]
      .tagline,
    "数据库同步测试",
  );
  assert.deepEqual(
    (await request("/api/content", "GET", undefined, false)).data.settings[0]
      .homeContent.cards[0].productIds,
    ["magic-resume", "interview-lab"],
  );
  // 不让此测试的人工关联影响后续浏览器测试使用的种子方向。
  delete settings.homeContent;
  await request("/api/admin/batch", "POST", [
    { store: "settings", value: settings },
  ]);
});
test("最后一位超级管理员保护，运营角色无账号权限，停用立即撤销会话", async () => {
  const owner = (await request("/api/auth/session")).data;
  assert.equal(
    (
      await request(`/api/admin/accounts/${owner.id}`, "PUT", {
        ...owner,
        disabled: true,
      })
    ).status,
    409,
  );
  assert.equal(
    (await request(`/api/admin/accounts/${owner.id}`, "DELETE")).status,
    409,
  );
  const editor = {
    username: "test-editor",
    name: "运营",
    role: "editor",
    disabled: false,
    password: "editor-password-123!",
  };
  assert.equal(
    (await request("/api/admin/accounts", "POST", editor)).status,
    201,
  );
  const accounts = (await request("/api/admin/accounts")).data;
  assert.ok(accounts.every((a: Record<string, unknown>) => !a.password_hash));
  const account = accounts.find(
    (a: AdminLike) => a.username === editor.username,
  );
  const login = await request(
    "/api/auth/login",
    "POST",
    { username: editor.username, password: editor.password },
    false,
  );
  const editorCookie = login.response.headers.get("set-cookie")!.split(";")[0];
  assert.equal(
    (
      await request("/api/admin/accounts", "GET", undefined, true, {
        Cookie: editorCookie,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request(`/api/admin/accounts/${account.id}`, "PUT", {
        ...editor,
        password: undefined,
        disabled: true,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request("/api/auth/session", "GET", undefined, true, {
        Cookie: editorCookie,
      })
    ).status,
    401,
  );
  assert.equal(
    (await request(`/api/admin/accounts/${account.id}`, "DELETE")).status,
    200,
  );
});
type AdminLike = { username: string };
test("服务端审计与访客反馈，退出后不能重用会话", async () => {
  const result = await request(
    "/api/submissions",
    "POST",
    { kind: "feedback", name: "访客", url: "", description: "数据库反馈测试" },
    false,
  );
  assert.equal(result.status, 201);
  const logs = (await request("/api/admin/data/audit")).data;
  assert.ok(logs.some((l: { action: string }) => l.action === "发布宣传页"));
  assert.ok(
    logs.every((l: { actor: string }) =>
      ["test-owner", "test-editor"].includes(l.actor),
    ),
  );
  assert.equal((await request("/api/auth/logout", "POST")).status, 200);
  assert.equal((await request("/api/admin/data/products")).status, 401);
});
