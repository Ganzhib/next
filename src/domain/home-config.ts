import type { HomeContent } from "./content";
import type { SiteSettings, Placement, Product, HomeModule } from "./models";
import { defaultSettings } from "./seed";
import { normalizeHomeModules, campusDirections } from "./campus";
import { careerJourney } from "./journey";

export const homeSections = [
  { id: "stages", label: "求职方向导航", hint: "顶部五个求职方向的快捷入口" },
  {
    id: "featured",
    label: "求职方向合集",
    hint: "漫画是方向入口，点击后进入该方向的产品合集",
  },
  { id: "intro", label: "校园介绍与搜索", hint: "主标题、介绍短句与工具搜索" },
  { id: "campus", label: "校园探索", hint: "课程自学、项目竞赛、科研升学" },
  { id: "contribution", label: "反馈邀请", hint: "页面底部的反馈引导" },
] as const;

/** 前台渲染与后台编排使用同一个顺序；兼容旧的隐式介绍区和推荐位开关。 */
export function homeModules(
  settings: SiteSettings,
  placements: Placement[] = [],
): HomeModule[] {
  const old = normalizeHomeModules(
    settings.homeModules ?? defaultSettings.homeModules!,
  );
  const explicit = old.some((m) => m.id === "intro");
  const modules = homeSections.map((section, index) => {
    const found = old.find((m) => m.id === section.id);
    const order =
      section.id === "intro"
        ? (old.find((m) => m.id === "featured")?.order ?? 2) + 0.5
        : index + 1;
    return {
      ...(found ?? { enabled: true, order }),
      id: section.id,
      label: section.label,
      enabled:
        section.id === "featured" &&
        !explicit &&
        placements.find((p) => p.id === "home-primary")?.enabled === false
          ? false
          : (found?.enabled ?? true),
    };
  });
  return modules.sort((a, b) => a.order - b.order);
}

export function journeyGroups(
  products: Product[],
  placements: Placement[],
  content?: HomeContent,
) {
  const primary = placements.find((p) => p.id === "home-primary" && p.enabled);
  const ranked = products
    .filter(
      (p) => !p.demo && p.status === "published" && p.release !== "planned",
    )
    .sort((a, b) => {
      const rank = (id: string) => {
        const n = primary?.productIds.indexOf(id) ?? -1;
        return n < 0 ? Number.MAX_SAFE_INTEGER : n;
      };
      return rank(a.id) - rank(b.id) || a.order - b.order;
    });
  return careerJourney.map((stage) => {
    const binding = content?.cards.find(
      (c) => c.id === `career-${stage.id}`,
    )?.productIds;
    const items =
      binding === undefined
        ? ranked.filter((p) => stage.stages.includes(p.stage))
        : [...new Set(binding)].flatMap((id) =>
            ranked.filter((p) => p.id === id),
          );
    return { ...stage, products: items };
  });
}

/** 首页数量、合集内容、后台预览都从此处计算，避免出现三套收录规则。 */
export function directionGroups(
  products: Product[],
  placements: Placement[],
  content?: HomeContent,
) {
  const career = journeyGroups(products, placements, content).map((stage) => ({
    id: `career-${stage.id}`,
    title: stage.name,
    description: stage.description,
    alt: stage.illustrationAlt,
    kind: "求职方向",
    products: stage.products,
  }));
  const campus = campusDirections.map((direction) => {
    const ids = content?.cards.find(
      (c) => c.id === `campus-${direction.id}`,
    )?.productIds;
    const published = products.filter(
      (p) => !p.demo && p.status === "published" && p.release !== "planned",
    );
    return {
      id: `campus-${direction.id}`,
      title: direction.title,
      description: direction.description,
      alt: direction.alt,
      kind: "校园方向",
      products:
        ids === undefined
          ? published
              .filter((p) => p.category === direction.category)
              .sort((a, b) => a.order - b.order)
          : [...new Set(ids)].flatMap((id) =>
              published.filter((p) => p.id === id),
            ),
    };
  });
  return [...career, ...campus].map((direction) => {
    const custom = content?.cards.find((c) => c.id === direction.id);
    // 旧首页曾把单个产品的一句话介绍存成卡片说明；改为方向介绍，不覆盖其他自定义文案。
    const description =
      custom?.description &&
      !products.some((p) => p.tagline === custom.description)
        ? custom.description
        : direction.description;
    return {
      ...direction,
      title: custom?.title ?? direction.title,
      description,
      alt: custom?.alt ?? direction.alt,
      image: custom?.image ?? "",
    };
  });
}

export function homeContent(
  settings: SiteSettings,
  products: Product[],
  placements: Placement[],
): HomeContent {
  const groups = journeyGroups(products, placements, settings.homeContent);
  const defaults: HomeContent = {
    introKicker: "不止求职 / LIFE ON CAMPUS",
    introTitle: "学好一门课，\n做出一个好项目。",
    introDescription: "从日常学习到毕业选择，找到适合你的工具。",
    journeyTitle: "选一个方向，找到趁手的工具。",
    campusTitle: "在学校，也有自己的下一程。",
    contributionTitle: "还有什么学习难题，想让工具帮帮忙？",
    cards: [
      ...groups.map((s) => ({
        id: `career-${s.id}`,
        title: s.name,
        description: s.description,
        image: "",
        alt: s.illustrationAlt,
      })),
      ...campusDirections.map((s) => ({
        id: `campus-${s.id}`,
        title: s.title,
        description: s.description,
        image: "",
        alt: s.alt,
      })),
    ],
  };
  const directions = directionGroups(
    products,
    placements,
    settings.homeContent,
  );
  return {
    ...defaults,
    ...settings.homeContent,
    cards: defaults.cards.map((card) => ({
      ...card,
      ...settings.homeContent?.cards.find((c) => c.id === card.id),
      description: directions.find((d) => d.id === card.id)!.description,
    })),
  };
}
