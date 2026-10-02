import { migrate, bootstrap } from "./migrate.js";
import { pool, transaction } from "./db.js";
import { hashPassword } from "./security.js";
import { randomUUID } from "node:crypto";
async function main() {
  const command = process.argv[2];
  if (command === "migrate") {
    await migrate();
    console.log("数据库迁移完成");
  } else if (command === "bootstrap") {
    await migrate();
    await bootstrap();
    console.log("首位管理员已建立，密码未输出");
  } else if (command === "reset-password") {
    const username = process.env.ADMIN_USERNAME,
      password = process.env.ADMIN_PASSWORD;
    if (!username || !password || password.length < 14 || password.length > 128)
      throw new Error("必须设置 ADMIN_USERNAME 与 14–128 位 ADMIN_PASSWORD");
    const hash = await hashPassword(password);
    await transaction(async (db) => {
      const result = await db.query(
        "UPDATE admins SET password_hash=$2 WHERE username=$1 RETURNING id",
        [username, hash],
      );
      if (!result.rowCount) throw new Error("管理员不存在");
      await db.query("DELETE FROM sessions WHERE admin_id=$1", [
        result.rows[0].id,
      ]);
      const id = randomUUID();
      await db.query(
        "INSERT INTO documents(store,id,data) VALUES('audit',$1,$2)",
        [
          id,
          {
            id,
            actor: "服务器维护",
            action: "重置管理员密码",
            target: username,
            occurredAt: new Date().toISOString(),
          },
        ],
      );
    });
    console.log("密码已重置，旧会话已撤销");
  } else throw new Error("可用命令：migrate / bootstrap / reset-password");
}
void main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
