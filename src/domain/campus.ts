import type { HomeModule, Taxonomy } from "./models";

export const campusDirections = [
  {
    id: "study",
    title: "课程与自学",
    description: "听懂一门课，理清一页笔记。",
    image: "/images/campus-study.png",
    alt: "黑白漫画：大学生在图书馆翻阅课本、整理笔记",
    category: "campus-study",
  },
  {
    id: "projects",
    title: "项目与竞赛",
    description: "和同学一起，把想法做成作品。",
    image: "/images/campus-projects.png",
    alt: "黑白漫画：两位同学在创客空间合作制作机器人项目",
    category: "campus-projects",
  },
  {
    id: "research",
    title: "科研与升学",
    description: "读懂一篇论文，找到想深入的问题。",
    image: "/images/campus-research.png",
    alt: "黑白漫画：研究生在书桌前阅读论文、整理研究思路",
    category: "campus-research",
  },
];

export const campusTaxonomies: Taxonomy[] = campusDirections.map(
  (direction, index) => ({
    id: direction.category,
    name: direction.title,
    description: direction.description,
    kind: "category",
    icon: ["book", "code", "file"][index],
    order: 8 + index,
  }),
);

/** 将旧版三个重复首页模块折叠为校园探索；不删除原始配置或产品数据。 */
export function normalizeHomeModules(modules: HomeModule[]): HomeModule[] {
  const legacy = new Set(["categories", "collections", "toolbox"]);
  const previous = modules.filter((module) => legacy.has(module.id));
  const next = modules.filter((module) => !legacy.has(module.id));
  if (!next.some((module) => module.id === "campus"))
    next.push({
      id: "campus",
      label: "校园学习与成长",
      enabled: previous.length
        ? previous.some((module) => module.enabled)
        : true,
      order: previous.length
        ? Math.min(...previous.map((module) => module.order))
        : 3,
    });
  return next.sort((a, b) => a.order - b.order);
}
