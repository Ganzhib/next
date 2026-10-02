import { app, maintain } from "./app.js";
import { pool } from "./db.js";
if (!process.env.DATABASE_URL) throw new Error("缺少 DATABASE_URL");
if (
  process.env.NODE_ENV === "production" &&
  !process.env.APP_ORIGIN?.startsWith("https://")
)
  throw new Error("生产环境必须配置 HTTPS APP_ORIGIN");
async function start() {
  await pool.query("SELECT version FROM schema_migrations LIMIT 1");
  const server = app.listen(Number(process.env.PORT || 3001), "0.0.0.0", () =>
    console.log("NEXT API 已启动"),
  );
  const task = () =>
    maintain().catch(() => console.error("后台维护失败，请检查数据库"));
  void task();
  const interval = setInterval(task, 60000);
  for (const signal of ["SIGTERM", "SIGINT"])
    process.on(signal, () => {
      clearInterval(interval);
      server.close(() => void pool.end().then(() => process.exit(0)));
      setTimeout(() => process.exit(1), 10000).unref();
    });
}
void start().catch(() => {
  console.error("API 启动失败，请检查数据库与迁移");
  process.exit(1);
});
