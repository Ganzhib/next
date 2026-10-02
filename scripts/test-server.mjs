import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
if (existsSync(".env")) process.loadEnvFile(".env");
if (!process.env.DATABASE_URL) throw new Error("缺少测试数据库连接");
const connection = new URL(process.env.DATABASE_URL);
connection.pathname = "/next_test";
const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", "tests/server.test.ts"],
  {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: connection.toString() },
  },
);
process.exit(result.status ?? 1);
