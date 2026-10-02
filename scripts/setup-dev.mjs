import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
// 只生成不存在的本机配置，永不覆盖已有密码。
if (!existsSync(".env")) {
  const db = randomBytes(24).toString("hex"),
    password = randomBytes(20).toString("base64url");
  writeFileSync(
    ".env",
    `POSTGRES_PASSWORD=${db}\nDATABASE_URL=postgresql://next:${db}@127.0.0.1:54329/next\nAPP_ORIGIN=http://127.0.0.1:5173\nPORT=3001\nVITE_STORAGE_MODE=server\nADMIN_USERNAME=admin\nADMIN_PASSWORD=${password}\n`,
    { mode: 0o600, flag: "wx" },
  );
}
const result = spawnSync(
  "docker",
  [
    "compose",
    "--env-file",
    ".env",
    "-f",
    "deploy/compose.dev.yml",
    "up",
    "-d",
    "--wait",
  ],
  { stdio: "inherit" },
);
if (result.status !== 0) process.exit(result.status || 1);
console.log(
  "本机数据库已启动；.env 已被 Git 忽略。请执行 npm run db:migrate 和 npm run admin:create。",
);
