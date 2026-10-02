import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { PoolClient } from "pg";
import { pool, transaction } from "./db.js";
import {
  authenticate,
  ownerOnly,
  cookieName,
  secureCookie,
  token,
  digest,
  hashPassword,
  verifyPassword,
  sessionToken,
} from "./security.js";
import { backupSchema } from "../src/storage/validation.js";
import { promotionSchema } from "../src/domain/content.js";

const tables = backupSchema.innerType().shape.tables.shape;
const editable = [
  "products",
  "taxonomies",
  "collections",
  "placements",
  "settings",
  "records",
  "notices",
  "submissions",
  "promotions",
];
const readable = [...editable, "audit", "events"];
const publicStores = [
  "products",
  "taxonomies",
  "collections",
  "placements",
  "settings",
];
const idSchema = z.string().min(1).max(100);
const accountInput = z.object({
  username: z.string().regex(/^[a-zA-Z0-9_.-]{3,64}$/),
  name: z.string().min(1).max(80),
  role: z.enum(["owner", "editor"]),
  disabled: z.boolean(),
  password: z.string().min(14).max(128).optional(),
});
const accountColumns =
  'id,username,name,role,disabled,created_at AS "createdAt"';
const origin = process.env.APP_ORIGIN || "http://127.0.0.1:5173";
export const app = express();
app.disable("x-powered-by");
// Nginx 是唯一入口；容器端口只监听宿主机回环地址。
app.set("trust proxy", "loopback, linklocal, uniquelocal");
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use("/api", (req, res, next) => {
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    req.headers.origin !== origin
  ) {
    res.status(403).json({ message: "不允许跨站写入" });
    return;
  }
  next();
});
app.get("/api/health", async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true });
});

async function audit(
  db: PoolClient,
  actor: string,
  action: string,
  target: string,
) {
  const value = {
    id: randomUUID(),
    actor,
    action,
    target,
    occurredAt: new Date().toISOString(),
  };
  await db.query("INSERT INTO documents(store,id,data) VALUES($1,$2,$3)", [
    "audit",
    value.id,
    value,
  ]);
}
async function put(db: PoolClient, store: string, raw: unknown) {
  const schema =
    store === "promotions"
      ? promotionSchema
      : tables[store as keyof typeof tables]?.element;
  if (!schema || !editable.includes(store)) throw new Error("INVALID_STORE");
  const value = schema.parse(raw) as Record<string, unknown> & { id: string };
  idSchema.parse(value.id);
  if (store === "settings") {
    if (value.id !== "site") throw new Error("INVALID_STORE");
    value.adminPinHash = "";
    value.adminSalt = "";
  }
  if (store === "products" || store === "promotions")
    value.updatedAt = new Date().toISOString();
  await db.query(
    "INSERT INTO documents(store,id,data) VALUES($1,$2,$3) ON CONFLICT(store,id) DO UPDATE SET data=excluded.data,updated_at=now()",
    [store, value.id, value],
  );
  return value;
}
async function published() {
  const rows = await pool.query(
    "SELECT store,data FROM documents WHERE store=ANY($1)",
    [publicStores],
  );
  const result: Record<string, Record<string, unknown>[]> = Object.fromEntries(
    publicStores.map((s) => [s, []]),
  );
  const settings = rows.rows.find((r) => r.store === "settings")?.data;
  for (const { store, data } of rows.rows) {
    if (
      ["products", "collections", "promotions"].includes(store) &&
      data.status !== "published"
    )
      continue;
    if (store === "products" && data.demo && !settings?.showDemos) continue;
    if (store === "placements" && !data.enabled) continue;
    if (store === "settings") {
      data.adminPinHash = "";
      data.adminSalt = "";
    }
    result[store].push(data);
  }
  return result;
}
app.get("/api/content", async (_req, res) => res.json(await published()));
app.get("/api/pages/:slug", async (req, res) => {
  const row = await pool.query(
    "SELECT data FROM documents WHERE store='promotions' AND data->>'slug'=$1 AND data->>'status'='published'",
    [req.params.slug],
  );
  if (!row.rowCount) {
    res.status(404).json({ message: "页面尚未发布或已下线" });
    return;
  }
  res.json(row.rows[0].data);
});
const visitorLimit = rateLimit({
  windowMs: 60000,
  limit: 120,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "提交过于频繁，请稍后再试" },
});
app.post("/api/events", visitorLimit, async (req, res) => {
  const value = z
    .object({
      name: z.string().min(1).max(80),
      sessionId: idSchema,
      actorId: idSchema,
      path: z.string().max(300),
      productId: idSchema.optional(),
      collectionId: idSchema.optional(),
      placement: z.string().max(100).optional(),
      position: z.number().optional(),
      query: z.string().max(200).optional(),
      launchId: idSchema.optional(),
    })
    .parse(req.body);
  const event = {
    ...value,
    id: randomUUID(),
    occurredAt: new Date().toISOString(),
  };
  await pool.query("INSERT INTO documents(store,id,data) VALUES($1,$2,$3)", [
    "events",
    event.id,
    event,
  ]);
  res.status(202).json({ ok: true });
});
app.post(
  "/api/submissions",
  rateLimit({
    windowMs: 3600000,
    limit: 12,
    legacyHeaders: false,
    standardHeaders: "draft-8",
  }),
  async (req, res) => {
    const value = z
      .object({
        kind: z.enum(["product", "feedback", "claim"]),
        name: z.string().min(1).max(100),
        url: z.string().max(2048),
        description: z.string().min(1).max(5000),
      })
      .parse(req.body);
    const submission = {
      ...value,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      status: "pending",
    };
    await pool.query("INSERT INTO documents(store,id,data) VALUES($1,$2,$3)", [
      "submissions",
      submission.id,
      submission,
    ]);
    res.status(201).json({ ok: true });
  },
);

app.post(
  "/api/auth/login",
  rateLimit({
    windowMs: 15 * 60000,
    limit: 12,
    legacyHeaders: false,
    standardHeaders: "draft-8",
    message: { message: "登录尝试过多，请 15 分钟后再试" },
  }),
  async (req, res) => {
    const input = z
      .object({
        username: z.string().min(1).max(64),
        password: z.string().min(1).max(128),
      })
      .parse(req.body);
    const user = await pool.query("SELECT * FROM admins WHERE username=$1", [
      input.username,
    ]);
    // 不存在的账号也执行相同成本的哈希运算，避免明显的时序枚举。
    const valid = await verifyPassword(
      input.password,
      user.rows[0]?.password_hash ??
        "00000000000000000000000000000000:" + "00".repeat(64),
    );
    if (!valid || !user.rowCount || user.rows[0].disabled) {
      res.status(401).json({ message: "账号或密码不正确" });
      return;
    }
    const secret = token(),
      csrf = token();
    await transaction(async (db) => {
      await db.query("DELETE FROM sessions WHERE expires_at<now()");
      await db.query(
        "INSERT INTO sessions(hash,admin_id,csrf,expires_at) VALUES($1,$2,$3,now()+interval '8 hours')",
        [digest(secret), user.rows[0].id, csrf],
      );
      await audit(db, user.rows[0].username, "登录", "管理员后台");
    });
    res.cookie(cookieName, secret, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: "strict",
      maxAge: 8 * 3600000,
      path: "/api",
    });
    res.json({ ok: true });
  },
);
app.get("/api/auth/session", authenticate, (_req, res) =>
  res.json(res.locals.admin),
);
app.post("/api/auth/logout", authenticate, async (req, res) => {
  await pool.query("DELETE FROM sessions WHERE hash=$1", [
    digest(sessionToken(req)),
  ]);
  res.clearCookie(cookieName, {
    path: "/api",
    httpOnly: true,
    secure: secureCookie,
    sameSite: "strict",
  });
  res.json({ ok: true });
});
app.use("/api/admin", authenticate);
app.get("/api/admin/accounts", ownerOnly, async (_req, res) =>
  res.json(
    (
      await pool.query(
        `SELECT ${accountColumns} FROM admins ORDER BY created_at`,
      )
    ).rows,
  ),
);
app.post("/api/admin/accounts", ownerOnly, async (req, res) => {
  const input = accountInput.parse(req.body);
  if (!input.password) {
    res.status(400).json({ message: "创建账号需要至少 14 位密码" });
    return;
  }
  const hash = await hashPassword(input.password);
  await transaction(async (db) => {
    await db.query(
      "INSERT INTO admins(id,username,name,role,disabled,password_hash) VALUES($1,$2,$3,$4,$5,$6)",
      [
        randomUUID(),
        input.username,
        input.name,
        input.role,
        input.disabled,
        hash,
      ],
    );
    await audit(db, res.locals.admin.username, "创建管理员", input.username);
  });
  res.status(201).json({ ok: true });
});
app.put("/api/admin/accounts/:id", ownerOnly, async (req, res) => {
  const id = z.string().uuid().parse(req.params.id),
    input = accountInput.parse(req.body);
  const hash = input.password ? await hashPassword(input.password) : null;
  await transaction(async (db) => {
    await db.query("LOCK TABLE admins IN EXCLUSIVE MODE");
    const target = await db.query("SELECT * FROM admins WHERE id=$1", [id]);
    if (!target.rowCount) throw new Error("NOT_FOUND");
    const owners = await db.query(
      "SELECT count(*) FROM admins WHERE role='owner' AND NOT disabled",
    );
    if (
      target.rows[0].role === "owner" &&
      !target.rows[0].disabled &&
      (input.disabled || input.role !== "owner") &&
      Number(owners.rows[0].count) <= 1
    )
      throw new Error("LAST_OWNER");
    await db.query(
      "UPDATE admins SET username=$2,name=$3,role=$4,disabled=$5,password_hash=COALESCE($6,password_hash) WHERE id=$1",
      [id, input.username, input.name, input.role, input.disabled, hash],
    );
    await db.query("DELETE FROM sessions WHERE admin_id=$1", [id]);
    await audit(
      db,
      res.locals.admin.username,
      "修改管理员并撤销旧会话",
      input.username,
    );
  });
  res.json({ ok: true });
});
app.delete("/api/admin/accounts/:id", ownerOnly, async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  await transaction(async (db) => {
    await db.query("LOCK TABLE admins IN EXCLUSIVE MODE");
    const target = await db.query("SELECT * FROM admins WHERE id=$1", [id]);
    if (!target.rowCount) throw new Error("NOT_FOUND");
    if (id === res.locals.admin.id) throw new Error("SELF_DELETE");
    const count = await db.query(
      "SELECT count(*) FROM admins WHERE role='owner' AND NOT disabled",
    );
    if (
      target.rows[0].role === "owner" &&
      !target.rows[0].disabled &&
      Number(count.rows[0].count) <= 1
    )
      throw new Error("LAST_OWNER");
    await db.query("DELETE FROM admins WHERE id=$1", [id]);
    await audit(
      db,
      res.locals.admin.username,
      "删除管理员",
      target.rows[0].username,
    );
  });
  res.json({ ok: true });
});
app.get("/api/admin/data/:store", async (req, res) => {
  const store = String(req.params.store);
  if (!readable.includes(store)) {
    res.status(404).json({ message: "数据集合不存在" });
    return;
  }
  // 分析事件保留 90 天；只读取最近 20000 条，避免无限响应。
  const result = await pool.query(
    "SELECT data FROM documents WHERE store=$1 ORDER BY updated_at DESC LIMIT $2",
    [store, store === "events" ? 20000 : 10000],
  );
  res.json(result.rows.map((r) => r.data));
});
app.post("/api/admin/batch", async (req, res) => {
  const ops = z
    .array(
      z.object({
        store: z.enum(editable as [string, ...string[]]),
        value: z.unknown(),
      }),
    )
    .min(1)
    .max(100)
    .parse(req.body);
  await transaction(async (db) => {
    for (const op of ops) {
      const value = await put(db, op.store, op.value);
      await audit(
        db,
        res.locals.admin.username,
        "保存",
        `${op.store}/${value.id}`,
      );
    }
  });
  res.json({ ok: true });
});
app.put("/api/admin/pages/:id", async (req, res) => {
  const { page, expectedUpdatedAt } = z
    .object({ page: promotionSchema, expectedUpdatedAt: z.string().nullable() })
    .parse(req.body);
  if (page.id !== req.params.id) throw new Error("INVALID_STORE");
  await transaction(async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `page:${page.id}`,
    ]);
    const previous = await db.query(
      "SELECT data FROM documents WHERE store='promotions' AND id=$1",
      [page.id],
    );
    if ((previous.rows[0]?.data.updatedAt ?? null) !== expectedUpdatedAt)
      throw new Error("CONFLICT");
    await put(db, "promotions", page);
    await audit(
      db,
      res.locals.admin.username,
      page.status === "published" ? "发布宣传页" : "保存宣传页草稿",
      page.slug,
    );
  });
  res.json({ ok: true });
});
app.delete("/api/admin/data/:store/:id", async (req, res) => {
  const store = String(req.params.store),
    id = idSchema.parse(req.params.id);
  if (!editable.includes(store) || store === "settings")
    throw new Error("INVALID_STORE");
  await transaction(async (db) => {
    await db.query("DELETE FROM documents WHERE store=$1 AND id=$2", [
      store,
      id,
    ]);
    await audit(db, res.locals.admin.username, "删除", `${store}/${id}`);
  });
  res.json({ ok: true });
});
app.get("/api/admin/export", ownerOnly, async (_req, res) => {
  const rows = await pool.query(
    "SELECT store,data FROM documents WHERE store NOT IN ('audit','events')",
  );
  const output: Record<string, unknown[]> = Object.fromEntries(
    Object.keys(tables).map((s) => [s, []]),
  );
  for (const row of rows.rows) (output[row.store] ??= []).push(row.data);
  res.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    tables: output,
  });
});
app.post("/api/admin/import", ownerOnly, async (req, res) => {
  const backup = backupSchema.parse(req.body);
  // 旧 IndexedDB 数据迁移：合并同 ID 内容，不删除服务器其他记录，不导入本地权限、隐私或伪造审计。
  await transaction(async (db) => {
    for (const store of [
      "products",
      "taxonomies",
      "collections",
      "placements",
      "settings",
      "records",
      "notices",
    ] as const)
      for (const value of backup.tables[store]) await put(db, store, value);
    const pages = z
      .array(promotionSchema)
      .default([])
      .parse(req.body?.tables?.promotions);
    for (const page of pages) await put(db, "promotions", page);
    await audit(db, res.locals.admin.username, "合并导入内容备份", "站点内容");
  });
  res.json({ ok: true });
});
app.use("/api", (_req, res) => res.status(404).json({ message: "接口不存在" }));
app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        message: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("；"),
      });
      return;
    }
    const code = (error as { code?: string }).code,
      message = (error as Error).message;
    const errors: Record<string, [number, string]> = {
      INVALID_STORE: [400, "不允许操作此数据集合"],
      NOT_FOUND: [404, "记录不存在"],
      LAST_OWNER: [409, "必须保留至少一位启用的超级管理员"],
      SELF_DELETE: [409, "不能删除正在使用的账号"],
      CONFLICT: [409, "页面已被其他管理员修改，请重新载入后编辑"],
    };
    if (code === "23505") {
      res.status(409).json({ message: "账号或页面标识已存在" });
      return;
    }
    if (errors[message]) {
      res.status(errors[message][0]).json({ message: errors[message][1] });
      return;
    }
    if ((error as { type?: string }).type === "entity.parse.failed") {
      res.status(400).json({ message: "请求不是有效 JSON" });
      return;
    }
    if ((error as { status?: number }).status === 413) {
      res.status(413).json({ message: "内容超出 2 MB 限制" });
      return;
    }
    console.error("API 请求失败", { name: (error as Error).name, code });
    res.status(500).json({ message: "服务暂时不可用，请稍后重试" });
  },
);

export async function maintain() {
  await transaction(async (db) => {
    await db.query(
      "DELETE FROM sessions WHERE expires_at<now(); DELETE FROM documents WHERE store='events' AND updated_at<now()-interval '90 days'",
    );
    const due = await db.query(
      "SELECT id,data FROM documents WHERE store='products' AND data->>'status'='scheduled' FOR UPDATE SKIP LOCKED",
    );
    for (const row of due.rows)
      if (
        row.data.scheduledAt &&
        Date.parse(row.data.scheduledAt) <= Date.now()
      ) {
        await put(db, "products", { ...row.data, status: "published" });
        await audit(db, "系统", "定时发布", row.id);
      }
  });
}
