import { describe, expect, it } from "vitest";
import { defaultSettings, emptyProduct } from "../src/domain/seed";
import {
  homeContent,
  homeModules,
  journeyGroups,
} from "../src/domain/home-config";
import { homeContentSchema } from "../src/domain/content";
import type { Placement } from "../src/domain/models";

describe("首页后台与前台共用配置", () => {
  it("补全介绍区并保留旧推荐位关闭状态，显式保存后不再被旧开关覆盖", () => {
    const placements = [{ id: "home-primary", enabled: false }] as Placement[];
    const modules = homeModules(defaultSettings, placements);
    expect(modules.map((m) => m.id)).toEqual([
      "stages",
      "featured",
      "intro",
      "campus",
      "contribution",
    ]);
    expect(modules.find((m) => m.id === "featured")?.enabled).toBe(false);
    const explicit = modules
      .map((m) => ({ ...m, enabled: true }))
      .reverse()
      .map((m, i) => ({ ...m, order: i + 1 }));
    expect(
      homeModules({ ...defaultSettings, homeModules: explicit }, placements),
    ).toEqual(explicit);
  });
  it("明确产品绑定优先于阶段匹配；占位、草稿和已删除产品不回退到其他产品", () => {
    const first = {
      ...emptyProduct(),
      id: "resume",
      stage: "prepare",
      status: "published" as const,
    };
    const second = {
      ...emptyProduct(),
      id: "interview",
      stage: "mock",
      status: "published" as const,
    };
    const content = homeContent(defaultSettings, [first, second], []);
    expect(journeyGroups([first, second], [], content)[0].products[0].id).toBe(
      "resume",
    );
    const card = content.cards[0];
    card.productIds = ["interview"];
    expect(homeContentSchema.parse(content).cards[0].productIds).toEqual([
      "interview",
    ]);
    expect(journeyGroups([first, second], [], content)[0].products[0].id).toBe(
      "interview",
    );
    card.productIds = [];
    expect(journeyGroups([first, second], [], content)[0].products).toEqual([]);
    card.productIds = ["missing"];
    expect(journeyGroups([first, second], [], content)[0].products).toEqual([]);
    card.productIds = ["interview"];
    expect(
      journeyGroups([first, { ...second, status: "draft" }], [], content)[0]
        .products,
    ).toEqual([]);
  });
  it("补全旧图文配置而不丢失用户的内容", () => {
    const content = homeContent(defaultSettings, [], []);
    const edited = {
      ...content,
      campusTitle: "我的校园",
      cards: [{ ...content.cards[0], title: "我的简历", productIds: [] }],
    };
    const result = homeContent(
      { ...defaultSettings, homeContent: edited },
      [],
      [],
    );
    expect(result.cards).toHaveLength(8);
    expect(result.campusTitle).toBe("我的校园");
    expect(result.cards[0]).toMatchObject({
      title: "我的简历",
      productIds: [],
    });
  });
});
