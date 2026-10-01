import type {
  Collection,
  Product,
  Taxonomy,
  Profile,
  SiteSettings,
} from "./models";
import type { Repository, Operation } from "../storage/repository";
import { campusTaxonomies } from "./campus";
export const now = () => new Date().toISOString();
export const uid = () => crypto.randomUUID();
const createdAt = "2026-10-01T00:00:00.000Z";
export function emptyProduct(): Product {
  return {
    id: uid(),
    name: "",
    slug: "",
    tagline: "",
    description: "",
    category: "resume",
    stage: "prepare",
    tags: [],
    roles: [],
    pricing: "free",
    openSource: false,
    chinese: true,
    requiresAccount: false,
    ownership: "external",
    status: "draft",
    release: "live",
    targetUrl: "",
    allowedDomains: [],
    featured: false,
    order: 100,
    accent: "#ed563c",
    icon: "box",
    features: [],
    pros: [],
    cons: [],
    audience: "计算机类求职者",
    githubUrl: "",
    logo: "",
    detailEnabled: true,
    tracking: "outbound_only",
    health: "unknown",
    verifiedAt: "",
    updatedAt: now(),
    createdAt: now(),
    demo: false,
    sponsored: false,
    seoTitle: "",
    seoDescription: "",
    scheduledAt: "",
  };
}
export const defaultProfile = (): Profile => ({
  id: "local",
  name: "求职探索者",
  role: "前端工程师",
  stage: "技术准备",
  favorites: [],
  collections: [],
  history: [],
  hidden: [],
  analytics: false,
  personalized: true,
  notifications: true,
});
export const defaultSettings: SiteSettings = {
  id: "site",
  brand: "下一程",
  tagline: "好工具，让下一程更从容。",
  announcement: "从准备到出发，找到你的下一步。",
  showAnnouncement: true,
  showDemos: false,
  theme: "light",
  adminPinHash: "",
  adminSalt: "",
  homeModules: [
    { id: "stages", label: "求职阶段入口", enabled: true, order: 1 },
    { id: "featured", label: "核心产品", enabled: true, order: 2 },
    { id: "campus", label: "校园学习与成长", enabled: true, order: 3 },
    { id: "contribution", label: "需求反馈邀请", enabled: true, order: 4 },
  ],
  navigation: [
    { id: "discover", label: "发现", path: "/", enabled: false, order: 0 },
    {
      id: "products",
      label: "产品库",
      path: "/products",
      enabled: false,
      order: 1,
    },
    {
      id: "collections",
      label: "精选合集",
      path: "/collections",
      enabled: false,
      order: 2,
    },
    {
      id: "stages",
      label: "求职路线",
      path: "/stages",
      enabled: false,
      order: 3,
    },
    {
      id: "rankings",
      label: "排行榜",
      path: "/rankings",
      enabled: false,
      order: 4,
    },
  ],
};
export const taxonomies: Taxonomy[] = [
  ...[
    ["resume", "简历与作品集", "file", "让经历清晰，让价值被看见"],
    ["interview", "模拟面试", "mic", "在真实面试前，多一次准备"],
    ["code", "算法与刷题", "code", "把思路变成可以运行的答案"],
    ["system", "系统设计", "network", "理解架构，表达取舍"],
    ["jobs", "岗位与内推", "briefcase", "找到与你匹配的机会"],
    ["tracking", "投递管理", "columns", "让每一次投递都有下文"],
    ["salary", "薪资与 Offer", "chart", "为下一程做一个明白的决定"],
    ["learn", "学习与成长", "book", "持续拓展自己的能力边界"],
  ].map(([id, name, icon, description], order) => ({
    id,
    name,
    icon,
    description,
    kind: "category" as const,
    order,
  })),
  ...[
    "确定方向",
    "简历准备",
    "技术准备",
    "模拟面试",
    "寻找岗位",
    "投递管理",
    "Offer 比较",
    "入职准备",
  ].map((name, order) => ({
    id: [
      "direction",
      "prepare",
      "practice",
      "mock",
      "search",
      "apply",
      "offer",
      "onboard",
    ][order],
    name,
    kind: "stage" as const,
    description: "",
    icon: "flag",
    order,
  })),
  ...[
    "前端工程师",
    "Java 后端",
    "Go 后端",
    "Python 后端",
    "算法工程师",
    "AI 工程师",
    "测试开发",
    "数据工程师",
    "DevOps / SRE",
    "应届生",
  ].map((name, order) => ({
    id: `role-${order}`,
    name,
    kind: "role" as const,
    description: "",
    icon: "code",
    order,
  })),
  ...[
    "中文友好",
    "ATS 友好",
    "模拟面试",
    "开源",
    "免费",
    "校招",
    "社招",
    "项目复盘",
    "算法",
    "系统设计",
  ].map((name, order) => ({
    id: `tag-${order}`,
    name,
    kind: "tag" as const,
    description: "",
    icon: "tag",
    order,
  })),
];
const make = (p: Partial<Product>): Product => ({
  ...emptyProduct(),
  createdAt,
  updatedAt: createdAt,
  ...p,
});
export const realProducts: Product[] = [
  make({
    id: "resume",
    name: "Magic Resume",
    slug: "magic-resume",
    tagline: "把你的经历，变成值得读的简历。",
    description:
      "从第一份简历到针对岗位的精细调整，让每一段经历都有清晰的表达。独立的简历制作与优化产品，帮助计算机求职者呈现项目、技术能力与真实成果。",
    category: "resume",
    stage: "prepare",
    tags: ["中文友好", "ATS 友好", "项目表达"],
    roles: ["前端工程师", "Java 后端", "应届生"],
    ownership: "first_party",
    status: "published",
    featured: true,
    order: 1,
    icon: "file",
    accent: "#ed563c",
    features: ["结构化简历编辑", "多种排版风格", "针对岗位优化", "PDF 导出"],
    pros: ["围绕技术项目组织经历", "专注清晰的内容与版式"],
    cons: ["实际功能与收费以独立产品页面为准", "产品访问地址待配置"],
    pricing: "freemium",
    tracking: "shared_analytics",
    audience: "应届生与正在准备跳槽的技术工作者",
  }),
  make({
    id: "interview",
    name: "Interview Lab",
    slug: "interview-lab",
    tagline: "让下一场面试，少一点未知。",
    description:
      "在真实面试前，练习你的表达、项目讲解与技术思路。通过 AI 辅助面试和复盘，找到值得继续准备的方向。",
    category: "interview",
    stage: "mock",
    tags: ["模拟面试", "项目追问", "复盘反馈"],
    roles: ["前端工程师", "Java 后端", "AI 工程师"],
    ownership: "first_party",
    status: "published",
    release: "beta",
    featured: true,
    order: 2,
    icon: "mic",
    accent: "#7052c8",
    features: ["岗位定向练习", "项目经历追问", "结构化复盘", "表达练习"],
    pros: ["帮助梳理回答结构", "练习可以按自己的节奏进行"],
    cons: ["AI 反馈不能代替真实招聘判断", "产品访问地址待配置"],
    pricing: "freemium",
    tracking: "shared_analytics",
    audience: "希望在正式面试前练习和复盘的求职者",
  }),
];
export const demoProducts: Product[] = Array.from({ length: 20 }, (_, i) => {
  const names = [
    "项目叙事",
    "算法练习室",
    "系统设计手册",
    "内推地图",
    "投递日志",
    "Offer 天平",
    "工程师路线",
    "英文面试角",
    "简历体检",
    "SQL 训练场",
    "架构问答",
    "岗位雷达",
    "面试日历",
    "薪资笔记",
    "开源成长册",
    "代码白板",
    "作品集工坊",
    "数据实验室",
    "技术表达课",
    "校招信息站",
  ];
  const cats = [
    "resume",
    "code",
    "system",
    "jobs",
    "tracking",
    "salary",
    "learn",
    "interview",
  ];
  return make({
    id: `demo-${i}`,
    name: names[i],
    slug: `demo-tool-${i + 1}`,
    tagline: [
      "让准备更有方向，让每一步都有积累。",
      "用结构化的方法，解决求职中的具体问题。",
      "为技术工作者设计的一份轻量工具。",
    ][i % 3],
    description:
      "这是用于验证搜索、筛选、合集与后台操作的演示产品，不代表已经上线的真实服务。",
    category: cats[i % 8],
    stage: ["prepare", "practice", "mock", "search", "apply", "offer"][i % 6],
    tags: [["免费", "开源", "中文友好"][i % 3], "演示数据"],
    roles: ["前端工程师", "应届生"],
    pricing: i % 3 === 0 ? "free" : "freemium",
    openSource: i % 3 === 0,
    chinese: i % 4 !== 0,
    ownership: i % 3 === 0 ? "partner" : "external",
    status: "published",
    order: i + 10,
    accent: ["#ed563c", "#54736b", "#bd8a38", "#7052c8"][i % 4],
    icon: taxonomies[i % 8].icon,
    demo: true,
    features: ["可搜索的内容", "按阶段整理", "清晰的使用指南"],
    pros: ["用于规模验证"],
    cons: ["没有真实访问地址"],
  });
});
export const collections: Collection[] = [
  {
    id: "start",
    slug: "first-offer",
    title: "第一份 Offer，从这里开始",
    description: "为第一次认真准备求职的你，整理好从简历到面试的两个关键步骤。",
    eyebrow: "应届生 · 起步指南",
    color: "peach",
    productIds: ["resume", "interview"],
    steps: [
      "先梳理经历，让简历准确呈现你的能力。",
      "再练习讲述，在模拟面试中找到需要补充的地方。",
    ],
    status: "published",
    order: 1,
  },
  {
    id: "switch",
    slug: "engineer-next",
    title: "工程师的下一站",
    description: "把工作经验变成有说服力的项目故事，再为技术追问做准备。",
    eyebrow: "社会招聘 · 进阶准备",
    color: "green",
    productIds: ["resume", "interview"],
    steps: ["围绕目标岗位调整项目重点。", "练习技术决策、取舍与结果的表达。"],
    status: "published",
    order: 2,
  },
  {
    id: "frontend",
    slug: "frontend-kit",
    title: "前端面试准备清单",
    description: "把准备过程拆成更容易完成的小步骤。",
    eyebrow: "前端工程师",
    color: "lavender",
    productIds: ["resume", "interview", "demo-1"],
    steps: ["整理项目", "练习面试", "补足算法"],
    status: "draft",
    order: 3,
  },
  {
    id: "open",
    slug: "open-source-kit",
    title: "开源求职工具箱",
    description: "探索可以自己掌控的求职工具。",
    eyebrow: "开发测试合集",
    color: "blue",
    productIds: ["demo-0", "demo-3", "demo-6"],
    steps: [],
    status: "draft",
    order: 4,
  },
  {
    id: "sprint",
    slug: "interview-sprint",
    title: "面试前的最后一周",
    description: "把时间留给最重要的准备。",
    eyebrow: "冲刺准备",
    color: "peach",
    productIds: ["interview", "demo-7"],
    steps: [],
    status: "draft",
    order: 5,
  },
];
export async function seed(repo: Repository) {
  const navigationMigration = {
    id: "migration-quiet-navigation-v1",
    kind: "migration",
    title: "精简前台导航",
    description: "隐藏旧版默认入口，保留配置、页面和数据，后台可重新启用",
    enabled: false,
    value: "1",
    createdAt: now(),
  };
  const campusMigration = {
    id: "migration-campus-categories-v1",
    kind: "migration",
    title: "校园方向分类初始化",
    description: "只补充分类，不修改现有产品和配置",
    enabled: false,
    value: "1",
    createdAt: now(),
  };
  const settings = await repo.get("settings", "site");
  if (settings) {
    const upgrades: Operation[] = [];
    if (!(await repo.get("records", navigationMigration.id))) {
      upgrades.push(
        {
          store: "settings",
          value: {
            ...settings,
            navigation: (
              settings.navigation ?? defaultSettings.navigation!
            ).map((item) =>
              defaultSettings.navigation!.some(
                (preset) => preset.id === item.id && preset.path === item.path,
              )
                ? { ...item, enabled: false }
                : item,
            ),
          },
        },
        { store: "records", value: navigationMigration },
      );
    }
    if (!(await repo.get("records", campusMigration.id))) {
      // 兼容已有浏览器：只补充新分类，不重置产品、收藏或管理员配置。
      const categories = await repo.list("taxonomies");
      const missing = campusTaxonomies.filter(
        (category) => !categories.some((item) => item.id === category.id),
      );
      upgrades.push(
        ...missing.map((value) => ({ store: "taxonomies" as const, value })),
        { store: "records", value: campusMigration },
      );
    }
    if (upgrades.length) await repo.batch(upgrades);
    return;
  }
  const ops: Operation[] = [
    ...[...realProducts, ...demoProducts].map((value) => ({
      store: "products" as const,
      value,
    })),
    ...[...taxonomies, ...campusTaxonomies].map((value) => ({
      store: "taxonomies" as const,
      value,
    })),
    ...collections.map((value) => ({ store: "collections" as const, value })),
    { store: "settings", value: defaultSettings },
    { store: "records", value: campusMigration },
    { store: "records", value: navigationMigration },
    { store: "profiles", value: defaultProfile() },
    ...[
      {
        id: "home-primary",
        name: "首页 / 重点产品",
        title: "为下一步，做好准备。",
        productIds: ["resume", "interview"],
        enabled: true,
        order: 1,
      },
      {
        id: "home-picks",
        name: "首页 / 编辑精选",
        title: "值得放进你的工具箱",
        productIds: ["resume", "interview"],
        enabled: true,
        order: 2,
      },
    ].map((value) => ({ store: "placements" as const, value })),
  ];
  await repo.batch(ops);
}
