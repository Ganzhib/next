import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import { normalizeHomeModules } from "../src/domain/campus";
import { defaultSettings, seed } from "../src/domain/seed";
import { IndexedDbRepository } from "../src/storage/indexed-db";

it("读取旧首页配置时合并重复模块，保留显隐偏好与原始数据", () => {
  const original = [
    "stages",
    "featured",
    "categories",
    "collections",
    "toolbox",
    "contribution",
  ].map((id, index) => ({ id, label: id, enabled: false, order: index + 1 }));
  const normalized = normalizeHomeModules(original);
  expect(normalized.map((item) => item.id)).toEqual([
    "stages",
    "featured",
    "campus",
    "contribution",
  ]);
  expect(normalized.find((item) => item.id === "campus")?.enabled).toBe(false);
  expect(original).toHaveLength(6);
  expect(normalizeHomeModules(normalized)).toEqual(normalized);
});

it("旧数据库只初始化校园分类一次，不重置设置或恢复用户已删除的分类", async () => {
  const repo = new IndexedDbRepository(crypto.randomUUID());
  await repo.put("settings", { ...defaultSettings, brand: "我的学校" });
  await seed(repo);
  expect(await repo.list("taxonomies")).toHaveLength(3);
  expect((await repo.get("settings", "site"))?.brand).toBe("我的学校");
  await repo.remove("taxonomies", "campus-study");
  await seed(repo);
  expect(await repo.get("taxonomies", "campus-study")).toBeUndefined();
});

it("旧导航仅隐藏一次，保留自定义入口与设置，并允许后台重新启用", async () => {
  const repo = new IndexedDbRepository(crypto.randomUUID());
  await repo.put("settings", {
    ...defaultSettings,
    brand: "校园工具",
    navigation: [
      ...defaultSettings.navigation!.map((item) => ({
        ...item,
        enabled: true,
      })),
      {
        id: "custom",
        label: "校园资讯",
        path: "/about",
        enabled: true,
        order: 9,
      },
    ],
  });
  await seed(repo);
  const settings = (await repo.get("settings", "site"))!;
  expect(settings.brand).toBe("校园工具");
  expect(
    settings.navigation!.filter((item) => item.enabled).map((item) => item.id),
  ).toEqual(["custom"]);
  expect(settings.navigation).toHaveLength(6);
  await repo.put("settings", {
    ...settings,
    navigation: settings.navigation!.map((item) => ({
      ...item,
      enabled: true,
    })),
  });
  await seed(repo);
  expect(
    (await repo.get("settings", "site"))!.navigation!.every(
      (item) => item.enabled,
    ),
  ).toBe(true);
});
