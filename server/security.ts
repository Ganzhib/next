import {
  randomBytes,
  createHash,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import type { Request, Response, NextFunction } from "express";
import { pool } from "./db.js";
const scrypt = promisify(scryptCallback);
export const token = () => randomBytes(32).toString("hex");
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const cookieName = "next_admin";
export const secureCookie = process.env.NODE_ENV === "production";
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${((await scrypt(password, salt, 64)) as Buffer).toString("hex")}`;
}
export async function verifyPassword(password: string, hash: string) {
  const [salt, encoded] = hash.split(":");
  const computed = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(encoded, "hex");
  return (
    expected.length === computed.length && timingSafeEqual(expected, computed)
  );
}
export function sessionToken(req: Request) {
  return (
    req.headers.cookie
      ?.split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith(cookieName + "="))
      ?.slice(cookieName.length + 1) ?? ""
  );
}
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const session = await pool.query(
    `SELECT a.id, a.username, a.name, a.role, a.disabled, a.created_at AS "createdAt", s.csrf FROM sessions s JOIN admins a ON a.id=s.admin_id WHERE s.hash=$1 AND s.expires_at>now() AND NOT a.disabled`,
    [digest(sessionToken(req))],
  );
  if (!session.rowCount) {
    res.status(401).json({ message: "请登录管理员账号" });
    return;
  }
  res.locals.admin = session.rows[0];
  if (
    !["GET", "HEAD"].includes(req.method) &&
    req.headers["x-csrf-token"] !== session.rows[0].csrf
  ) {
    res.status(403).json({ message: "会话校验失败，请刷新后重试" });
    return;
  }
  next();
}
export function ownerOnly(_req: Request, res: Response, next: NextFunction) {
  if (res.locals.admin.role !== "owner") {
    res.status(403).json({ message: "此操作仅限超级管理员" });
    return;
  }
  next();
}
