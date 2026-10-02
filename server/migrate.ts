import { transaction } from "./db.js";
import { seed } from "../src/domain/seed.js";
import type { Repository } from "../src/storage/repository.js";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";

export async function migrate() {
  await transaction(async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(78002026)");
    await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS admins (id uuid PRIMARY KEY, username text NOT NULL UNIQUE, name text NOT NULL, role text NOT NULL CHECK(role IN ('owner','editor')), disabled boolean NOT NULL DEFAULT false, password_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS sessions (hash text PRIMARY KEY, admin_id uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE, csrf text NOT NULL, expires_at timestamptz NOT NULL);
      CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
      CREATE TABLE IF NOT EXISTS documents (store text NOT NULL, id text NOT NULL, data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(store,id));
      CREATE UNIQUE INDEX IF NOT EXISTS documents_slug ON documents (store,(data->>'slug')) WHERE store IN ('products','collections','promotions');
      CREATE INDEX IF NOT EXISTS documents_recent ON documents(store,updated_at DESC);
      INSERT INTO schema_migrations(version) VALUES(1) ON CONFLICT DO NOTHING;`);
    // 仅首次建立空库时导入随代码提供的内容，绝不覆盖运营已修改的记录。
    const existing = await db.query(
      "SELECT 1 FROM documents WHERE store='settings' AND id='site'",
    );
    if (!existing.rowCount) {
      const adapter = {
        get: async () => undefined,
        batch: async (
          operations: { store: string; value: { id: string } }[],
        ) => {
          for (const op of operations.filter((o) => o.store !== "profiles")) {
            await db.query(
              "INSERT INTO documents(store,id,data) VALUES($1,$2,$3)",
              [op.store, op.value.id, op.value],
            );
          }
        },
      } as unknown as Repository;
      await seed(adapter);
    }
  });
}
export function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export async function bootstrap() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (
    !username ||
    !/^[a-zA-Z0-9_.-]{3,64}$/.test(username) ||
    !password ||
    password.length < 14
  )
    throw new Error(
      "请通过 ADMIN_USERNAME 和 ADMIN_PASSWORD 提供账号及至少 14 位密码",
    );
  await transaction(async (db) => {
    await db.query("LOCK TABLE admins IN EXCLUSIVE MODE");
    const count = await db.query("SELECT count(*) FROM admins");
    if (Number(count.rows[0].count))
      throw new Error(
        "已有管理员，禁止重复初始化。请登录后台管理账号或执行密码重置命令。",
      );
    await db.query(
      "INSERT INTO admins(id,username,name,role,password_hash) VALUES($1,$2,$3,$4,$5)",
      [randomUUID(), username, "站点管理员", "owner", passwordHash(password)],
    );
  });
}
