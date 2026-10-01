import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { IndexedDbRepository } from "../src/storage/indexed-db";
import { emptyProduct, seed, defaultProfile } from "../src/domain/seed";
import { safeTarget } from "../src/domain/security";

describe("IndexedDB 存储契约", () => {
  it("初始化、写入和重新打开数据库保留数据", async () => {
    const name = crypto.randomUUID();
    const repo = new IndexedDbRepository(name);
    await seed(repo);
    expect((await repo.list("products")).length).toBe(22);
    const p = { ...emptyProduct(), name: "测试工具", slug: "test-tool" };
    await repo.put("products", p);
    const reopened = new IndexedDbRepository(name);
    expect((await reopened.get("products", p.id))?.name).toBe("测试工具");
    await seed(reopened);
    expect((await reopened.list("products")).length).toBe(23);
  });
  it("备份可以恢复，无效导入不破坏原数据", async () => {
    const repo = new IndexedDbRepository(crypto.randomUUID());
    await seed(repo);
    const backup = await repo.exportData();
    await repo.remove("products", "resume");
    expect(await repo.get("products", "resume")).toBeUndefined();
    await repo.importData(backup);
    expect(await repo.get("products", "resume")).toBeDefined();
    const invalid = structuredClone(backup);
    invalid.tables.products[0].slug = "BAD SLUG";
    await expect(repo.importData(invalid)).rejects.toThrow();
    expect((await repo.list("products")).length).toBe(22);
  });
  it("删除个人数据保留产品目录", async () => {
    const repo = new IndexedDbRepository(crypto.randomUUID());
    await seed(repo);
    await repo.put("profiles", { ...defaultProfile(), favorites: ["resume"] });
    await repo.clearPersonalData();
    expect(await repo.get("profiles", "local")).toBeUndefined();
    expect((await repo.list("products")).length).toBe(22);
  });
  it("拒绝缺失站点配置和重复产品标识，导入失败后保留原数据", async () => {
    const repo = new IndexedDbRepository(crypto.randomUUID());
    await seed(repo);
    const backup = await repo.exportData();
    const missingSettings = structuredClone(backup);
    missingSettings.tables.settings = [];
    await expect(repo.importData(missingSettings)).rejects.toThrow();
    const duplicateSlug = structuredClone(backup);
    duplicateSlug.tables.products[1].slug =
      duplicateSlug.tables.products[0].slug;
    await expect(repo.importData(duplicateSlug)).rejects.toThrow();
    expect(await repo.get("settings", "site")).toBeDefined();
    expect((await repo.list("products")).length).toBe(22);
  });
});
describe("产品安全跳转", () => {
  it("只允许精确配置域名的 HTTP/HTTPS 地址", () => {
    expect(
      safeTarget("https://example.com/resume", ["example.com"]).pathname,
    ).toBe("/resume");
    expect(() => safeTarget("javascript:alert(1)", ["example.com"])).toThrow();
    expect(() =>
      safeTarget("https://example.com.evil.test", ["example.com"]),
    ).toThrow();
    expect(() =>
      safeTarget("https://user:pass@example.com", ["example.com"]),
    ).toThrow();
    expect(() => safeTarget("", ["example.com"])).toThrow();
  });
});
